import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/memory';
import { executeAnalysis } from '@/lib/analyzer/pipeline';

export const runtime = 'nodejs';

/**
 * POST /api/analyze
 * 创建新的分析任务
 */
export async function POST(request: NextRequest) {
  try {
    const { fileId, columnMapping } = await request.json();

    // 验证必要参数
    if (!fileId || !columnMapping) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '缺少必要参数',
          },
        },
        { status: 400 }
      );
    }

    // 创建任务
    const task = taskQueue.create(
      fileId,
      'data.xlsx', // TODO: 从文件系统获取真实文件名
      0, // TODO: 从文件系统获取真实文件大小
      JSON.stringify(columnMapping)
    );

    // 异步执行分析
    executeAnalysis(task.id).catch((error) => {
      console.error('分析执行失败:', error);
      taskQueue.update(task.id, {
        status: 'failed',
        error: error.message,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        estimatedTime: 180, // 预计耗时3分钟
      },
    });
  } catch (error) {
    console.error('创建任务错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TASK_CREATE_FAILED',
          message: '任务创建失败',
        },
      },
      { status: 500 }
    );
  }
}
