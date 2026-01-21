// src/lib/parser/csv.ts
// CSV 文件解析器
import Papa from 'papaparse';

/**
 * 解析后的数据结构
 */
export interface ParsedData {
  totalRows: number;
  previewData: Record<string, any>[];
  headers: string[];
}

/**
 * 解析 CSV 文件
 * @param file - CSV 文件对象
 * @returns 解析后的数据，包含总行数、预览数据和表头
 */
export async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, // 第一行作为表头
      preview: 5, // 只解析前5行用于预览
      skipEmptyLines: true, // 跳过空行
      complete: (results) => {
        resolve({
          totalRows: results.data.length,
          previewData: results.data as Record<string, any>[],
          headers: results.meta.fields || [],
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
