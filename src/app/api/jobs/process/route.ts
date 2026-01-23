import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { executeAnalysis } from '@/lib/analyzer/pipeline';

// 配置为 Node.js 运行时，支持长时间运行
export const runtime = 'nodejs';
export const maxDuration = 900; // 15分钟，支持选题生成

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

    // 获取状态为 queued 的任务
    const allTasks = await taskQueue.getAll();
    const queuedTasks = allTasks.filter(t => t.status === 'queued');

    if (queuedTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processing: false,
      });
    }

    const task = queuedTasks[0];
    console.log('[Jobs] 开始处理任务:', task.id, '| 文件:', task.fileName);

    try {
      await executeAnalysis(task.id);
      console.log('[Jobs] 任务完成:', task.id);
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
 * GET /api/jobs/process
 * 查询处理状态
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    processing: isProcessing,
  });
}
