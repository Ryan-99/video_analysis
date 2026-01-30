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

    console.log('[Tasks API] 返回任务数据:', {
      id: task.id,
      status: task.status,
      progress: task.progress,
      progressType: typeof task.progress,
      currentStep: task.currentStep,
      analysisStep: task.analysisStep,
      processing: task.processing,
    });

    // 确保进度值被正确序列化（处理 null/undefined 情况）
    const responseData = {
      ...task,
      progress: task.progress ?? 0,  // 确保 null/undefined 被转换为 0
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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
