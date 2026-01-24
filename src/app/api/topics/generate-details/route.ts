import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { aiAnalysisService } from '@/lib/ai-analysis/service';
import { analysisLogger } from '@/lib/logger';
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

    // 更新任务状态
    const progress = 75 + Math.floor((batchIndex / totalBatches) * 20);
    await taskQueue.update(taskId, {
      currentStep: `正在生成选题详情（第 ${batchIndex + 1}/${totalBatches} 批）...`,
      progress,
    });

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

    // 合并到完整结果中
    let allTopics: FullTopic[] = [];
    if (batchIndex > 0 && task.resultData) {
      const parsed = JSON.parse(task.resultData);
      allTopics = parsed.topics || [];
    }

    allTopics = [...allTopics, ...batchTopics];

    // 更新结果数据
    await taskQueue.update(taskId, {
      resultData: JSON.stringify({
        ...resultData,
        topics: allTopics,
      }),
      topicDetailIndex: batchIndex + 1,
    });

    // 记录完成日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: `生成选题详情（批次 ${batchIndex + 1}/${totalBatches}）`,
      status: 'success',
      output: {
        本批数量: batchTopics.length,
        累计数量: allTopics.length,
      },
    } as AnalysisLog);

    console.log(`[Topics] 批次 ${batchIndex + 1}/${totalBatches} 完成, 累计: ${allTopics.length}`);

    // 检查是否完成所有批次
    if (batchIndex + 1 >= totalBatches) {
      // 标记选题生成完成
      await taskQueue.update(taskId, {
        topicStep: 'complete',
        currentStep: '选题详情生成完成',
      });

      return NextResponse.json({
        success: true,
        data: {
          completed: true,
          totalTopics: allTopics.length,
          message: '选题详情生成完成',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        completed: false,
        currentBatch: batchIndex + 1,
        totalBatches,
        totalTopics: allTopics.length,
        message: `批次 ${batchIndex + 1}/${totalBatches} 完成，累计 ${allTopics.length} 条`,
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
