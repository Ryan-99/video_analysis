import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { executeAnalysis, completeAnalysis } from '@/lib/analyzer/pipeline';

// 配置为 Node.js 运行时，最大 300 秒（Hobby 计划限制）
export const runtime = 'nodejs';
export const maxDuration = 300;

// 标记当前正在处理的任务，防止重复处理
let isProcessing = false;

/**
 * POST /api/jobs/process
 * 处理队列中的待处理任务
 * 可以被 Cron Job 定期调用
 */
export async function POST(request: NextRequest) {
  console.log('[Jobs] POST /api/jobs/process - 处理状态:', isProcessing);

  try {
    // 防止并发处理
    if (isProcessing) {
      console.log('[Jobs] 已有任务在处理中');
      return NextResponse.json({
        success: true,
        message: '已有任务在处理中',
        processing: true,
      });
    }

    isProcessing = true;

    // 获取所有待处理任务
    const allTasks = await taskQueue.getAll();

    // 优先处理正在生成选题的任务
    const topicTasks = allTasks.filter(t => t.status === 'topic_generating');
    const queuedTasks = allTasks.filter(t => t.status === 'queued');

    let task: typeof allTasks[0] | null = null;

    if (topicTasks.length > 0) {
      // 优先选题生成任务
      task = topicTasks[0];
      console.log('[Jobs] 继续选题生成任务:', task.id);
    } else if (queuedTasks.length > 0) {
      // 新任务
      task = queuedTasks[0];
      console.log('[Jobs] 开始新任务:', task.id, '| 文件:', task.fileName);
    } else {
      isProcessing = false;
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processing: false,
      });
    }

    if (!task) {
      isProcessing = false;
      return NextResponse.json({
        success: true,
        message: '没有有效任务',
        processing: false,
      });
    }

    try {
      if (task.status === 'queued') {
        // 新任务：执行完整分析流程（到选题生成阶段）
        await executeAnalysis(task.id);
      } else if (task.status === 'topic_generating') {
        // 选题生成任务：继续处理
        await handleTopicGeneration(task.id);
      }
      console.log('[Jobs] 任务步骤完成:', task.id);
    } catch (error) {
      console.error('[Jobs] 任务失败:', task.id, '| 错误:', error instanceof Error ? error.message : error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      await taskQueue.update(task.id, {
        status: 'failed',
        error: errorMessage,
      });
    } finally {
      isProcessing = false;
    }

    return NextResponse.json({
      success: true,
      message: '任务处理完成',
      taskId: task.id,
      processing: false,
    });
  } catch (error) {
    console.error('[Jobs] 错误:', error);
    isProcessing = false;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROCESS_JOB_FAILED',
          message: '处理任务失败',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 处理选题生成的分步执行
 */
async function handleTopicGeneration(taskId: string): Promise<void> {
  const task = await taskQueue.get(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  // 根据当前步骤决定下一步操作
  if (task.topicStep === 'outline' || task.topicStep === null) {
    // 生成选题大纲
    console.log('[Jobs] 调用选题大纲生成 API');
    const response = await fetch(`${baseUrl}/api/topics/generate-outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '大纲生成失败');
    }

    const data = await response.json();
    console.log('[Jobs] 大纲生成完成:', data.data);
  } else if (task.topicStep === 'details') {
    // 生成选题详情（可能需要多次调用）
    const batchSize = task.topicBatchSize || 10;
    const topicOutlineData = task.topicOutlineData || '[]';
    const outlines = JSON.parse(topicOutlineData);
    const totalBatches = Math.ceil(outlines.length / batchSize);
    const currentIndex = task.topicDetailIndex || 0;

    console.log(`[Jobs] 选题详情批次 ${currentIndex + 1}/${totalBatches}`);

    // 调用详情生成 API
    const response = await fetch(`${baseUrl}/api/topics/generate-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || '详情生成失败');
    }

    const data = await response.json();
    console.log('[Jobs] 详情批次完成:', data.data);

    // 如果所有批次完成，执行完成流程
    if (data.data?.completed) {
      console.log('[Jobs] 所有选题详情生成完成，执行完成流程');
      await completeAnalysis(taskId);
    } else {
      // 还有更多批次，保持 topic_generating 状态以便下次继续
      console.log('[Jobs] 等待下一批次处理');
    }
  } else if (task.topicStep === 'complete') {
    // 选题已完成，执行完成流程
    console.log('[Jobs] 选题已完成，执行完成流程');
    await completeAnalysis(taskId);
  }
}

/**
 * GET /api/jobs/process
 * 查询处理状态
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    processing: isProcessing,
  });
}
