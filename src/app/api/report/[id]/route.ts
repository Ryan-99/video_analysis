import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = await taskQueue.get(id);
    if (!task || task.status !== 'completed') {
      return NextResponse.json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' } }, { status: 404 });
    }
    const resultData = task.resultData ? JSON.parse(task.resultData) : null;
    return NextResponse.json({
      success: true,
      data: {
        reportId: task.id,
        taskId: task.id,
        realAccountName: task.accountName || null,
        ...resultData
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: 'GET_REPORT_FAILED', message: '获取报告失败' } }, { status: 500 });
  }
}
