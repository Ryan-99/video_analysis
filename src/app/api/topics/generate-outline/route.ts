import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { aiAnalysisService } from '@/lib/ai-analysis/service';
import { analysisLogger } from '@/lib/logger';
import type { AnalysisLog } from '@/types';

// 配置为 Node.js 运行时，最大 300 秒（Hobby 计划限制）
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/topics/generate-outline
 * 生成选题大纲（第一步）
 *
 * 从任务中读取分析数据，生成30条选题大纲
 * 大纲数据保存到 topicOutlineData 字段
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

  console.log('[Topics] 开始生成大纲, taskId:', taskId);

  try {
    const task = await taskQueue.get(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: 'TASK_NOT_FOUND', message: '任务不存在' } },
        { status: 404 }
      );
    }

    // 检查任务状态
    if (task.status !== 'analyzing' && task.status !== 'topic_generating') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TASK_STATUS', message: `任务状态不正确: ${task.status}` }
        },
        { status: 400 }
      );
    }

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
    const viralAnalysis = resultData.virals;

    if (!accountAnalysis || !viralAnalysis) {
      return NextResponse.json(
        { success: false, error: { code: 'INCOMPLETE_DATA', message: '分析数据不完整' } },
        { status: 400 }
      );
    }

    // 记录开始日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: '生成选题大纲',
      status: 'start',
    } as AnalysisLog);

    // 更新任务状态
    await taskQueue.update(taskId, {
      status: 'topic_generating',
      currentStep: '正在生成选题大纲...',
      progress: 70,
      topicStep: 'outline',
    });

    // 生成选题大纲
    const outlines = await aiAnalysisService.generateTopicOutline(
      accountAnalysis,
      viralAnalysis,
      task.aiConfig || undefined
    );

    if (outlines.length === 0) {
      throw new Error('选题大纲生成失败：没有返回任何数据');
    }

    // 保存大纲数据到数据库
    await taskQueue.update(taskId, {
      topicOutlineData: JSON.stringify(outlines),
      topicStep: 'details',
      topicDetailIndex: 0,
      currentStep: `选题大纲完成（${outlines.length}条），准备生成详情...`,
    });

    // 记录完成日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: '生成选题大纲',
      status: 'success',
      output: {
        选题数量: outlines.length,
        选题列表: outlines.map(t => `${t.id}.${t.category}`).join('、'),
      },
    } as AnalysisLog);

    console.log('[Topics] 大纲生成完成, 数量:', outlines.length);

    return NextResponse.json({
      success: true,
      data: {
        outlineCount: outlines.length,
        nextStep: 'details',
        message: `选题大纲生成完成（${outlines.length}条），准备生成详情`,
      },
    });

  } catch (error) {
    console.error('[Topics] 大纲生成失败:', error);

    // 记录错误日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'error',
      phase: 'ai' as any,
      step: '生成选题大纲',
      status: 'error',
      error: error instanceof Error ? error.message : '未知错误',
    } as AnalysisLog);

    // 更新任务状态
    await taskQueue.update(taskId, {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'OUTLINE_GENERATION_FAILED',
          message: error instanceof Error ? error.message : '未知错误',
        },
      },
      { status: 500 }
    );
  }
}
