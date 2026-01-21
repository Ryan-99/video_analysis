import { VideoMetrics } from './metrics';

/**
 * 计算中位数
 * @param values 数值数组
 * @returns 中位数
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 计算P90值（第90百分位数）
 * @param values 数值数组
 * @returns P90值
 */
export function calculateP90(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.floor(sorted.length * 0.9))];
}

/**
 * 计算MAD（Median Absolute Deviation，中位数绝对偏差）
 * @param values 数值数组
 * @returns MAD值
 */
export function calculateMAD(values: number[]): number {
  if (values.length === 0) return 0;
  const median = calculateMedian(values);
  const absoluteDeviations = values.map(v => Math.abs(v - median));
  return calculateMedian(absoluteDeviations);
}

/**
 * 计算爆款阈值
 * 使用P90和中位数+3倍MAD的最大值作为阈值
 * @param values 数值数组
 * @returns 阈值
 */
export function calculateThreshold(values: number[]): number {
  const p90 = calculateP90(values);
  const median = calculateMedian(values);
  const mad = calculateMAD(values);
  return Math.max(p90, median + 3 * mad);
}

/**
 * 过滤出爆款视频
 * @param videos 视频指标数组
 * @param threshold 爆款阈值
 * @returns 爆款视频数组
 */
export function filterVirals(videos: VideoMetrics[], threshold: number): VideoMetrics[] {
  return videos.filter(v => v.totalEngagement >= threshold);
}
