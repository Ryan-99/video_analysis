// src/lib/store/use-analysis-store.ts
import { create } from 'zustand';
import { AIConfig, AnalysisLog, LogSummary } from '@/types';

/**
 * 分析状态Store接口
 */
interface AnalysisStore {
  // 状态
  aiConfigs: AIConfig[];
  selectedConfigId: string | null;
  taskLogs: AnalysisLog[];
  currentTaskId: string | null;

  // 配置相关操作
  setAIConfigs: (configs: AIConfig[]) => void;
  addAIConfig: (config: AIConfig) => void;
  updateAIConfig: (id: string, config: Partial<AIConfig>) => void;
  removeAIConfig: (id: string) => void;
  setSelectedConfigId: (id: string | null) => void;
  getSelectedConfig: () => AIConfig | null;

  // 日志相关操作
  setTaskLogs: (logs: AnalysisLog[]) => void;
  addTaskLog: (log: AnalysisLog) => void;
  setTaskId: (taskId: string | null) => void;
  clearLogs: () => void;

  // 派生状态
  getLogSummary: () => LogSummary | null;
}

/**
 * 使用Zustand创建分析Store
 */
export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  // 初始状态
  aiConfigs: [],
  selectedConfigId: null,
  taskLogs: [],
  currentTaskId: null,

  // 配置操作
  setAIConfigs: (configs) => set({ aiConfigs: configs }),

  addAIConfig: (config) =>
    set((state) => ({
      aiConfigs: [...state.aiConfigs, config],
    })),

  updateAIConfig: (id, config) =>
    set((state) => ({
      aiConfigs: state.aiConfigs.map((c) =>
        c.id === id ? { ...c, ...config } : c
      ),
    })),

  removeAIConfig: (id) =>
    set((state) => {
      const newConfigs = state.aiConfigs.filter((c) => c.id !== id);
      // 如果删除的是当前选中的配置，重置选中状态
      const newSelectedId =
        state.selectedConfigId === id
          ? newConfigs.length > 0
            ? newConfigs[0].id
            : null
          : state.selectedConfigId;
      return {
        aiConfigs: newConfigs,
        selectedConfigId: newSelectedId,
      };
    }),

  setSelectedConfigId: (id) => set({ selectedConfigId: id }),

  getSelectedConfig: () => {
    const state = get();
    if (!state.selectedConfigId) return null;
    return (
      state.aiConfigs.find((c) => c.id === state.selectedConfigId) || null
    );
  },

  // 日志操作
  setTaskLogs: (logs) => set({ taskLogs: logs }),

  addTaskLog: (log) =>
    set((state) => ({
      taskLogs: [...state.taskLogs, log],
    })),

  setTaskId: (taskId) => set({ currentTaskId: taskId }),

  clearLogs: () => set({ taskLogs: [], currentTaskId: null }),

  // 派生状态：计算日志摘要
  getLogSummary: () => {
    const state = get();
    const logs = state.taskLogs;

    if (logs.length === 0) return null;

    const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0);

    // 按阶段统计时长
    const phaseDurations = logs.reduce<Record<string, number>>(
      (acc, log) => {
        if (log.duration) {
          acc[log.phase] = (acc[log.phase] || 0) + log.duration;
        }
        return acc;
      },
      {}
    );

    // 统计AI调用次数
    const aiCalls = logs.filter((log) => log.phase === 'ai').length;

    // 错误列表
    const errors = logs
      .filter((log) => log.status === 'error')
      .map((log) => log.error || '未知错误');

    return {
      totalDuration,
      phaseDurations,
      aiCalls,
      errors,
    };
  },
}));
