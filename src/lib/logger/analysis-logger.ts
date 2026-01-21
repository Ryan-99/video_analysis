// src/lib/logger/analysis-logger.ts
import { AnalysisLog, LogSummary, TaskLogs } from '@/types';

/**
 * 分析日志服务
 * 记录分析过程中的所有步骤和结果
 */
export class AnalysisLogger {
  private logs: Map<string, AnalysisLog[]> = new Map();

  /**
   * 添加日志
   */
  add(taskId: string, log: AnalysisLog): void {
    if (!this.logs.has(taskId)) {
      this.logs.set(taskId, []);
    }
    this.logs.get(taskId)!.push(log);
  }

  /**
   * 获取任务所有日志
   */
  get(taskId: string): AnalysisLog[] {
    return this.logs.get(taskId) || [];
  }

  /**
   * 获取任务日志摘要
   */
  getSummary(taskId: string): LogSummary {
    const logs = this.get(taskId);

    const summary: LogSummary = {
      totalDuration: 0,
      phaseDurations: {},
      aiCalls: 0,
      errors: [],
    };

    for (const log of logs) {
      if (log.duration) {
        summary.totalDuration += log.duration;
        summary.phaseDurations[log.phase] =
          (summary.phaseDurations[log.phase] || 0) + log.duration;
      }
      if (log.phase === 'ai') summary.aiCalls++;
      if (log.status === 'error' && log.error) {
        summary.errors.push(log.error);
      }
    }

    return summary;
  }

  /**
   * 获取完整的任务日志
   */
  getTaskLogs(taskId: string): TaskLogs {
    return {
      taskId,
      logs: this.get(taskId),
      summary: this.getSummary(taskId),
    };
  }

  /**
   * 清理过期日志（7天前）
   */
  cleanup(): number {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let count = 0;

    for (const [taskId, logs] of this.logs) {
      const lastLog = logs[logs.length - 1];
      if (lastLog && new Date(lastLog.timestamp).getTime() < sevenDaysAgo) {
        this.logs.delete(taskId);
        count++;
      }
    }

    return count;
  }

  /**
   * 清空指定任务的日志
   */
  clear(taskId: string): void {
    this.logs.delete(taskId);
  }
}
