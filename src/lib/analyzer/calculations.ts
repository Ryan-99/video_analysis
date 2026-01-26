import { VideoData } from '@/types';

export interface CalculatedMetrics {
  dateRange: {
    start: string;
    end: string;
    totalMonths: number;
  };
  totalVideos: number;
  publishFrequency: {
    perWeek: number;
    totalDays: number;
    hasGap: boolean;
    gapPeriods: Array<{ start: Date; end: Date; days: number }>;
  };
  bestPublishTime: Array<{
    hour: number;
    count: number;
    percentage: number;
  }>;
}

/**
 * 从视频数据计算统计指标
 */
export function calculateMetrics(videos: VideoData[]): CalculatedMetrics {
  if (videos.length === 0) {
    return {
      dateRange: { start: '', end: '', totalMonths: 0 },
      totalVideos: 0,
      publishFrequency: { perWeek: 0, totalDays: 0, hasGap: false, gapPeriods: [] },
      bestPublishTime: [],
    };
  }

  // 1. 数据时间范围
  const dates = videos.map(v => new Date(v.publishTime)).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // 2. 总视频数量
  const totalVideos = videos.length;

  // 3. 发布频率和断更期
  const publishFrequency = calculatePublishFrequency(videos, startDate, endDate);

  // 4. 最佳发布时间（按小时统计）
  const bestPublishTime = calculateBestPublishTime(videos);

  return {
    dateRange: {
      start: formatDate(startDate),
      end: formatDate(endDate),
      totalMonths: calculateMonthsDiff(startDate, endDate),
    },
    totalVideos,
    publishFrequency,
    bestPublishTime,
  };
}

/**
 * 计算发布频率和断更期
 */
function calculatePublishFrequency(
  videos: VideoData[],
  startDate: Date,
  endDate: Date
): CalculatedMetrics['publishFrequency'] {
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const weeks = totalDays / 7;
  const perWeek = Math.round((videos.length / weeks) * 10) / 10; // 保留1位小数

  // 检测断更期（连续≥14天无发布）
  const gapPeriods: Array<{ start: Date; end: Date; days: number }> = [];

  if (videos.length > 1) {
    const sortedDates = videos
      .map(v => new Date(v.publishTime))
      .sort((a, b) => a.getTime() - b.getTime());

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      const daysDiff = Math.ceil((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 14) {
        gapPeriods.push({
          start: new Date(prevDate.getTime() + 24 * 60 * 60 * 1000), // 前一天之后
          end: new Date(currDate.getTime() - 24 * 60 * 60 * 1000), // 当前天之前
          days: daysDiff,
        });
      }
    }
  }

  return {
    perWeek,
    totalDays,
    hasGap: gapPeriods.length > 0,
    gapPeriods,
  };
}

/**
 * 计算最佳发布时间（按小时统计）
 */
function calculateBestPublishTime(videos: VideoData[]): CalculatedMetrics['bestPublishTime'] {
  const hourCounts = new Map<number, number>();

  videos.forEach(v => {
    const date = new Date(v.publishTime);
    const hour = date.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  // 转换为数组并按发布次数降序排序
  return Array.from(hourCounts.entries())
    .map(([hour, count]) => ({
      hour,
      count,
      percentage: (count / videos.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 格式化日期为 "YYYY年M月" 格式
 */
function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

/**
 * 计算两个日期之间的月份差
 */
function calculateMonthsDiff(start: Date, end: Date): number {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return Math.max(1, yearDiff * 12 + monthDiff + 1);
}
