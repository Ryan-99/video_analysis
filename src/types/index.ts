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
