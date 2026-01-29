import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';

/**
 * GET /api/tasks/[id]
 * 查询任务状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await taskQueue.get(id);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: '任务不存在',
          },
        },
        { status: 404 }
      );
    }

    // console.log('[Tasks API] 返回任务数据:', {
    //   id: task.id,
    //   status: task.status,
    //   progress: task.progress,
    //   currentStep: task.currentStep,
    // });

    return NextResponse.json({
      success: true,
      data: task,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Tasks API] 查询任务错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GET_TASK_FAILED',
          message: '查询任务失败',
        },
      },
      { status: 500 }
    );
  }
}
