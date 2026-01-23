// src/app/api/upload/route.ts
// 文件上传 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/blob';

// 配置运行时为 Edge（Vercel Blob 需要）
export const runtime = 'edge';
export const maxDuration = 10;

/**
 * POST /api/upload
 * 处理文件上传请求，使用 Vercel Blob 存储
 */
export async function POST(request: NextRequest) {
  try {
    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // 验证文件是否存在
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILE',
            message: '未上传文件'
          }
        },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: '仅支持Excel或CSV文件'
          }
        },
        { status: 400 }
      );
    }

    // 验证文件大小（最大10MB）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: '文件大小不能超过10MB'
          }
        },
        { status: 413 }
      );
    }

    // 生成唯一文件ID
    const fileId = crypto.randomUUID();

    // 使用 Vercel Blob 上传文件
    // 修改文件名为唯一ID格式，避免冲突
    const uniqueFileName = `${fileId}-${file.name}`;
    const renamedFile = new File([file], uniqueFileName, {
      type: file.type,
    });

    console.log('[Upload API] 开始上传到 Vercel Blob:', uniqueFileName);
    const url = await uploadFile(renamedFile);
    console.log('[Upload API] 上传成功:', url);

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        fileId,
        fileName: file.name, // 原始文件名
        fileSize: file.size,
        contentType: file.type,
        url, // Vercel Blob 的公开访问 URL
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Upload API] 上传失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: '文件上传失败',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}
