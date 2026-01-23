// src/lib/logger/analysis-logger.ts
import { prisma } from '@/lib/db';
import { AnalysisLog, LogSummary, TaskLogs } from '@/types';

/**
 * 分析日志服务 - 使用数据库存储
 * 适配 Vercel Serverless 环境
 */
export class AnalysisLogger {
  /**
   * 添加日志到数据库
   */
  async add(taskId: string, log: AnalysisLog): Promise<void> {
    try {
      await prisma.analysisLog.create({
        data: {
          taskId,
          timestamp: new Date(log.timestamp),
          level: log.level,
          phase: log.phase,
          step: log.step,
          status: log.status,
          details: log.details ? JSON.stringify(log.details) : null,
          duration: log.duration,
        },
      });
    } catch (error) {
      // 日志记录失败不应中断主流程
      console.error('[AnalysisLogger] 添加日志失败:', error);
    }
  }

  /**
   * 获取任务所有日志
   */
  async get(taskId: string): Promise<AnalysisLog[]> {
    try {
      const logs = await prisma.analysisLog.findMany({
        where: { taskId },
        orderBy: { timestamp: 'asc' },
      });

      return logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level as 'info' | 'error' | 'warn',
        phase: log.phase as any,
        step: log.step,
        status: log.status as any,
        ...(log.details ? { details: JSON.parse(log.details) } : {}),
        ...(log.duration ? { duration: log.duration } : {}),
      }));
    } catch (error) {
      console.error('[AnalysisLogger] 获取日志失败:', error);
      return [];
    }
  }

  /**
   * 获取任务日志摘要
   */
  async getSummary(taskId: string): Promise<LogSummary> {
    try {
      const logs = await this.get(taskId);

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
        if (log.status === 'error' && log.details?.error) {
          summary.errors.push(log.details.error as string);
        }
      }

      return summary;
    } catch (error) {
      console.error('[AnalysisLogger] 获取摘要失败:', error);
      return {
        totalDuration: 0,
        phaseDurations: {},
        aiCalls: 0,
        errors: [],
      };
    }
  }

  /**
   * 获取完整的任务日志
   */
  async getTaskLogs(taskId: string): Promise<TaskLogs> {
    const logs = await this.get(taskId);
    const summary = await this.getSummary(taskId);

    return {
      taskId,
      logs,
      summary,
    };
  }

  /**
   * 清理过期日志（7天前）
   */
  async cleanup(): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await prisma.analysisLog.deleteMany({
        where: {
          timestamp: { lt: sevenDaysAgo },
        },
      });

      return result.count;
    } catch (error) {
      console.error('[AnalysisLogger] 清理日志失败:', error);
      return 0;
    }
  }

  /**
   * 清空指定任务的日志
   */
  async clear(taskId: string): Promise<void> {
    try {
      await prisma.analysisLog.deleteMany({
        where: { taskId },
      });
    } catch (error) {
      console.error('[AnalysisLogger] 清空日志失败:', error);
    }
  }
}
