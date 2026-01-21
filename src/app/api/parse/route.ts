// src/app/api/parse/route.ts
// 文件解析 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { parseExcel, parseCSV, detectColumns } from '@/lib/parser';

// 配置运行时为 Edge
export const runtime = 'edge';
export const maxDuration = 10;

/**
 * 从指定 URL 下载文件
 * @param url - 文件的公开访问 URL（可以是相对或绝对 URL）
 * @param request - 原始请求对象，用于构建绝对 URL
 * @returns 文件的 ArrayBuffer
 */
async function fetchFile(url: string, request: NextRequest): Promise<ArrayBuffer> {
  // 如果是相对路径，转换为绝对 URL
  let absoluteUrl = url;
  if (url.startsWith('/')) {
    absoluteUrl = new URL(url, request.url).href;
  }

  const response = await fetch(absoluteUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}

/**
 * POST /api/parse
 * 解析上传的文件并返回预览数据和列映射
 */
export async function POST(request: NextRequest) {
  try {
    const { fileId, fileUrl } = await request.json();

    // 验证文件ID和URL
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

    // 从存储下载文件
    const buffer = await fetchFile(fileUrl, request);

    // 从文件名中提取原始文件名（fileId 格式为 uuid-filename.ext）
    const fileName = fileId.split('-').slice(1).join('-');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    let parsedData;
    if (isExcel) {
      // 解析 Excel 文件
      parsedData = await parseExcel(buffer);
    } else {
      // 解析 CSV 文件（需要创建 File 对象）
      const file = new File([buffer], fileName, { type: 'text/csv' });
      parsedData = await parseCSV(file);
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
