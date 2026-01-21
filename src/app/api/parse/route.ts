// src/app/api/parse/route.ts
// 文件解析 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { parseExcel, parseCSV, detectColumns } from '@/lib/parser';
import { readFile } from 'fs/promises';
import { join } from 'path';

// 配置运行时为 Node.js（需要文件系统访问）
export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * POST /api/parse
 * 解析上传的文件并返回预览数据和列映射
 */
export async function POST(request: NextRequest) {
  try {
    const { fileId, fileUrl } = await request.json();

    // 验证文件ID
    if (!fileId || !fileUrl) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_FILE_ID',
            message: '缺少文件ID或文件URL'
          }
        },
        { status: 400 }
      );
    }

    // 从 fileUrl 提取完整文件名（格式：/uploads/uuid-filename.ext）
    const urlPath = new URL(fileUrl, 'http://localhost').pathname;
    const fullFileName = urlPath.split('/').pop() || '';
    const isExcel = fullFileName.endsWith('.xlsx') || fullFileName.endsWith('.xls');

    // 构建本地文件路径（本地开发环境）
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, fullFileName);

    // 读取文件内容
    const buffer = await readFile(filePath);

    let parsedData;
    if (isExcel) {
      // 解析 Excel 文件
      parsedData = await parseExcel(buffer);
    } else {
      // 解析 CSV 文件
      parsedData = await parseCSV(buffer);
    }

    // 自动检测列映射
    const detectedColumns = detectColumns(parsedData.headers);

    // 创建列映射对象
    const columnMapping = {
      title: detectedColumns.title || '',
      likes: detectedColumns.likes || '',
      comments: detectedColumns.comments || '',
      saves: detectedColumns.saves || '',
      shares: detectedColumns.shares || '',
      publishTime: detectedColumns.publishTime || '',
    };

    // 尝试填充未检测到的列
    for (const key of Object.keys(columnMapping)) {
      if (!columnMapping[key as keyof typeof columnMapping]) {
        // 尝试从表头中直接查找
        const searchKey = key === 'publishTime' ? 'time' : key;
        const found = parsedData.headers.find((h: string) =>
          h.toLowerCase().includes(searchKey.toLowerCase())
        );
        columnMapping[key as keyof typeof columnMapping] = found || '';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: parsedData.totalRows,
        previewData: parsedData.previewData,
        detectedColumns: detectedColumns,
        columnMapping: columnMapping,
      },
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PARSE_FAILED',
          message: '文件解析失败',
          details: error instanceof Error ? error.message : String(error),
        }
      },
      { status: 500 }
    );
  }
}
