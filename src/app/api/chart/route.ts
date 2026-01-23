import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyTrendConfig, generateDailyViralsConfig, generateViralCategoriesConfig, generateChartImageUrl, downloadChartImage } from '@/lib/charts/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let config;
    switch (type) {
      case 'monthly':
        config = generateMonthlyTrendConfig(data.monthlyData);
        break;
      case 'daily':
        config = generateDailyViralsConfig(data.viralVideos);
        break;
      case 'categories':
        config = generateViralCategoriesConfig(data.categories);
        break;
      default:
        return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 });
    }

    // 生成图表 URL
    const chartUrl = generateChartImageUrl(config, 800, 400);

    // 下载图片
    const imageBuffer = await downloadChartImage(chartUrl);

    return NextResponse.json({
      success: true,
      data: {
        type,
        chartUrl,
        imageBase64: `data:image/png;base64:${imageBuffer.toString('base64')}`,
      }
    });
  } catch (error) {
    console.error('[Chart API] 错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
