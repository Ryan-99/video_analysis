// src/app/api/parse/route.ts
// 文件解析 API 路由
import { NextRequest, NextResponse } from 'next/server';

// 配置运行时为 Edge
export const runtime = 'edge';
export const maxDuration = 10;

/**
 * POST /api/parse
 * 解析上传的文件并返回预览数据和列映射
 */
export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    // 验证文件ID
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILE_ID',
            message: '缺少文件ID'
          }
        },
        { status: 400 }
      );
    }

    // TODO: 实际解析将在Task 5完成后实现
    // 目前返回模拟数据用于前端开发
    return NextResponse.json({
      success: true,
      data: {
        totalRows: 100,
        previewData: [
          {
            '标题': '测试视频1',
            '点赞数': '1234',
            '评论数': '56',
            '收藏数': '78',
            '转发数': '12',
            '发布时间': '2025-01-15 10:30:00'
          }
        ],
        detectedColumns: {
          title: '标题',
          likes: '点赞数',
          comments: '评论数',
          saves: '收藏数',
          shares: '转发数',
          publishTime: '发布时间'
        },
        columnMapping: {
          title: '标题',
          likes: '点赞数',
          comments: '评论数',
          saves: '收藏数',
          shares: '转发数',
          publishTime: '发布时间'
        },
      },
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PARSE_FAILED',
          message: '文件解析失败'
        }
      },
      { status: 500 }
    );
  }
}
