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
  title: [
    '标题', '题目', '视频标题', 'title', '视频名称', '作品标题',
    '内容', '视频内容', '文案', '标题文案', '作品名称', 'topic'
  ],
  likes: [
    '点赞', '点赞数', 'likes', '赞', '点赞量', '点赞数量',
    'like', '点赞总数', '获赞', '总点赞'
  ],
  comments: [
    '评论', '评论数', 'comments', '评', '评论量', '评论数量',
    'comment', '总评论', '评论总数'
  ],
  saves: [
    '收藏', '收藏数', 'saves', '收', '收藏量', '收藏数量',
    'save', '总收藏', '收藏总数', '喜欢'
  ],
  shares: [
    '转发', '转发数', 'shares', '发', '转发量', '转发数量',
    'share', '总转发', '转发总数', '分享'
  ],
  publishTime: [
    '发布时间', '时间', '发布', 'publish', 'date', '日期', '发布日期',
    'datetime', '时间戳', '创建时间', 'createTime', 'pubTime', 'pub_date'
  ],
};

/**
 * 计算字符串相似度（Levenshtein距离）
 * @param a - 第一个字符串
 * @param b - 第二个字符串
 * @returns 编辑距离
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * 检查两个字符串是否相似（相似度 >= 70%）
 * @param str1 - 第一个字符串
 * @param str2 - 第二个字符串
 * @returns 是否相似
 */
function isSimilar(str1: string, str2: string): boolean {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);
  const similarity = 1 - distance / maxLen;
  return similarity >= 0.7;
}

/**
 * 使用模糊匹配检测列
 * @param headers - 数据表的表头数组
 * @returns 检测到的列映射
 */
function detectColumnsWithFuzzy(headers: string[]): ColumnDetection {
  const result: ColumnDetection = {
    title: null,
    likes: null,
    comments: null,
    saves: null,
    shares: null,
    publishTime: null,
  };

  // 首先尝试精确匹配
  for (const [key, keywords] of Object.entries(KEYWORDS)) {
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

  // 对未匹配的字段尝试模糊匹配
  for (const [key, keywords] of Object.entries(KEYWORDS)) {
    if (result[key as keyof ColumnDetection]) continue;

    for (const keyword of keywords) {
      const found = headers.find(h => isSimilar(h, keyword));
      if (found) {
        result[key as keyof ColumnDetection] = found;
        break;
      }
    }
  }

  return result;
}

/**
 * 自动检测数据表中的列
 * @param headers - 数据表的表头数组
 * @returns 检测到的列映射
 */
export function detectColumns(headers: string[]): ColumnDetection {
  return detectColumnsWithFuzzy(headers);
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
