// src/types/index.ts
export interface VideoData {
  title: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  publishTime: Date;
}

export interface ColumnMapping {
  title: string;
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  publishTime: string;
}

export type TaskStatus =
  | 'queued'
  | 'parsing'
  | 'calculating'
  | 'analyzing'
  | 'generating_charts'
  | 'completed'
  | 'failed';

export interface AIProviderConfig {
  id: string;
  name: string;
  apiUrl: string;
  model: string;
  apiKey: string;
  apiFormat: 'openai' | 'claude';
}

export interface Task {
  id: string;
  status: TaskStatus;
  progress: number;
  currentStep: string | null;
  error: string | null;
  fileId: string;
  fileName: string;
  fileSize: number;
  fileUrl?: string | null; // Vercel Blob URL 或本地文件路径
  columnMapping: string;
  aiProvider: string;
  aiConfig?: string; // JSON string of AIProviderConfig
  generateTopics: boolean;
  resultData: string | null;
  reportPath: string | null;
  excelPath: string | null;
  chartPaths: string | null;
  recordCount: number | null;
  viralCount: number | null;
  accountName?: string | null; // 从文件名提取的账号名称
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface MonthlyData {
  month: string;
  avgEngagement: number;
  videoCount: number;
  p90: number;
  median: number;
  threshold: number;
}

export interface ViralVideo extends VideoData {
  totalEngagement: number;
  threshold: number;
}

export interface AccountAnalysis {
  name: string;
  type: string;
  audience: string;
  coreTopic: string;
  monetization: {
    level1: string;
    level2: string;
    level3: string;
  };
}

export interface Report {
  reportId: string;
  taskId: string;
  realAccountName?: string | null; // 从文件名提取的真实账号名称
  account: AccountAnalysis;
  monthlyTrend: {
    summary: string;
    data: MonthlyData[];
    stages: Array<{
      type: string;
      period: string;
      description: string;
    }>;
  };
  virals: {
    summary: string;
    total: number;
    threshold: number;
    byCategory: Array<{
      category: string;
      count: number;
      avgEngagement: number;
      description: string;
    }>;
    patterns?: {
      commonElements?: string;
      timingPattern?: string;
      titlePattern?: string;
    };
  };
  topics: Array<{
    id: number;
    category: string;
    titles: string[];
    script: string;
    storyboard: string[];
    casePoint?: string;  // 案例点位
  }>;
  charts: {
    monthlyTrend: string;
    dailyVirals: string;
    viralCategories: string;
  };
}

// ========== 配置相关类型 ==========

export interface PromptVariable {
  description: string;
  required: boolean;
  default?: any;
}

export interface PromptTemplate {
  name: string;
  template: string;
  variables: Record<string, PromptVariable>;
  outputFormat?: 'json' | 'text' | 'markdown';
}

export interface PromptsConfig {
  version: string;
  lastUpdated: string;
  prompts: Record<string, PromptTemplate>;
}

export interface AIConfig {
  id: string;
  name: string;
  provider: 'claude' | 'openai' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface AIConfigsFile {
  version: string;
  defaultConfigId: string;
  configs: AIConfig[];
}

// ========== 日志相关类型 ==========

export type LogLevel = 'info' | 'debug' | 'warn' | 'error';
export type LogPhase = 'parse' | 'calculate' | 'ai' | 'chart' | 'report';
export type LogStatus = 'start' | 'progress' | 'success' | 'error';

export interface AnalysisLog {
  timestamp: string;
  level: LogLevel;
  phase: LogPhase;
  step: string;
  status: LogStatus;
  message?: string;  // 友好的消息文本
  details?: Record<string, any>;  // 详细信息的键值对
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
}

export interface LogSummary {
  totalDuration: number;
  phaseDurations: Record<string, number>;
  aiCalls: number;
  errors: string[];
}

export interface TaskLogs {
  taskId: string;
  logs: AnalysisLog[];
  summary: LogSummary;
}
