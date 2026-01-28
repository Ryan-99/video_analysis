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
  | 'topic_generating'
  | 'generating_charts'
  | 'completed'
  | 'failed';

/**
 * 选题生成步骤
 */
export type TopicStep =
  | 'outline'   // 生成大纲
  | 'details'   // 生成详情
  | 'complete'  // 完成
  | null;       // 未开始

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
  fileContent?: string | null; // Base64 编码的文件内容（解决 Blob URL 过期问题）
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

  // 分析步骤分步执行字段
  analysisStep?: number | null;  // 当前分析步骤 (0=解析, 1=账号, 2=月度, 3=爆发期, 4=爆款主, 5=方法论, 6=完成)
  analysisData?: string | null;  // 临时存储中间数据（JSON）

  // 选题生成分步执行字段
  topicStep?: string | null;  // 'outline' | 'details' | 'complete'
  topicOutlineData?: string | null;  // 临时存储大纲数据（JSON）
  topicDetailIndex?: number | null;  // 当前详情批次索引 (0-2)
  topicBatchSize?: number;  // 每批次数量

  // 防并发锁字段（Vercel Serverless 环境需要数据库级别的锁）
  processing?: boolean;  // 标记任务是否正在处理中
  processingLockedAt?: Date | null;  // 锁定时间戳（用于超时检测）

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
  // 基本信息
  nickname: string;              // 账号昵称
  followerCount?: {              // 粉丝数
    value: string;               // 如 "637.5万"
    source: 'verified' | 'inferred' | 'missing';  // 可验证/推断/待补充
    basis?: string;              // 推断依据（仅当 source=inferred 时）
  };

  // 内容定位
  accountType: string;           // 账号类型
  contentFormat: string;         // 内容形态

  // 数据概览（由程序计算，非 AI 推断）
  dateRange: {                   // 数据时间范围
    start: string;               // YYYY年M月
    end: string;                 // YYYY年M月
    stages?: string;             // 阶段说明（AI 分析）
    stageDetails?: Array<{       // 具体阶段详情（AI 分析）
      type: string;              // 如 "探索期"
      period: string;            // 如 "2022年5月 至 2022年12月"
      description: string;       // 阶段描述
    }>;
  };
  totalVideos: {                 // 总视频数量
    count: number;               // 数量
    note?: string;               // 备注（如"含少量共创"）
  };
  publishFrequency: {            // 发布频率
    perWeek: number;             // ≈X条/周
    hasGap: boolean;             // 是否有断更期
    gapPeriods?: string;         // 断更区间描述（旧格式，兼容）
    gapPeriodsList?: Array<{     // 断更区间列表（新格式）
      start: string;             // YYYY年M月
      end: string;               // YYYY年M月
      days: number;              // 天数
    }>;
  };
  bestPublishTime: {             // 最佳发布时间
    windows: Array<{             // 时间窗数组
      timeRange: string;         // 如 "15:00-17:00"
      percentage: number;        // 占比%
    }>;
    analysis?: string;           // 与受众作息匹配说明
  };

  // 受众与内容
  audience: {                    // 核心受众人群
    description: string;         // 如 "25-40岁..."
    basis: string;               // 推断依据（必须提供）
  };
  coreTopics: string[];          // 核心母题（3-7个短词）
  unstableReason?: string;       // 若母题不稳定的原因

  // 变现方式
  monetization: {
    methods: string[];           // 变现方式列表
    salesFunnel: string;         // 成交链路
    priceRange: string;          // 主产品价格带
    consistency: string;         // 内容与变现一致性
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

    // 新增字段
    dataScopeNote?: string;  // 数据分析口径说明

    // 关键波峰月份
    peakMonths?: Array<{
      month: string;
      description: string;
      topVideos: Array<{
        publishTime: string;   // 发布时间 "2021/11/6 16:00"
        title: string;
        likes: number;
        comments: number;
        saves: number;
        shares: number;
        totalEngagement: number;
        saveRate: number;      // 收藏率 %
      }>;
    }>;

    // 长期爆款母体
    viralThemes?: {
      hasThemes: boolean;
      themes?: Array<{
        themeType: string;     // 如 "内卷反转"
        representativeTitle: string;
        description: string;
      }>;
      reason?: string;         // 如果无爆款母体，说明原因
    };

    // 爆发期细化
    explosivePeriods?: Array<{
      periodName: string;      // 如 "起号爆发期"
      period: string;          // 如 "2021年8月"
      explanation: string;     // 为什么算爆发
      topVideos: Array<{
        publishTime: string;
        title: string;
        likes: number;
        comments: number;
        saves: number;
        shares: number;
        totalEngagement: number;
        saveRate: number;
      }>;
    }>;
  };
  virals: {
    summary: string;
    total: number;
    threshold: number;

    // 新增：数据分析口径说明
    dataScopeNote?: string;

    // 新增：逐月爆款清单
    monthlyList?: Array<{
      month: string;
      threshold: number;
      videos: Array<{
        publishTime: string;
        title: string;
        likes: number;
        comments: number;
        saves: number;
        shares: number;
        totalEngagement: number;
        saveRate: number;
      }>;
      top10Titles: string[];
    }>;

    // 扩展：爆款分析总览（改用中位数）
    byCategory?: Array<{
      category: string;
      count: number;
      medianEngagement: number;
      medianSaveRate: number;
      p90SaveRate: number;
      description: string;
    }>;

    // 新增：共性机制（当不可分类时）
    commonMechanisms?: {
      hasCategories: boolean;
      mechanisms?: Array<{
        pattern: string;
        evidence: string[];
      }>;
      reason?: string;
    };

    // 新增：方法论抽象模块
    methodology?: {
      viralTheme: {
        formula: string;
        conclusion: string;
        evidence: string[];
      };
      timeDistribution: Array<{
        timeWindow: string;
        percentage: number;
      }>;
      topicFormulas: Array<{
        theme: string;
        scenarios: string;
        hiddenRules: string;
        counterIntuitive: string;
        actions: string[];
        templates: string[];
      }>;
      titleFormulas: Array<{
        type: string;
        template: string;
        example?: string;
      }>;
      scriptFormula: {
        mainFramework: string;
        explanation: string;
        alternativeFramework?: string;
      };
    };

    // 新增：爆款选题库（聚合表）
    topicLibrary?: Array<{
      id: number;
      publishTime: string;
      title: string;
      category: string;
      totalEngagement: number;
      saveRate: number;
      keyTakeaway: string;
    }>;

    // 保留兼容：原有 patterns 字段
    patterns?: {
      commonElements?: string;
      timingPattern?: string;
      titlePattern?: string;
    };
  };
  dailyTop1?: Array<{
    date: string;
    engagement: number;
    title: string;
  }>;
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
