// src/app/api/parse/route.ts
// 文件解析 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { parseExcel, parseCSV, detectColumns } from '@/lib/parser';

// 配置运行时为 Node.js
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

    // 从 fileUrl 提取完整文件名（格式：uuid-filename.ext）
    const urlPath = new URL(fileUrl, 'http://localhost').pathname;
    let fullFileName = urlPath.split('/').pop() || '';

    // URL 解码文件名（处理中文文件名）
    try {
      fullFileName = decodeURIComponent(fullFileName);
    } catch {
      // 如果解码失败，保持原样
    }

    const isExcel = fullFileName.endsWith('.xlsx') || fullFileName.endsWith('.xls');

    // 获取文件内容
    let arrayBuffer: ArrayBuffer;

    // 如果 fileUrl 是 HTTP(S) URL，从 Vercel Blob 获取
    if (fileUrl.startsWith('http')) {
      console.log('[Parse API] 从 Vercel Blob 获取文件:', fileUrl);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`获取文件失败: ${response.status} ${response.statusText}`);
      }
      arrayBuffer = await response.arrayBuffer();
    } else {
      // 本地开发环境：从文件系统读取
      console.log('[Parse API] 从本地文件系统获取文件');
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');

      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      const filePath = join(uploadsDir, fullFileName);

      const buffer = await readFile(filePath);

      // 将 Buffer 转换为 ArrayBuffer
      if (Buffer.isBuffer(buffer)) {
        arrayBuffer = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength
        );
      } else {
        arrayBuffer = buffer;
      }
    }

    console.log('[Parse API] 文件大小:', arrayBuffer.byteLength, '文件类型:', isExcel ? 'Excel' : 'CSV');

    // 将 ArrayBuffer 转换为 Base64（用于解决 Blob URL 过期问题）
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const fileContent = btoa(binary);
    console.log('[Parse API] Base64 编码大小:', fileContent.length);

    let parsedData;
    if (isExcel) {
      // 解析 Excel 文件
      parsedData = await parseExcel(arrayBuffer);
    } else {
      // 解析 CSV 文件
      parsedData = await parseCSV(arrayBuffer);
    }

    console.log('[Parse API] 解析成功，总行数:', parsedData.totalRows, '表头:', parsedData.headers);

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
        fileContent: fileContent, // 返回 Base64 编码的文件内容
      },
    });
  } catch (error) {
    console.error('[Parse API] 解析失败:', error);
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
