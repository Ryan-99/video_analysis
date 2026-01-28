// src/lib/queue/database.ts
// 基于 Prisma 的数据库任务队列实现（Vercel Serverless 兼容）
import { prisma } from '@/lib/db';
import { Task, TaskStatus } from '@/types';
import { TaskStateMachine } from '@/lib/queue/state-machine';

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
    fileUrl?: string | null,
    fileContent?: string | null
  ): Promise<Task> {
    const task = await prisma.analysisTask.create({
      data: {
        fileId,
        fileName,
        fileSize,
        fileUrl,
        fileContent,
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
    // 过滤掉 undefined 值，只更新有值的字段
    const updateData: any = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    // console.log('[DatabaseTaskQueue] 更新任务前:', id, 'updates:', JSON.stringify({
    //   status: updates.status,
    //   progress: updates.progress,
    //   currentStep: updates.currentStep,
    // }));

    const task = await prisma.analysisTask.update({
      where: { id },
      data: updateData,
    });

    // console.log('[DatabaseTaskQueue] 更新任务后:', id, '数据库值:', {
    //   status: task.status,
    //   progress: task.progress,
    //   currentStep: task.currentStep,
    // });

    return this.mapToTask(task);
  }

  /**
   * 原子性更新多个字段（带状态验证）
   * 使用 Prisma 事务确保一致性
   */
  async atomicUpdate(id: string, updates: Partial<Task>): Promise<Task | null> {
    return await prisma.$transaction(async (tx) => {
      // 获取当前任务
      const current = await tx.analysisTask.findUnique({
        where: { id },
      });

      if (!current) throw new Error('任务不存在');

      // 验证状态转换（当状态真的改变时才验证）
      if (updates.status && updates.status !== current.status) {
        const valid = TaskStateMachine.validateTransition(
          current.status as TaskStatus,
          updates.status as TaskStatus
        );
        if (!valid) {
          throw new Error(
            `非法状态转换: ${current.status} -> ${updates.status}`
          );
        }
      }

      // 过滤掉 undefined 值
      const updateData: any = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      // 执行更新
      const updated = await tx.analysisTask.update({
        where: { id },
        data: updateData,
      });

      // 验证一致性
      const task = this.mapToTask(updated);
      const consistency = TaskStateMachine.validateConsistency(task);
      if (!consistency.valid) {
        throw new Error(`状态不一致: ${consistency.error}`);
      }

      return updated;
    });
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
   * 原子操作：尝试获取任务锁
   * 只有当 processing=false 时才会设置成功
   * @returns 是否成功获取锁
   */
  async acquireLock(taskId: string): Promise<boolean> {
    const result = await prisma.analysisTask.updateMany({
      where: {
        id: taskId,
        processing: false  // 原子条件：只有未锁定时才更新
      },
      data: {
        processing: true,
        processingLockedAt: new Date()
      }
    });

    return result.count > 0; // 更新了1行说明成功
  }

  /**
   * 释放任务锁（带验证）
   * 只有当 processing=true 时才释放，避免错误释放
   */
  async releaseLock(taskId: string): Promise<void> {
    await prisma.analysisTask.updateMany({
      where: {
        id: taskId,
        processing: true  // ✅ 验证：只有确实是锁定状态才释放
      },
      data: {
        processing: false,
        processingLockedAt: null
      }
    });
  }

  /**
   * 带超时机制的原子锁获取（使用事务避免竞态窗口）
   * 如果锁已超时（5分钟），会强制释放并重新获取
   * @returns 是否成功获取锁
   */
  async acquireLockWithTimeout(taskId: string): Promise<boolean> {
    const LOCK_TIMEOUT = 5 * 60 * 1000; // 5分钟

    return await prisma.$transaction(async (tx) => {
      const task = await tx.analysisTask.findUnique({
        where: { id: taskId }
      });

      if (!task) return false;

      // 检查是否已超时（在事务中）
      if (task.processing && task.processingLockedAt) {
        const lockedDuration = Date.now() - task.processingLockedAt.getTime();
        if (lockedDuration > LOCK_TIMEOUT) {
          // 超时，强制释放
          console.log(`[DatabaseTaskQueue] 任务 ${taskId} 锁已超时 ${lockedDuration}ms，强制释放`);
          await tx.analysisTask.update({
            where: { id: taskId },
            data: {
              processing: false,
              processingLockedAt: null
            }
          });
          // 继续尝试获取新锁
        } else {
          // 未超时，锁仍然有效
          return false;
        }
      }

      // 尝试获取锁（原子性地）
      const result = await tx.analysisTask.updateMany({
        where: {
          id: taskId,
          processing: false
        },
        data: {
          processing: true,
          processingLockedAt: new Date()
        }
      });

      return result.count > 0;
    });
  }

  /**
   * 将数据库模型映射到 Task 类型
   */
  private mapToTask(dbTask: any): Task {
    const mapped = {
      id: dbTask.id,
      status: dbTask.status as TaskStatus,
      progress: dbTask.progress,
      currentStep: dbTask.currentStep,
      error: dbTask.error,
      fileId: dbTask.fileId,
      fileName: dbTask.fileName,
      fileSize: dbTask.fileSize,
      fileUrl: dbTask.fileUrl,
      fileContent: dbTask.fileContent,
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
      analysisStep: dbTask.analysisStep,
      analysisData: dbTask.analysisData,
      topicStep: dbTask.topicStep,
      topicOutlineData: dbTask.topicOutlineData,
      topicDetailIndex: dbTask.topicDetailIndex,
      topicBatchSize: dbTask.topicBatchSize,
      processing: dbTask.processing,
      processingLockedAt: dbTask.processingLockedAt,
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt,
      completedAt: dbTask.completedAt,
    };

    // 调试：记录映射结果（已禁用以减少日志量）
    // console.log('[DatabaseTaskQueue] mapToTask:', {
    //   id: mapped.id,
    //   status: mapped.status,
    //   progress: mapped.progress,
    //   currentStep: mapped.currentStep,
    // });

    return mapped;
  }
}

// 导出单例实例
export const taskQueue = new DatabaseTaskQueue();
