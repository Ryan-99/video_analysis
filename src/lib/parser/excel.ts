// src/lib/parser/excel.ts
// Excel 文件解析器
import * as XLSX from 'xlsx';

/**
 * 解析后的数据结构
 */
export interface ParsedData {
  totalRows: number;
  previewData: Record<string, any>[];
  headers: string[];
}

/**
 * 解析 Excel 文件
 * @param buffer - Excel 文件的 Buffer 或 ArrayBuffer
 * @returns 解析后的数据，包含总行数、预览数据和表头
 */
export async function parseExcel(buffer: Buffer | ArrayBuffer): Promise<ParsedData> {
  // 将 Buffer 转换为 ArrayBuffer（如果是 Buffer）
  let arrayBuffer: ArrayBuffer;
  if (Buffer.isBuffer(buffer)) {
    arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;
  } else {
    arrayBuffer = buffer;
  }

  // 读取工作簿
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // 获取第一个工作表
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 将工作表转换为 JSON 数据
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: false, // 不使用原始值，而是格式化后的值
    dateNF: 'yyyy-mm-dd hh:mm:ss', // 日期格式
  }) as Record<string, any>[];

  // 提取表头
  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

  // 获取前5条数据作为预览
  const previewData = jsonData.slice(0, 5);

  return {
    totalRows: jsonData.length,
    previewData,
    headers,
  };
}
