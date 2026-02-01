// src/lib/charts/service.ts
// 图表生成服务 - 使用 QuickChart API

export interface ChartConfig {
  type: 'line' | 'bar';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      borderWidth?: number;
      pointRadius?: number | number[];
      pointHoverRadius?: number | number[];
      pointBackgroundColor?: string | string[];
      pointBorderColor?: string | string[];
      pointBorderWidth?: number;
    }>;
  };
  options?: {
    responsive?: boolean;
    plugins?: {
      title?: {
        display: boolean;
        text: string;
      };
      legend?: {
        display: boolean;
      };
    };
    scales?: {
      x?: {
        display: boolean;
        title?: {
          display: boolean;
          text: string;
        };
        ticks?: {
          maxRotation?: number;
          minRotation?: number;
        };
      };
      y?: {
        display: boolean;
        beginAtZero?: boolean;
        title?: {
          display: boolean;
          text: string;
        };
      };
    };
  };
}

/**
 * 生成月度趋势折线图配置
 */
export function generateMonthlyTrendConfig(monthlyData: Array<{
  month: string;
  avgEngagement: number;
}>): ChartConfig {
  return {
    type: 'line',
    data: {
      labels: monthlyData.map(m => m.month),
      datasets: [{
        label: '平均互动量',
        data: monthlyData.map(m => Math.round(m.avgEngagement)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '月度平均互动趋势',
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '月份',
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: '互动量',
          },
        },
      },
    },
  };
}

/**
 * 生成爆款分类柱状图配置
 */
export function generateViralCategoriesConfig(categories: Array<{
  category: string;
  count: number;
}>): ChartConfig {
  return {
    type: 'bar',
    data: {
      labels: categories.map(c => c.category),
      datasets: [{
        label: '爆款数量',
        data: categories.map(c => c.count),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '爆款分类统计',
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          display: true,
        },
        y: {
          display: true,
          beginAtZero: true,
        },
      },
    },
  };
}

/**
 * 生成全周期每日爆点折线图配置
 */
export function generateDailyViralsConfig(viralVideos: Array<{
  publishTime: Date;
  totalEngagement: number;
  title: string;
}>): ChartConfig {
  // 按日期聚合数据
  const dailyData = new Map<string, number>();
  for (const video of viralVideos) {
    const date = video.publishTime.toISOString().split('T')[0];
    dailyData.set(date, (dailyData.get(date) || 0) + 1);
  }

  const sortedDates = Array.from(dailyData.keys()).sort();
  const counts = sortedDates.map(date => dailyData.get(date) || 0);

  return {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: '每日爆款数量',
        data: counts,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '全周期每日爆点趋势',
        },
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '日期',
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: '爆款数量',
          },
        },
      },
    },
  };
}

/**
 * 生成全周期每日Top1爆点折线图配置（标注版）
 * @param dailyTop1Data 已处理的每日Top1数据数组 {date, engagement, title}
 *
 * 注意：使用QuickChart原生支持的标注方式，不依赖annotation插件
 */
