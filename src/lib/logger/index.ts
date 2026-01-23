// src/lib/logger/index.ts
import { AnalysisLogger } from './analysis-logger';

// 使用 globalThis 确保在 Next.js 开发模式下也是真正的单例
const globalRef = globalThis as typeof globalThis & {
  analysisLoggerInstance?: AnalysisLogger;
};

if (!globalRef.analysisLoggerInstance) {
  globalRef.analysisLoggerInstance = new AnalysisLogger();
}

// 导出单例实例
export const analysisLogger = globalRef.analysisLoggerInstance;

export { AnalysisLogger };
