import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/memory';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = taskQueue.get(id);
    if (!task || task.status !== 'completed') {
      return NextResponse.json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' } }, { status: 404 });
    }
    const resultData = task.resultData ? JSON.parse(task.resultData) : null;
    // 添加真实账号名称（从文件名提取）
    return NextResponse.json({
      success: true,
      data: {
        reportId: task.id,
        taskId: task.id,
        realAccountName: task.accountName || null, // 添加真实账号名称
        ...resultData
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: 'GET_REPORT_FAILED', message: '获取报告失败' } }, { status: 500 });
  }
}
