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
      pointRadius?: number;
      pointHoverRadius?: number;
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
  const monthlyTop1 = new Map<string, { engagement: number; title: string; date: string }>();
  for (const data of sortedEntries) {
    const month = data.date.substring(0, 7); // YYYY-MM
    const existing = monthlyTop1.get(month);
    if (!existing || data.engagement > existing.engagement) {
      monthlyTop1.set(month, data);
    }
  }

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
        pointHoverRadius: 5,
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
 */
export function generateChartImageUrl(config: ChartConfig, width = 800, height = 400): string {
  const baseUrl = 'https://quickchart.io/chart';
  const params = new URLSearchParams({
    c: JSON.stringify(config),
    w: width.toString(),
    h: height.toString(),
    format: 'png',
  });
  return `${baseUrl}?${params.toString()}`;
}

/**
 * 下载图表图片并转换为 Buffer
 */
export async function downloadChartImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`图表下载失败: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
