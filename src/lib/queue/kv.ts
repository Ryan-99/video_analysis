// src/lib/queue/kv.ts
// 基于 Vercel KV 的任务队列实现
// 适用于 Vercel Serverless 环境
import { Task, TaskStatus } from '@/types';

/**
 * KV 存储键前缀
 */
const KV_PREFIX = 'task:';

/**
 * 将 Task 对象转换为 KV 存储格式（去除不支持的字段）
 */
function taskToKV(task: Task): Record<string, any> {
  return {
    id: task.id,
    status: task.status,
    progress: task.progress,
    currentStep: task.currentStep,
    error: task.error,
    fileId: task.fileId,
    fileName: task.fileName,
    fileSize: task.fileSize,
    fileUrl: task.fileUrl,
    columnMapping: task.columnMapping,
    aiProvider: task.aiProvider,
    aiConfig: task.aiConfig,
    generateTopics: task.generateTopics,
    resultData: task.resultData,
    reportPath: task.reportPath,
    excelPath: task.excelPath,
    chartPaths: task.chartPaths,
    recordCount: task.recordCount,
    viralCount: task.viralCount,
    accountName: task.accountName,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

/**
 * 从 KV 存储格式恢复 Task 对象
 */
function kvToTask(kv: Record<string, any>): Task {
  return {
    ...kv,
    createdAt: new Date(kv.createdAt),
    updatedAt: new Date(kv.updatedAt),
    completedAt: kv.completedAt ? new Date(kv.completedAt) : null,
  };
}

/**
 * Vercel KV 任务队列实现
 */
class KVTaskQueue {
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
    const id = crypto.randomUUID();
    const now = new Date();

    const task: Task = {
      id,
      status: 'queued',
      progress: 0,
      currentStep: '任务已创建',
      error: null,
      fileId,
      fileName,
      fileSize,
      fileUrl,
      columnMapping,
      aiProvider: 'claude',
      aiConfig,
      generateTopics: true,
      resultData: null,
      reportPath: null,
      excelPath: null,
      chartPaths: null,
      recordCount: null,
      viralCount: null,
      accountName,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    // 存储到 KV（设置 7 天过期）
    const kv = await this.getKV();
    const key = `${KV_PREFIX}${id}`;
    await kv.put(key, JSON.stringify(taskToKV(task)), {
      expirationTtl: 7 * 24 * 60 * 60, // 7天
    });

    console.log('[KVTaskQueue] 创建任务:', id, '账号名称:', accountName || '未指定');

    return task;
  }

  /**
   * 更新任务
   */
  async update(id: string, updates: Partial<Task>): Promise<Task | null> {
    const kv = await this.getKV();
    const key = `${KV_PREFIX}${id}`;

    // 获取现有任务
    const existing = await kv.get(key);
    if (!existing) {
      console.log('[KVTaskQueue] 更新失败，任务不存在:', id);
      return null;
    }

    // 解析并更新
    const existingTask = kvToTask(JSON.parse(existing.value!));
    const updated: Task = {
      ...existingTask,
      ...updates,
      updatedAt: new Date(),
    };

    // 处理状态枚举
    if (updates.status) {
      updated.status = updates.status;
    }

    // 如果完成，设置完成时间
    if (updates.status === 'completed' && !existingTask.completedAt) {
      updated.completedAt = new Date();
    }

    // 存储更新后的任务
    await kv.put(key, JSON.stringify(taskToKV(updated)), {
      expirationTtl: 7 * 24 * 60 * 60, // 7天
    });

    console.log('[KVTaskQueue] 更新任务:', id, '状态:', updated.status);

    return updated;
  }

  /**
   * 获取任务
   */
  async get(id: string): Promise<Task | null> {
    const kv = await this.getKV();
    const key = `${KV_PREFIX}${id}`;

    const result = await kv.get(key);
    if (!result) {
      console.log('[KVTaskQueue] 任务不存在:', id);
      return null;
    }

    return kvToTask(JSON.parse(result.value!));
  }

  /**
   * 获取所有任务
   */
  async getAll(): Promise<Task[]> {
    const kv = await this.getKV();

    // 列出所有任务键
    const keys = await kv.list({ prefix: KV_PREFIX });

    const tasks: Task[] = [];
    for (const key of keys.keys) {
      const result = await kv.get(key.name);
      if (result) {
        tasks.push(kvToTask(JSON.parse(result.value!)));
      }
    }

    // 按创建时间倒序排列
    tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return tasks;
  }

  /**
   * 删除任务
   */
  async delete(id: string): Promise<boolean> {
    const kv = await this.getKV();
    const key = `${KV_PREFIX}${id}`;

    try {
      await kv.delete(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清理过期任务
   */
  async cleanup(): Promise<number> {
    const kv = await this.getKV();

    // 列出所有任务键
    const keys = await kv.list({ prefix: KV_PREFIX });

    let count = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const key of keys.keys) {
      try {
        const result = await kv.get(key.name);
        if (result) {
          const task = kvToTask(JSON.parse(result.value!));
          if (task.status === 'completed' &&
              task.completedAt &&
              task.completedAt.getTime() < sevenDaysAgo) {
            await kv.delete(key.name);
            count++;
          }
        }
      } catch {
        // 忽略删除失败的项
      }
    }

    return count;
  }

  /**
   * 获取 KV 存储实例
   */
  private async getKV() {
    // 动态导入 @vercel/kv
    const { kv } = await import('@vercel/kv');
    return kv;
  }
}

// 导出单例
export const taskQueue = new KVTaskQueue();
