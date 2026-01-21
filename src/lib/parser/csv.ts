// src/lib/parser/csv.ts
// CSV 文件解析器
import Papa from 'papaparse';
import { readFile } from 'fs/promises';

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
 * @param input - File 对象（浏览器）或 ArrayBuffer/Buffer（Node.js）
 * @returns 解析后的数据，包含总行数、预览数据和表头
 */
export async function parseCSV(input: File | Buffer | ArrayBuffer): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    let csvContent: string;

    // 处理不同类型的输入
    if (input instanceof File) {
      // 浏览器环境：File 对象
      Papa.parse(input, {
        header: true,
        preview: 5,
        skipEmptyLines: true,
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
      return;
    } else if (Buffer.isBuffer(input)) {
      // Node.js 环境：Buffer
      csvContent = input.toString('utf-8');
    } else {
      // ArrayBuffer
      const decoder = new TextDecoder('utf-8');
      csvContent = decoder.decode(input);
    }

    // 解析 CSV 字符串
    Papa.parse(csvContent, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
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

/**
 * 从本地文件路径解析 CSV 文件（仅 Node.js）
 * @param filePath - 文件系统路径
 * @returns 解析后的数据
 */
export async function parseCSVFromFile(filePath: string): Promise<ParsedData> {
  const buffer = await readFile(filePath);
  return parseCSV(buffer);
}
