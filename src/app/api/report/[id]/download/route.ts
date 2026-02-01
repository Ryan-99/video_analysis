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

      // ===== 兼容处理：为旧报告补充 dailyTop1 数据 =====
      if (!report.dailyTop1 || report.dailyTop1.length === 0) {
        console.log('[Download API] ⚠️ 检测到旧报告缺少 dailyTop1 数据，尝试从 monthlyList 重新生成');

        if (report.virals?.monthlyList && report.virals.monthlyList.length > 0) {
          // 从 monthlyList 生成 dailyTop1 数据
          const dailyTop1Map = new Map<string, { engagement: number; title: string; date: string }>();

          for (const monthData of report.virals.monthlyList) {
            for (const video of monthData.videos) {
              const date = video.publishTime?.split('T')?.[0] || video.date || '';
              if (!date) continue;

              const engagement = video.totalEngagement || (video.likes || 0) + (video.comments || 0) + (video.saves || 0) + (video.shares || 0);
              const existing = dailyTop1Map.get(date);

              if (!existing || engagement > existing.engagement) {
                dailyTop1Map.set(date, {
                  engagement,
                  title: video.title,
                  date,
                });
              }
            }
          }

          const dailyTop1Data = Array.from(dailyTop1Map.values()).sort((a, b) => a.date.localeCompare(b.date));
          (report as any).dailyTop1 = dailyTop1Data;

          console.log('[Download API] ✅ 从 monthlyList 重新生成 dailyTop1 数据，数量:', dailyTop1Data.length);
        } else {
          console.warn('[Download API] ⚠️ 无法从 monthlyList 重新生成，数据也不存在');
        }
      }
      // ===== 兼容处理结束 =====

      try {
        // 每日Top1爆点图表（使用 POST 方法，因为包含 annotations 配置可能导致 URL 过长）
        if (report.dailyTop1 && report.dailyTop1.length > 0) {
          console.log('[Download API] 生成每日Top1爆点图表，数据量:', report.dailyTop1.length);
          const dailyTop1Config = generateDailyTop1Config(report.dailyTop1);
          console.log('[Download API] 配置预览:', JSON.stringify(dailyTop1Config).substring(0, 300));

          // 使用 POST 方法避免 URL 长度限制
          chartBuffers.dailyVirals = await downloadChartImagePost(dailyTop1Config, 1000, 400);
          console.log('[Download API] 每日Top1图表下载成功，大小:', chartBuffers.dailyVirals.length);
        } else {
          console.warn('[Download API] ⚠️ dailyTop1 数据为空或不存在，跳过图表生成');
          console.log('[Download API] report.dailyTop1:', report.dailyTop1);
        }
      } catch (error) {
        console.error('[Download API] ❌ 每日Top1图表生成失败:', error);
        console.error('[Download API] 错误详情:', error instanceof Error ? error.stack : String(error));
        // 不静默失败，让用户知道有问题
        throw new Error(`每日Top1图表生成失败: ${error instanceof Error ? error.message : String(error)}`);
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

/**
 * POST /api/report/[id]/download
 * 接收前端传递的图表图片并生成文档
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('[Download API] POST 请求下载，ID:', id);

    // 解析请求体
    const body = await request.json();
    const format = body.format || 'word';
    const chartImage = body.chartImage; // base64 字符串

    console.log('[Download API] 格式:', format);
    console.log('[Download API] 是否有图表图片:', !!chartImage);

    // 获取任务
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

    // 构造完整的 Report 对象
    const report = {
      reportId: id,
      taskId: id,
      realAccountName: task.accountName || null,
      ...resultData,
    };

    let buffer: Buffer, filename: string, contentType: string;
    const chartBuffers: ChartBuffers = {};

    if (format === 'word') {
      console.log('[Download API] 生成 Word 文件');

      // 使用前端传递的图表图片
      if (chartImage) {
        // 移除 base64 前缀 ("data:image/png;base64,")
        const base64Data = chartImage.replace(/^data:image\/png;base64,/, '');
        chartBuffers.dailyVirals = Buffer.from(base64Data, 'base64');
        console.log('[Download API] ✅ 使用前端传递的图表图片，大小:', chartBuffers.dailyVirals.length);
      } else {
        console.warn('[Download API] ⚠️ 没有收到前端传递的图表图片');
      }

      // 月度趋势图表仍由后端生成（或也改为前端传递）
      if (report.monthlyTrend?.data) {
        console.log('[Download API] 生成月度趋势图表...');
        const monthlyConfig = generateMonthlyTrendConfig(report.monthlyTrend.data);
        const monthlyChartUrl = generateChartImageUrl(monthlyConfig, 800, 400);
        chartBuffers.monthlyTrend = await downloadChartImage(monthlyChartUrl);
        console.log('[Download API] 月度图表下载成功，大小:', chartBuffers.monthlyTrend.length);
      }

      console.log('[Download API] 图表生成完成，开始生成 Word 文档...');
      buffer = await generateWordReport(report, chartBuffers);
      filename = `分析报告_${accountName}（博主名称）.docx`;
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      // Excel 下载（不使用图表图片）
      console.log('[Download API] 生成 Excel 文件');
      buffer = await generateExcelReport(report);
      filename = `分析报告_${accountName}（博主名称）.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    console.log('[Download API] 文件生成成功，大小:', buffer.length);

    // 处理中文文件名编码
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
    console.error('[Download API] POST 错误:', error);
    console.error('[Download API] POST 错误堆栈:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ success: false, error: { code: 'DOWNLOAD_FAILED', message: '下载失败', details: error instanceof Error ? error.message : String(error) } }, { status: 500 });
  }
}
