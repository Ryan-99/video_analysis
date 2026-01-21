// src/lib/parser/validator.ts
// 列检测和验证工具
import { ColumnMapping } from '@/types';

/**
 * 列检测结果
 */
export interface ColumnDetection {
  title: string | null;
  likes: string | null;
  comments: string | null;
  saves: string | null;
  shares: string | null;
  publishTime: string | null;
}

/**
 * 列名关键词映射
 * 用于自动检测数据表中的列
 */
const KEYWORDS = {
  title: ['标题', '题目', '视频标题', 'title', '视频名称', '作品标题'],
  likes: ['点赞', '点赞数', 'likes', '赞', '点赞量'],
  comments: ['评论', '评论数', 'comments', '评', '评论量'],
  saves: ['收藏', '收藏数', 'saves', '收', '收藏量'],
  shares: ['转发', '转发数', 'shares', '发', '转发量'],
  publishTime: ['发布时间', '时间', '发布', 'publish', 'date', '日期', '发布日期'],
};

/**
 * 自动检测数据表中的列
 * @param headers - 数据表的表头数组
 * @returns 检测到的列映射
 */
export function detectColumns(headers: string[]): ColumnDetection {
  const result: ColumnDetection = {
    title: null,
    likes: null,
    comments: null,
    saves: null,
    shares: null,
    publishTime: null,
  };

  // 遍历每个需要检测的字段
  for (const [key, keywords] of Object.entries(KEYWORDS)) {
    // 尝试匹配每个关键词
    for (const keyword of keywords) {
      const found = headers.find(h =>
        h.toLowerCase().includes(keyword.toLowerCase())
      );
      if (found) {
        result[key as keyof ColumnDetection] = found;
        break;
      }
    }
  }

  return result;
}

/**
 * 验证列映射是否完整
 * @param mapping - 用户确认的列映射
 * @returns 验证结果，包含是否有效和缺失的字段
 */
export function validateColumnMapping(mapping: ColumnMapping): {
  valid: boolean;
  missing: string[];
} {
  const required: (keyof ColumnMapping)[] = [
    'title',
    'likes',
    'comments',
    'saves',
    'shares',
    'publishTime',
  ];

  const missing = required.filter(key => !mapping[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
