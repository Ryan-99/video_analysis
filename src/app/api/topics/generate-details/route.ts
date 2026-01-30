import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { prisma } from '@/lib/db';
import { aiAnalysisService } from '@/lib/ai-analysis/service';
import { analysisLogger } from '@/lib/logger';
import { calculateTopicDetailsProgress, FULL_FLOW_PROGRESS } from '@/lib/queue/progress-config';
import type { AnalysisLog } from '@/types';
import type { TopicOutline, FullTopic } from '@/lib/ai-analysis/service';

// 配置为 Node.js 运行时，最大 300 秒（Hobby 计划限制）
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/topics/generate-details
 * 生成选题详情（分批处理）
 *
 * 每次调用处理一批（10条），可多次调用直到完成
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { taskId } = body;

  if (!taskId) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_TASK_ID', message: '缺少任务ID' } },
      { status: 400 }
    );
  }

  console.log('[Topics] 开始生成详情, taskId:', taskId);

  try {
    const task = await taskQueue.get(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: 'TASK_NOT_FOUND', message: '任务不存在' } },
        { status: 404 }
      );
    }

    // 检查任务是否正在处理
    if (task.processing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'TASK_PROCESSING', message: '任务正在处理中，请稍后再试' }
        },
        { status: 409 }
      );
    }

    // 检查是否处于选题生成状态
    if (task.status !== 'topic_generating') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TASK_STATUS', message: `任务状态不正确: ${task.status}` }
        },
        { status: 400 }
      );
    }

    // 检查是否已生成大纲
    if (task.topicStep !== 'details' || !task.topicOutlineData) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_OUTLINE', message: '选题大纲不存在' } },
        { status: 400 }
      );
    }

    // 解析大纲数据
    let outlines: TopicOutline[];
    try {
      outlines = JSON.parse(task.topicOutlineData);
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_OUTLINE', message: '大纲数据格式错误' } },
        { status: 400 }
      );
    }

    // 获取批次信息
    const batchSize = task.topicBatchSize || 10;
    const batchIndex = task.topicDetailIndex || 0;
    const totalBatches = Math.ceil(outlines.length / batchSize);

    if (batchIndex >= totalBatches) {
      // 所有批次已完成
      return NextResponse.json({
        success: true,
        data: {
          completed: true,
          totalTopics: outlines.length,
          message: '所有批次已完成',
        },
      });
    }

    console.log(`[Topics] 处理批次 ${batchIndex + 1}/${totalBatches}`);

    // 解析结果数据获取账号和爆款分析
    let resultData: any;
    try {
      resultData = JSON.parse(task.resultData || '{}');
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'NO_RESULT_DATA', message: '没有找到分析结果数据' } },
        { status: 400 }
      );
    }

    const accountAnalysis = resultData.account;
    const viralPatterns = resultData.virals?.patterns;

    // 记录开始日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: `生成选题详情（批次 ${batchIndex + 1}/${totalBatches}）`,
      status: 'start',
    } as AnalysisLog);

    // 获取当前批次的大纲
    const startIdx = batchIndex * batchSize;
    const endIdx = Math.min(startIdx + batchSize, outlines.length);
    const batchOutlines = outlines.slice(startIdx, endIdx);

    // 生成这批选题的详情
    const batchTopics = await aiAnalysisService.generateTopicDetails(
      batchOutlines,
      accountAnalysis,
      viralPatterns,
      task.aiConfig || undefined,
      batchSize
    );

    // 使用事务安全地更新 resultData（避免并发覆盖）
    const newIndex = batchIndex + 1;
    const isCompleted = newIndex >= totalBatches;

    await prisma.$transaction(async (tx) => {
      // 在事务中获取最新的 resultData
      const currentTask = await tx.analysisTask.findUnique({
        where: { id: taskId },
      });

      if (!currentTask) {
        throw new Error('任务不存在');
      }

      // 解析当前 resultData（在事务中获取的最新值）
      const currentResultData = JSON.parse(currentTask.resultData || '{}');
      const allTopics = currentResultData.topics || [];

      // 合并新批次数据
      const mergedTopics = [...allTopics, ...batchTopics];
      const progress = calculateTopicDetailsProgress(batchIndex, totalBatches);

      // 准备更新数据
      const updatedResultData = {
        ...currentResultData,
        topics: mergedTopics,
      };

      // 计算状态
      const newStatus = isCompleted ? 'generating_charts' : 'topic_generating';
      const newCurrentStep = isCompleted
        ? '选题详情生成完成，准备生成报告...'
        : `正在生成选题详情（第 ${newIndex}/${totalBatches} 批）...`;

      // 原子性更新所有字段
      await tx.analysisTask.update({
        where: { id: taskId },
        data: {
          resultData: JSON.stringify(updatedResultData),
          topicDetailIndex: newIndex,
          topicStep: isCompleted ? 'complete' : 'details',
          status: newStatus,
          currentStep: newCurrentStep,
          progress: isCompleted ? FULL_FLOW_PROGRESS.topic_details_complete : progress,
        },
      });
    });

    // 记录完成日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: `生成选题详情（批次 ${newIndex}/${totalBatches}）`,
      status: 'success',
      output: {
        本批数量: batchTopics.length,
        累计数量: (JSON.parse((await taskQueue.get(taskId))!.resultData!)).topics.length,
      },
    } as AnalysisLog);

    console.log(`[Topics] 批次 ${newIndex}/${totalBatches} 完成`);

    // 检查是否完成所有批次
    if (isCompleted) {
      return NextResponse.json({
        success: true,
        data: {
          completed: true,
          totalTopics: (JSON.parse((await taskQueue.get(taskId))!.resultData!)).topics.length,
          message: '选题详情生成完成',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        completed: false,
        currentBatch: newIndex,
        totalBatches,
        totalTopics: (JSON.parse((await taskQueue.get(taskId))!.resultData!)).topics.length,
        message: `批次 ${newIndex}/${totalBatches} 完成`,
      },
    });

  } catch (error) {
    console.error('[Topics] 详情生成失败:', error);

    // 记录错误日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'error',
      phase: 'ai' as any,
      step: '生成选题详情',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    } as AnalysisLog);

    // 不标记任务失败，允许重试

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DETAILS_GENERATION_FAILED',
          message: error instanceof Error ? error.message : '未知错误',
        },
      },
      { status: 500 }
    );
  }
}
