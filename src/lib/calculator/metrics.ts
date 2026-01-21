import { VideoData } from '@/types';

export interface VideoMetrics extends VideoData {
  totalEngagement: number;
  saveRate: number;
  saveToLikeRatio: number;
}

/**
 * 计算单个视频的指标
 * @param video 视频数据
 * @returns 包含扩展指标的视频数据
 */
export function calculateMetrics(video: VideoData): VideoMetrics {
  // 计算总互动量 = 点赞 + 评论 + 收藏 + 分享
  const totalEngagement = video.likes + video.comments + video.saves + video.shares;

  // 计算收藏率 = 收藏数 / 总互动量 * 100
  const saveRate = totalEngagement > 0 ? (video.saves / totalEngagement) * 100 : 0;

  // 计算收藏点赞比 = 收藏数 / 点赞数 * 100
  const saveToLikeRatio = video.likes > 0 ? (video.saves / video.likes) * 100 : 0;

  return { ...video, totalEngagement, saveRate, saveToLikeRatio };
}

/**
 * 批量计算视频指标
 * @param videos 视频数据数组
 * @returns 包含扩展指标的视频数据数组
 */
export function calculateAllMetrics(videos: VideoData[]): VideoMetrics[] {
  return videos.map(calculateMetrics);
}
