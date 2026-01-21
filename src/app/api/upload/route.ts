// src/app/api/upload/route.ts
// 文件上传 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/blob';

// 配置运行时为 Edge，以便支持 Vercel Blob
export const runtime = 'edge';
export const maxDuration = 10;

/**
 * POST /api/upload
 * 处理文件上传请求
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

    // 生成唯一文件ID并重命名文件
    const fileId = crypto.randomUUID();
    const fileName = `${fileId}-${file.name}`;
    const renamedFile = new File([file], fileName, { type: file.type });

    // 上传到 Vercel Blob
    const url = await uploadFile(renamedFile);

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        url,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: '文件上传失败'
        }
      },
      { status: 500 }
    );
  }
}
