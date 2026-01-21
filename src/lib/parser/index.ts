// src/lib/parser/index.ts
// 解析器统一导出
export { parseExcel, type ParsedData } from './excel';
export { parseCSV } from './csv';
export { detectColumns, validateColumnMapping, type ColumnDetection } from './validator';