export function generateDailyTop1Config(dailyTop1Data: Array<{
  date: string;
  engagement: number;
  title: string;
}>): ChartConfig {
  // 按日期排序
  const sortedEntries = dailyTop1Data.sort((a, b) => a.date.localeCompare(b.date));
  const dates = sortedEntries.map(e => e.date);
  const engagements = sortedEntries.map(e => Math.round(e.engagement));

  // 找出每个月的Top1爆点（用于标注）
  const monthlyTop1Indices = new Set<number>();
  const monthlyTop1 = new Map<string, { engagement: number; title: string; date: string; index: number }>();
  for (let i = 0; i < sortedEntries.length; i++) {
    const data = sortedEntries[i];
    const month = data.date.substring(0, 7); // YYYY-MM
    const existing = monthlyTop1.get(month);
    if (!existing || data.engagement > existing.engagement) {
      // 移除旧的索引
      if (existing) {
        monthlyTop1Indices.delete(existing.index);
      }
      monthlyTop1.set(month, { ...data, index: i });
      monthlyTop1Indices.add(i);
    }
  }

  // ===== 创建 annotation 配置（标注每月Top1爆点）=====
  const annotations: Record<string, any> = {};
  monthlyTop1.forEach((top1, month) => {
    const idx = top1.index;
    // 标题过长时截断
    const shortTitle = top1.title.length > 15
      ? top1.title.substring(0, 15) + '...'
      : top1.title;

    // 红点标注
    annotations[`point_${month}`] = {
      type: 'point',
      xValue: dates[idx],
      yValue: engagements[idx],
      backgroundColor: 'rgba(239, 68, 68, 0.8)',
      borderColor: 'rgba(239, 68, 68, 1)',
      borderWidth: 2,
      radius: 6,
    };

    // 标题标签
    annotations[`label_${month}`] = {
      type: 'label',
      xValue: dates[idx],
      yValue: engagements[idx],
      content: [shortTitle],
      font: { size: 11 },
      color: '#fff',
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
      borderRadius: 4,
      padding: { top: 4, bottom: 4, left: 6, right: 6 },
      yAdjust: -15,
    };
  });
  // ===== annotation 配置结束 =====

  return {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: '每日Top1互动量',
        data: engagements,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: 'rgba(239, 68, 68, 0.5)',
        pointBorderColor: 'rgb(239, 68, 68)',
        pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '全周期每日Top1爆点趋势（标注版）',
        },
        legend: {
          display: false,
        },
        // ===== 恢复 annotation 插件配置 =====
        annotation: {
          annotations: annotations,
        },
        // ===== annotation 配置结束 =====
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '日期',
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: '互动量',
          },
        },
      },
    },
  };
}

/**
 * 使用 QuickChart API 生成图表图片 URL
 * 注意：GET 请求有 URL 长度限制（约 2000 字符），大型配置应使用 POST 方法
 */
export function generateChartImageUrl(config: ChartConfig, width = 800, height = 400): string {
  const baseUrl = 'https://quickchart.io/chart';
  const params = new URLSearchParams({
    c: JSON.stringify(config),
    w: width.toString(),
    h: height.toString(),
    format: 'png',
  });
  const url = `${baseUrl}?${params.toString()}`;
  console.log('[Chart Service] 生成的图表 URL 长度:', url.length);
  if (url.length > 2000) {
    console.warn('[Chart Service] ⚠️ URL 长度超过 2000 字符，可能导致请求失败，建议使用 POST 方法');
  }
  return url;
}

/**
 * 下载图表图片并转换为 Buffer（使用 GET 方法）
 * 适用于小型配置（URL < 2000 字符）
 */
export async function downloadChartImage(url: string): Promise<Buffer> {
  console.log('[Chart Service] 使用 GET 方法下载图表，URL 长度:', url.length);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`图表下载失败: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 使用 POST 方法下载图表图片
 * 适用于大型配置（annotations 等复杂配置）
 */
export async function downloadChartImagePost(config: ChartConfig, width = 800, height = 400): Promise<Buffer> {
  console.log('[Chart Service] 使用 POST 方法下载图表');
  console.log('[Chart Service] 配置大小:', JSON.stringify(config).length, '字符');

  const response = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chart: config,  // QuickChart 期望 "chart" 而不是 "config"
      width,
      height,
      format: 'png',
      backgroundColor: 'transparent',
      devicePixelRatio: 2,  // 提高DPI以获得更清晰的图片
    }),
  });

  // QuickChart 有时即使返回图片也会设置非 200 状态码
  // 我们直接检查响应类型是否为图片
  const contentType = response.headers.get('content-type');
  console.log('[Chart Service] 响应 Content-Type:', contentType);

  if (contentType && contentType.includes('image')) {
    const arrayBuffer = await response.arrayBuffer();
    console.log('[Chart Service] POST 下载成功，大小:', arrayBuffer.byteLength, '字节');
    return Buffer.from(arrayBuffer);
  }

  // 如果不是图片类型，则检查状态码
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Chart Service] POST 请求失败，响应:', errorText);
    throw new Error(`图表下载失败 (POST): ${response.statusText} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log('[Chart Service] POST 下载成功，大小:', arrayBuffer.byteLength, '字节');
  return Buffer.from(arrayBuffer);
}
