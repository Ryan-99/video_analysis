import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { executeAnalysis } from '@/lib/analyzer/pipeline';

// 配置为 Node.js 运行时，支持长时间运行
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
  console.log('[Jobs API] ========== POST /api/jobs/process 被调用 ==========');
  console.log('[Jobs API] 请求 URL:', request.url);
  console.log('[Jobs API] 请求方法:', request.method);
  console.log('[Jobs API] 当前处理状态:', isProcessing);

  try {
    // 防止并发处理
    if (isProcessing) {
      console.log('[Jobs API] 已有任务在处理中，跳过');
      return NextResponse.json({
        success: true,
        message: '已有任务在处理中',
        processing: true,
      });
    }

    // 获取状态为 queued 的任务
    console.log('[Jobs API] 正在获取所有任务...');
    const allTasks = await taskQueue.getAll();
    console.log('[Jobs API] 总任务数:', allTasks.length);
    console.log('[Jobs API] 所有任务状态:', allTasks.map(t => `${t.id}:${t.status}`));

    const queuedTasks = allTasks.filter(t => t.status === 'queued');
    console.log('[Jobs API] queued 状态任务数:', queuedTasks.length);

    if (queuedTasks.length === 0) {
      console.log('[Jobs API] 没有待处理的任务');
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processing: false,
      });
    }

    // 取最早的任务
    const task = queuedTasks[0];
    console.log('[Jobs API] ========== 找到待处理任务 ==========');
    console.log('[Jobs API] 任务 ID:', task.id);
    console.log('[Jobs API] 任务文件:', task.fileName);
    console.log('[Jobs API] fileUrl:', task.fileUrl);
    console.log('[Jobs API] fileUrl 类型:', typeof task.fileUrl);
    console.log('[Jobs API] fileUrl 是否为 null:', task.fileUrl === null);

    isProcessing = true;

    console.log('[Jobs API] 即将调用 executeAnalysis, taskId:', task.id);

    // 异步执行分析（不阻塞响应）
    executeAnalysis(task.id)
      .then(() => {
        console.log('[Jobs API] ========== 任务处理完成 ==========');
      })
      .catch(async (error) => {
        console.error('[Jobs API] ========== 任务处理失败 ==========');
        console.error('[Jobs API] 错误:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        await taskQueue.update(task.id, {
          status: 'failed',
          error: errorMessage,
        });
      })
      .finally(() => {
        console.log('[Jobs API] executeAnalysis 执行完成，重置 isProcessing');
        isProcessing = false;
      });

    return NextResponse.json({
      success: true,
      message: '开始处理任务',
      taskId: task.id,
      processing: true,
    });
  } catch (error) {
    console.error('[Jobs API] 错误:', error);
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
