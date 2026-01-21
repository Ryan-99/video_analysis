import { VideoMetrics } from './metrics';
import { calculateP90, calculateMedian, calculateMAD, calculateThreshold } from './p90-mad';

export interface VideoWithMonth extends VideoMetrics {
  month: string;
}

/**
 * 为每个视频添加月份标识
 * @param videos 视频指标数组
 * @returns 带月份的视频数组
 */
export function groupByMonth(videos: VideoMetrics[]): VideoWithMonth[] {
  return videos.map(v => ({ ...v, month: formatMonth(v.publishTime) }));
}

/**
 * 格式化日期为年月字符串
 * @param date 日期
 * @returns YYYY-MM格式的字符串
 */
function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 按月计算统计数据
 * @param videos 带月份的视频数组
 * @returns 月份到统计数据的映射
 */
export function calculateMonthlyStats(videos: VideoWithMonth[]): Map<string, any> {
  const grouped = new Map<string, VideoMetrics[]>();

  // 按月份分组
  for (const video of videos) {
    if (!grouped.has(video.month)) {
      grouped.set(video.month, []);
    }
    grouped.get(video.month)!.push(video);
  }

  // 计算每月统计
  const result = new Map();
  for (const [month, monthVideos] of grouped) {
    const engagements = monthVideos.map(v => v.totalEngagement);
    result.set(month, {
      month,
      avgEngagement: engagements.reduce((a, b) => a + b, 0) / engagements.length,
      videoCount: monthVideos.length,
      p90: calculateP90(engagements),
      median: calculateMedian(engagements),
      threshold: calculateThreshold(engagements),
    });
  }
  return result;
}

/**
 * 获取按月份排序的数据
 * @param data 月份统计数据映射
 * @returns 排序后的统计数据数组
 */
export function getSortedMonthlyData(data: Map<string, any>): any[] {
  return Array.from(data.values()).sort((a, b) => a.month.localeCompare(b.month));
}
