import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/memory';
import { generateWordReport, generateExcelReport } from '@/lib/report';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'word';
    const task = taskQueue.get(params.id);
    if (!task || task.status !== 'completed') {
      return NextResponse.json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' } }, { status: 404 });
    }
    const resultData = task.resultData ? JSON.parse(task.resultData) : null;
    if (!resultData) return NextResponse.json({ success: false, error: { code: 'NO_DATA', message: '报告数据为空' } }, { status: 400 });

    let buffer: Buffer, filename: string, contentType: string;
    if (format === 'excel') {
      buffer = await generateExcelReport(resultData);
      filename = `分析报告-${params.id}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = await generateWordReport(resultData);
      filename = `分析报告-${params.id}.docx`;
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    return new NextResponse(buffer, { headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"` } });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ success: false, error: { code: 'DOWNLOAD_FAILED', message: '下载失败' } }, { status: 500 });
  }
}
