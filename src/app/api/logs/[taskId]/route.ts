// src/app/api/logs/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analysisLogger } from '@/lib/logger';

/**
 * GET /api/logs/[taskId]
 * 获取指定任务的日志
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // 获取所有日志
    const logs = analysisLogger.get(taskId) || [];

    // 获取摘要
    const summary = analysisLogger.getSummary(taskId);

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        logs,
        summary,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取日志失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/logs/[taskId]
 * 清除指定任务的日志
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // 清除日志
    analysisLogger.clear(taskId);

    return NextResponse.json({
      success: true,
      message: '日志已清除',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '清除日志失败',
      },
      { status: 500 }
    );
  }
}
