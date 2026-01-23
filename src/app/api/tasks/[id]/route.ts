import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/kv';

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

    // 调试日志
    console.log(`[Tasks API] 查询任务 ${id}, 结果:`, task ? '找到' : '未找到');
    if (!task) {
      const allTasks = await taskQueue.getAll();
      console.log(`[Tasks API] 当前队列中有 ${allTasks.length} 个任务:`, allTasks.map(t => t.id));
    }

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

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('查询任务错误:', error);
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
