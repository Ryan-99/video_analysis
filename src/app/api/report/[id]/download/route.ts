import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { generateWordReport, generateExcelReport } from '@/lib/report';
import { generateMonthlyTrendConfig, generateDailyTop1Config, downloadChartImage, downloadChartImagePost, generateChartImageUrl } from '@/lib/charts/service';
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
    console.log('[Download API] resultData 结构:', {
      hasAccount: !!resultData.account,
      hasMonthlyTrend: !!resultData.monthlyTrend,
      hasMonthlyTrendData: !!resultData.monthlyTrend?.data,
      monthlyTrendDataLength: resultData.monthlyTrend?.data?.length || 0,
      monthlyTrendDataKeys: resultData.monthlyTrend?.data?.[0] ? Object.keys(resultData.monthlyTrend.data[0]) : [],
      hasVirals: !!resultData.virals,
      hasByCategory: !!resultData.virals?.byCategory,
      byCategoryLength: resultData.virals?.byCategory?.length || 0,
      byCategoryKeys: resultData.virals?.byCategory?.[0] ? Object.keys(resultData.virals.byCategory[0]) : [],
      hasDailyTop1: !!resultData.dailyTop1,
      dailyTop1Length: resultData.dailyTop1?.length || 0,
    });

    // 构造完整的 Report 对象（与报告路由保持一致）
    const report = {
      reportId: id,
      taskId: id,
      realAccountName: task.accountName || null,
      ...resultData,
    };
    console.log('[Download API] 构造的 report 对象:', {
      hasReportId: !!report.reportId,
      hasTaskId: !!report.taskId,
      hasRealAccountName: report.realAccountName !== undefined,
      monthlyTrendDataLength: report.monthlyTrend?.data?.length || 0,
      byCategoryLength: report.virals?.byCategory?.length || 0,
    });

    let buffer: Buffer, filename: string, contentType: string;
    if (format === 'excel') {
      console.log('[Download API] 生成 Excel 文件');
      buffer = await generateExcelReport(report);
      filename = `分析报告_${accountName}（博主名称）.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      console.log('[Download API] 生成 Word 文件，开始生成图表...');

      // 生成图表图片
      const chartBuffers: ChartBuffers = {};

      try {
        // 月度趋势图表
        if (report.monthlyTrend?.data) {
          console.log('[Download API] 生成月度趋势图表...');
          const monthlyConfig = generateMonthlyTrendConfig(report.monthlyTrend.data);
          const monthlyChartUrl = generateChartImageUrl(monthlyConfig, 800, 400);
          console.log('[Download API] 月度图表URL:', monthlyChartUrl);
          chartBuffers.monthlyTrend = await downloadChartImage(monthlyChartUrl);
          console.log('[Download API] 月度图表下载成功，大小:', chartBuffers.monthlyTrend.length);
        }
      } catch (error) {
        console.warn('[Download API] 月度图表生成失败:', error);
      }

      try {
        // 每日Top1爆点图表（使用 POST 方法，因为包含 annotations 配置可能导致 URL 过长）
        if (report.dailyTop1 && report.dailyTop1.length > 0) {
          console.log('[Download API] 生成每日Top1爆点图表（带标注）...');
          const dailyTop1Config = generateDailyTop1Config(report.dailyTop1);
          console.log('[Download API] 每日Top1配置预览:', JSON.stringify(dailyTop1Config).substring(0, 300));

          // 使用 POST 方法避免 URL 长度限制
          chartBuffers.dailyVirals = await downloadChartImagePost(dailyTop1Config, 1000, 400);
          console.log('[Download API] 每日Top1图表下载成功，大小:', chartBuffers.dailyVirals.length);
        }
      } catch (error) {
        console.error('[Download API] 每日Top1图表生成失败:', error);
        console.error('[Download API] 错误详情:', error instanceof Error ? error.stack : String(error));
        // 即使失败也不影响其他部分，继续生成报告
      }

      console.log('[Download API] 图表生成完成，开始生成 Word 文档...');
      buffer = await generateWordReport(report, chartBuffers);
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
