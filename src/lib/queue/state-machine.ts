// src/lib/queue/state-machine.ts
// 任务状态机辅助类

import { Task, TaskStatus, TopicStep } from '@/types';

/**
 * 状态机转换规则
 * 定义每个状态可以转换到的目标状态
 */
export const STATE_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  queued: ['parsing', 'analyzing', 'failed'],
  parsing: ['calculating', 'analyzing', 'failed'], // parsing 可以转到 calculating（完整流程）或 analyzing（分步流程）
  calculating: ['analyzing', 'failed'],
  analyzing: ['topic_generating', 'failed'],
  topic_generating: ['generating_charts', 'completed', 'failed'],
  generating_charts: ['completed', 'failed'],
  completed: [],
  failed: ['queued'], // 允许重试
};

/**
 * 任务状态机辅助类
 * 提供状态验证、一致性检查等功能
 */
export class TaskStateMachine {
  /**
   * 验证状态转换是否合法
   */
  static validateTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus
  ): boolean {
    const allowed = STATE_TRANSITIONS[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  /**
   * 验证任务的内部状态一致性
   */
  static validateConsistency(task: Task): { valid: boolean; error?: string } {
    // status = topic_generating 时，topicStep 不能为 null
    if (task.status === 'topic_generating' && !task.topicStep) {
      return { valid: false, error: 'topicStep 为 null，状态不一致' };
    }

    // status = topic_generating 时，resultData 必须存在
    if (task.status === 'topic_generating' && !task.resultData) {
      return { valid: false, error: 'resultData 为空，状态不一致' };
    }

    // topicStep = outline 时，必须有 resultData
    if (task.topicStep === 'outline' && !task.resultData) {
      return { valid: false, error: 'topicStep=outline 但 resultData 为空' };
    }

    return { valid: true };
  }

  /**
   * 计算下一步的正确状态
   * 根据分析步骤号返回对应的任务状态
   */
  static getNextStepStatus(analysisStep: number): TaskStatus {
    switch (analysisStep) {
      case 0: return 'parsing';
      case 1: return 'analyzing';
      case 2: return 'analyzing';
      case 3: return 'analyzing';
      case 4: return 'analyzing';
      case 5: return 'analyzing';
      case 6: return 'topic_generating';
      default: return 'queued';
    }
  }

  /**
   * 获取步骤的描述文本
   */
  static getStepDescription(step: number): string {
    const descriptions: Record<number, string> = {
      0: '正在解析数据...',
      1: '正在分析账号概况...',
      2: '正在分析月度趋势...',
      3: '正在分析爆发期...',
      4: '正在进行爆款分类...',
      5: '正在抽象方法论...',
      6: '正在保存分析结果...',
    };
    return descriptions[step] || '正在处理...';
  }

  /**
   * 获取步骤的进度百分比
   * 使用简单的等差数列，每步间隔 10%
   */
  static getStepProgress(step: number): number {
    return 10 + step * 10; // 10, 20, 30, 40, 50, 60, 70
  }
}
