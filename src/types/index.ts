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

export interface Task {
  id: string;
  status: TaskStatus;
  progress: number;
  currentStep: string | null;
  error: string | null;
  fileId: string;
  fileName: string;
  fileSize: number;
  columnMapping: string;
  aiProvider: string;
  generateTopics: boolean;
  resultData: string | null;
  reportPath: string | null;
  excelPath: string | null;
  chartPaths: string | null;
  recordCount: number | null;
  viralCount: number | null;
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
    }>;
  };
  topics: Array<{
    id: number;
    category: string;
    titles: string[];
    script: string;
    storyboard: string[];
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
