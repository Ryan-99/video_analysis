// src/lib/queue/database.ts
// 基于 Prisma 的数据库任务队列实现（Vercel Serverless 兼容）
import { prisma } from '@/lib/db';
import { Task, TaskStatus } from '@/types';

/**
 * 数据库任务队列实现
 * 使用 Prisma 和数据库存储任务，支持 Vercel Serverless 环境
 */
class DatabaseTaskQueue {
  /**
   * 创建新任务
   */
  async create(
    fileId: string,
    fileName: string,
    fileSize: number,
    columnMapping: string,
    aiConfig?: string,
    accountName?: string | null,
    fileUrl?: string | null
  ): Promise<Task> {
    const task = await prisma.analysisTask.create({
      data: {
        fileId,
        fileName,
        fileSize,
        fileUrl,
        columnMapping,
        aiConfig,
        accountName,
        status: 'queued',
        progress: 0,
        currentStep: '任务已创建',
      },
    });

    console.log('[DatabaseTaskQueue] 创建任务:', task.id, '账号名称:', accountName || '未指定');

    return this.mapToTask(task);
  }

  /**
   * 更新任务
   */
  async update(id: string, updates: Partial<Task>): Promise<Task | null> {
    const updateData: any = {
      ...updates,
    };

    // 处理状态枚举
    if (updates.status) {
      updateData.status = updates.status;
    }

    const task = await prisma.analysisTask.update({
      where: { id },
      data: updateData,
    });

    console.log('[DatabaseTaskQueue] 更新任务:', id, '状态:', task.status);

    return this.mapToTask(task);
  }

  /**
   * 获取任务
   */
  async get(id: string): Promise<Task | null> {
    const task = await prisma.analysisTask.findUnique({
      where: { id },
    });

    return task ? this.mapToTask(task) : null;
  }

  /**
   * 获取所有任务
   */
  async getAll(): Promise<Task[]> {
    const tasks = await prisma.analysisTask.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map(t => this.mapToTask(t));
  }

  /**
   * 删除任务
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.analysisTask.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清理过期任务（7天前的已完成任务）
   */
  async cleanup(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await prisma.analysisTask.deleteMany({
      where: {
        status: 'completed',
        completedAt: { not: null, lt: sevenDaysAgo },
      },
    });

    return result.count;
  }

  /**
   * 将数据库模型映射到 Task 类型
   */
  private mapToTask(dbTask: any): Task {
    return {
      id: dbTask.id,
      status: dbTask.status as TaskStatus,
      progress: dbTask.progress,
      currentStep: dbTask.currentStep,
      error: dbTask.error,
      fileId: dbTask.fileId,
      fileName: dbTask.fileName,
      fileSize: dbTask.fileSize,
      fileUrl: dbTask.fileUrl,
      columnMapping: dbTask.columnMapping,
      aiProvider: dbTask.aiProvider,
      aiConfig: dbTask.aiConfig,
      generateTopics: dbTask.generateTopics,
      resultData: dbTask.resultData,
      reportPath: dbTask.reportPath,
      excelPath: dbTask.excelPath,
      chartPaths: dbTask.chartPaths,
      recordCount: dbTask.recordCount,
      viralCount: dbTask.viralCount,
      accountName: dbTask.accountName,
      topicStep: dbTask.topicStep,
      topicOutlineData: dbTask.topicOutlineData,
      topicDetailIndex: dbTask.topicDetailIndex,
      topicBatchSize: dbTask.topicBatchSize,
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt,
      completedAt: dbTask.completedAt,
    };
  }
}

// 导出单例实例
export const taskQueue = new DatabaseTaskQueue();
