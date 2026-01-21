import { Task } from '@/types';

/**
 * 内存任务队列实现
 * 使用Map存储任务，支持增删改查和清理操作
 */
class MemoryTaskQueue {
  private tasks: Map<string, Task> = new Map();

  /**
   * 创建新任务
   * @param fileId 文件ID
   * @param fileName 文件名
   * @param fileSize 文件大小
   * @param columnMapping 列映射（JSON字符串）
   * @returns 创建的任务
   */
  create(fileId: string, fileName: string, fileSize: number, columnMapping: string): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      status: 'queued',
      progress: 0,
      currentStep: '任务已创建',
      error: null,
      fileId,
      fileName,
      fileSize,
      columnMapping,
      aiProvider: 'claude',
      generateTopics: true,
      resultData: null,
      reportPath: null,
      excelPath: null,
      chartPaths: null,
      recordCount: null,
      viralCount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  /**
   * 更新任务
   * @param id 任务ID
   * @param updates 要更新的字段
   * @returns 更新后的任务，如果不存在则返回null
   */
  update(id: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated: Task = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  /**
   * 获取任务
   * @param id 任务ID
   * @returns 任务对象，如果不存在则返回null
   */
  get(id: string): Task | null {
    return this.tasks.get(id) || null;
  }

  /**
   * 获取所有任务
   * @returns 所有任务数组
   */
  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 删除任务
   * @param id 任务ID
   * @returns 是否删除成功
   */
  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  /**
   * 清理过期任务（7天前的已完成任务）
   * @returns 清理的任务数量
   */
  cleanup(): number {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const [id, task] of this.tasks) {
      if (
        task.status === 'completed' &&
        task.completedAt &&
        task.completedAt < sevenDaysAgo
      ) {
        this.tasks.delete(id);
        count++;
      }
    }

    return count;
  }
}

/**
 * 导出单例任务队列实例
 */
export const taskQueue = new MemoryTaskQueue();
