import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { generateWordReport, generateExcelReport } from '@/lib/report';
import { generateMonthlyTrendConfig, generateDailyTop1Config, downloadChartImage, generateChartImageUrl } from '@/lib/charts/service';
import { ChartBuffers } from '@/lib/report/word';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('[Download API] 请求下载，ID:', id);

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'word';
    console.log('[Download API] 格式:', format);

    const task = await taskQueue.get(id);
    if (!task || task.status !== 'completed') {
      console.log('[Download API] 任务不存在或未完成:', task?.status);
      return NextResponse.json({ success: false, error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' } }, { status: 404 });
    }

    console.log('[Download API] 任务状态正常，开始解析数据');
    const resultData = task.resultData ? JSON.parse(task.resultData) : null;
    if (!resultData) {
      console.log('[Download API] 报告数据为空');
      return NextResponse.json({ success: false, error: { code: 'NO_DATA', message: '报告数据为空' } }, { status: 400 });
    }

    // 获取账号名称，用于生成文件名
    const accountName = task.accountName || resultData.account?.name || '账号';
    console.log('[Download API] 账号名称:', accountName);

    console.log('[Download API] 数据解析成功，开始生成文件');

    let buffer: Buffer, filename: string, contentType: string;
    if (format === 'excel') {
      console.log('[Download API] 生成 Excel 文件');
      buffer = await generateExcelReport(resultData);
      filename = `分析报告_${accountName}（博主名称）.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      console.log('[Download API] 生成 Word 文件，开始生成图表...');

      // 生成图表图片
      const chartBuffers: ChartBuffers = {};

      try {
        // 月度趋势图表
        if (resultData.monthlyTrend?.data) {
          console.log('[Download API] 生成月度趋势图表...');
          const monthlyConfig = generateMonthlyTrendConfig(resultData.monthlyTrend.data);
          const monthlyChartUrl = generateChartImageUrl(monthlyConfig, 800, 400);
          console.log('[Download API] 月度图表URL:', monthlyChartUrl);
          chartBuffers.monthlyTrend = await downloadChartImage(monthlyChartUrl);
          console.log('[Download API] 月度图表下载成功，大小:', chartBuffers.monthlyTrend.length);
        }
      } catch (error) {
        console.warn('[Download API] 月度图表生成失败:', error);
      }

      try {
        // 每日Top1爆点图表
        if (resultData.dailyTop1 && resultData.dailyTop1.length > 0) {
          console.log('[Download API] 生成每日Top1爆点图表...');
          const dailyTop1Config = generateDailyTop1Config(resultData.dailyTop1);
          const dailyTop1ChartUrl = generateChartImageUrl(dailyTop1Config, 1000, 400);
          console.log('[Download API] 每日Top1图表URL:', dailyTop1ChartUrl);
          chartBuffers.dailyVirals = await downloadChartImage(dailyTop1ChartUrl);
          console.log('[Download API] 每日Top1图表下载成功，大小:', chartBuffers.dailyVirals.length);
        }
      } catch (error) {
        console.warn('[Download API] 每日Top1图表生成失败:', error);
      }

      console.log('[Download API] 图表生成完成，开始生成 Word 文档...');
      buffer = await generateWordReport(resultData, chartBuffers);
      filename = `分析报告_${accountName}（博主名称）.docx`;
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    console.log('[Download API] 文件生成成功，大小:', buffer.length);

    // 处理中文文件名编码 - 使用 RFC 5987 格式
    // 注意：filename 参数必须是 ASCII，filename* 支持 UTF-8
    const asciiFilename = `analysis-report-${id}.${format === 'word' ? 'docx' : 'xlsx'}`;
    const encodedFilename = encodeURIComponent(filename);
    const contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition
      }
    });
  } catch (error) {
    console.error('[Download API] 错误:', error);
    console.error('[Download API] 错误堆栈:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ success: false, error: { code: 'DOWNLOAD_FAILED', message: '下载失败', details: error instanceof Error ? error.message : String(error) } }, { status: 500 });
  }
}
