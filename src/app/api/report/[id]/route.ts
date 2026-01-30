import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = await taskQueue.get(id);

    // 放宽验证条件：允许选题完成但报告生成中的状态访问报告
    const isValidStatus = task?.status === 'completed' ||
                         (task?.status === 'generating_charts' && task?.topicStep === 'complete');

    if (!task || !isValidStatus) {
      return NextResponse.json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' } }, { status: 404 });
    }

    // 状态恢复机制：如果任务卡在 generating_charts 且选题已完成，自动恢复为 completed
    if (task.status === 'generating_charts' && task.topicStep === 'complete') {
      console.log(`[Report] 检测到任务卡在中间状态，自动恢复: ${id}`);
      try {
        await taskQueue.update(id, { status: 'completed', progress: 100 });
      } catch (updateError) {
        console.error('[Report] 状态恢复失败:', updateError);
      }
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
