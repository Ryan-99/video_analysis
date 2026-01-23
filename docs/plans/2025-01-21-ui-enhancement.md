# 抖音账号分析Web产品 - UI增强与配置管理实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**目标:** 构建一个具有现代简约风格UI、支持自定义API配置、Prompt文件管理、实时分析日志展示的抖音账号分析工具。

**架构:** Next.js 14全栈应用 + Zustand状态管理 + 配置文件分离(Prompts/AI配置) + 增强的AI服务工厂。

**技术栈:** Next.js 14, TypeScript, TailwindCSS, shadcn/ui, Zustand

---

## 第一阶段：配置文件系统

### Task 1: 创建Prompt配置文件

**Files:**
- Create: `src/config/prompts.json`

**Step 1: 创建prompts.json配置文件**

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-21",
  "prompts": {
    "account_overview": {
      "name": "账号概况分析",
      "template": "请只输出《一、账号概况》这一节，不要输出其他章节。\n\n输出格式要求：\n- 不要表格\n- 每条独占一行\n\n一、账号概况\n账号昵称：\n粉丝数：\n账号类型：\n内容形态：\n数据时间范围：{{data_range}}\n总视频数量：\n发布频率：\n最佳发布时间：\n核心受众人群：\n核心母题：\n变现方式：\n\n视频标题列表（前20条）：\n{{video_titles}}",
      "variables": {
        "video_titles": {
          "description": "视频标题列表",
          "required": true
        },
        "data_range": {
          "description": "数据时间范围",
          "required": false,
          "default": "未知"
        }
      },
      "outputFormat": "json"
    },
    "monthly_trend": {
      "name": "月度趋势分析",
      "template": "分析以下月度趋势数据，识别账号发展阶段（起号期/爆发期/成熟期）。\n\n月度数据：\n{{monthly_data}}\n\n爆款数据：\n{{viral_data}}",
      "variables": {
        "monthly_data": {
          "description": "月度统计数据",
          "required": true
        },
        "viral_data": {
          "description": "爆款视频数据",
          "required": true
        }
      },
      "outputFormat": "text"
    },
    "viral_analysis": {
      "name": "爆款视频分析",
      "template": "分析以下爆款视频，按内容类型分组并提取规律。\n\n爆款视频：\n{{viral_videos}}",
      "variables": {
        "viral_videos": {
          "description": "爆款视频列表",
          "required": true
        }
      },
      "outputFormat": "json"
    },
    "topic_generation": {
      "name": "选题库生成",
      "template": "基于账号概况和爆款分析，生成30条可直接拍摄的爆款选题。\n\n账号概况：\n{{account_overview}}\n\n爆款分类：\n{{viral_categories}}",
      "variables": {
        "account_overview": {
          "description": "账号概况分析",
          "required": true
        },
        "viral_categories": {
          "description": "爆款分类结果",
          "required": true
        }
      },
      "outputFormat": "json"
    }
  }
}
```

**Step 2: 提交**

```bash
git add src/config/prompts.json
git commit -m "feat: add prompts configuration file"
```

---

### Task 2: 创建AI配置文件

**Files:**
- Create: `src/config/ai-configs.json`

**Step 1: 创建ai-configs.json配置文件**

```json
{
  "version": "1.0.0",
  "defaultConfigId": "claude-default",
  "configs": [
    {
      "id": "claude-default",
      "name": "Claude 默认配置",
      "provider": "claude",
      "baseUrl": "https://api.anthropic.com",
      "apiKey": "{{CLAUDE_API_KEY}}",
      "model": "claude-3-5-sonnet-20241022",
      "maxTokens": 2000
    },
    {
      "id": "openai-default",
      "name": "OpenAI 默认配置",
      "provider": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "{{OPENAI_API_KEY}}",
      "model": "gpt-4o",
      "maxTokens": 2000
    }
  ]
}
```

**Step 2: 提交**

```bash
git add src/config/ai-configs.json
git commit -m "feat: add AI configurations file"
```

---

### Task 3: 安装Zustand状态管理

**Files:**
- Modify: `package.json`

**Step 1: 安装Zustand**

```bash
cd "d:\Claude Code\project\test1"
npm install zustand
```

**Step 2: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: install zustand for state management"
```

---

## 第二阶段：核心服务层

### Task 4: 创建类型定义

**Files:**
- Modify: `src/types/index.ts`

**Step 1: 扩展类型定义**

```typescript
// 在现有类型后添加

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
```

**Step 2: 提交**

```bash
git add src/types/index.ts
git commit -m "feat: add config and log type definitions"
```

---

### Task 5: 创建Prompt引擎

**Files:**
- Create: `src/lib/prompts/engine.ts`
- Create: `src/lib/prompts/index.ts`

**Step 1: 创建Prompt引擎**

```typescript
// src/lib/prompts/engine.ts
import { PromptTemplate, PromptsConfig } from '@/types';

/**
 * Prompt模板引擎
 * 负责加载配置、渲染模板、变量替换
 */
export class PromptEngine {
  private prompts: Record<string, PromptTemplate>;

  constructor(config: PromptsConfig) {
    this.prompts = config.prompts;
  }

  /**
   * 渲染Prompt模板
   * @param promptId Prompt ID
   * @param variables 变量对象
   * @returns 渲染后的字符串
   */
  render(promptId: string, variables: Record<string, any>): string {
    const prompt = this.prompts[promptId];
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    // 检查必需变量
    this.validateRequiredVariables(prompt, variables);

    // 替换占位符 {{variable}}
    let result = prompt.template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, this.formatValue(value));
    }

    return result;
  }

  /**
   * 获取Prompt配置
   */
  getConfig(promptId: string): PromptTemplate {
    const prompt = this.prompts[promptId];
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }
    return prompt;
  }

  /**
   * 获取所有Prompt列表
   */
  listPrompts(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.prompts).map(([id, p]) => [id, p.name])
    );
  }

  /**
   * 验证必需变量
   */
  private validateRequiredVariables(
    prompt: PromptTemplate,
    variables: Record<string, any>
  ): void {
    const missing: string[] = [];

    for (const [key, config] of Object.entries(prompt.variables)) {
      if (config.required && variables[key] === undefined) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required variables for ${prompt.name}: ${missing.join(', ')}`
      );
    }
  }

  /**
   * 格式化变量值
   */
  private formatValue(value: any): string {
    if (Array.isArray(value)) {
      return value.join('\n');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
}
```

**Step 2: 创建导出文件**

```typescript
// src/lib/prompts/index.ts
import { PromptEngine } from './engine';
import promptsConfig from '@/config/prompts.json';

// 创建单例实例
export const promptEngine = new PromptEngine(
  promptsConfig as any
);

export { PromptEngine };
```

**Step 3: 提交**

```bash
git add src/lib/prompts
git commit -m "feat: add prompt template engine"
```

---

### Task 6: 创建分析日志服务

**Files:**
- Create: `src/lib/logger/analysis-logger.ts`
- Create: `src/lib/logger/index.ts`

**Step 1: 创建日志服务**

```typescript
// src/lib/logger/analysis-logger.ts
import { AnalysisLog, LogSummary, TaskLogs } from '@/types';

/**
 * 分析日志服务
 * 记录分析过程中的所有步骤和结果
 */
export class AnalysisLogger {
  private logs: Map<string, AnalysisLog[]> = new Map();

  /**
   * 添加日志
   */
  add(taskId: string, log: AnalysisLog): void {
    if (!this.logs.has(taskId)) {
      this.logs.set(taskId, []);
    }
    this.logs.get(taskId)!.push(log);
  }

  /**
   * 获取任务所有日志
   */
  get(taskId: string): AnalysisLog[] {
    return this.logs.get(taskId) || [];
  }

  /**
   * 获取任务日志摘要
   */
  getSummary(taskId: string): LogSummary {
    const logs = this.get(taskId);

    const summary: LogSummary = {
      totalDuration: 0,
      phaseDurations: {},
      aiCalls: 0,
      errors: [],
    };

    for (const log of logs) {
      if (log.duration) {
        summary.totalDuration += log.duration;
        summary.phaseDurations[log.phase] =
          (summary.phaseDurations[log.phase] || 0) + log.duration;
      }
      if (log.phase === 'ai') summary.aiCalls++;
      if (log.status === 'error' && log.error) {
        summary.errors.push(log.error);
      }
    }

    return summary;
  }

  /**
   * 获取完整的任务日志
   */
  getTaskLogs(taskId: string): TaskLogs {
    return {
      taskId,
      logs: this.get(taskId),
      summary: this.getSummary(taskId),
    };
  }

  /**
   * 清理过期日志（7天前）
   */
  cleanup(): number {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let count = 0;

    for (const [taskId, logs] of this.logs) {
      const lastLog = logs[logs.length - 1];
      if (lastLog && new Date(lastLog.timestamp).getTime() < sevenDaysAgo) {
        this.logs.delete(taskId);
        count++;
      }
    }

    return count;
  }

  /**
   * 清空指定任务的日志
   */
  clear(taskId: string): void {
    this.logs.delete(taskId);
  }
}
```

**Step 2: 创建导出文件**

```typescript
// src/lib/logger/index.ts
import { AnalysisLogger } from './analysis-logger';

// 创建单例实例
export const analysisLogger = new AnalysisLogger();

export { AnalysisLogger };
```

**Step 3: 提交**

```bash
git add src/lib/logger
git commit -m "feat: add analysis logger service"
```

---

### Task 7: 创建动态AI客户端

**Files:**
- Create: `src/lib/ai-service/dynamic-client.ts`

**Step 1: 创建动态客户端**

```typescript
// src/lib/ai-service/dynamic-client.ts
import { AIConfig } from '@/types';

/**
 * 动态AI客户端
 * 支持自定义API地址、模型等配置
 */
export class DynamicAIClient {
  constructor(private config: AIConfig) {}

  /**
   * 调用Claude兼容API
   */
  async callClaude(prompt: string, maxTokens?: number): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.resolveApiKey(this.config.apiKey),
      'anthropic-version': '2023-06-01',
    };

    const body = JSON.stringify({
      model: this.config.model,
      max_tokens: maxTokens || this.config.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();

    if (data.content && data.content[0]?.type === 'text') {
      return this.parseResponse(data.content[0].text);
    }

    return data;
  }

  /**
   * 调用OpenAI兼容API
   */
  async callOpenAI(prompt: string, maxTokens?: number): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.resolveApiKey(this.config.apiKey)}`,
    };

    const body = JSON.stringify({
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens || this.config.maxTokens,
    });

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
      return this.parseResponse(data.choices[0].message.content);
    }

    return data;
  }

  /**
   * 统一调用入口
   */
  async call(prompt: string, maxTokens?: number): Promise<any> {
    switch (this.config.provider) {
      case 'claude':
      case 'custom':
        return this.callClaude(prompt, maxTokens);
      case 'openai':
        return this.callOpenAI(prompt, maxTokens);
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }
  }

  /**
   * 解析响应中的JSON
   */
  private parseResponse(text: string): any {
    // 尝试提取JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // 如果解析失败，返回原始文本
      }
    }
    return { text };
  }

  /**
   * 解析API密钥（支持环境变量替换）
   */
  private resolveApiKey(apiKey: string): string {
    // 检查是否是环境变量占位符 {{VAR_NAME }}
    const match = apiKey.match(/\{\{(.+?)\}\}/);
    if (match) {
      const envVar = match[1];
      return process.env[envVar] || apiKey;
    }
    return apiKey;
  }
}
```

**Step 2: 提交**

```bash
git add src/lib/ai-service/dynamic-client.ts
git commit -m "feat: add dynamic AI client"
```

---

### Task 8: 增强AI服务工厂

**Files:**
- Modify: `src/lib/ai-service/factory.ts`

**Step 1: 重写工厂类**

```typescript
// src/lib/ai-service/factory.ts
import { AIConfig } from '@/types';
import { DynamicAIClient } from './dynamic-client';
import { AnalysisLog } from '@/logger';

/**
 * 增强的AI服务工厂
 * 支持动态配置、Prompt模板、日志记录
 */
export class AIServiceFactory {
  constructor(
    private configs: AIConfig[],
    private onLog?: (log: AnalysisLog) => void
  ) {}

  /**
   * 使用指定配置调用AI
   */
  async call(
    configId: string,
    prompt: string,
    maxTokens?: number
  ): Promise<any> {
    const config = this.findConfig(configId);

    this.onLog?.({
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai',
      step: `调用AI服务 (${config.model})`,
      status: 'start',
      input: { prompt: prompt.substring(0, 200) + '...' },
    });

    const startTime = Date.now();

    try {
      const client = new DynamicAIClient(config);
      const result = await client.call(prompt, maxTokens);

      this.onLog?.({
        timestamp: new Date().toISOString(),
        level: 'info',
        phase: 'ai',
        step: 'AI调用完成',
        status: 'success',
        output: typeof result === 'object' ? JSON.stringify(result).substring(0, 200) : result,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.onLog?.({
        timestamp: new Date().toISOString(),
        level: 'error',
        phase: 'ai',
        step: 'AI调用失败',
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * 使用Prompt模板调用
   */
  async callWithPrompt(
    configId: string,
    promptId: string,
    variables: Record<string, any>
  ): Promise<any> {
    // 这里需要注入PromptEngine
    // 暂时返回基础实现
    return this.call(configId, '');
  }

  /**
   * 获取配置列表
   */
  getConfigs(): AIConfig[] {
    return this.configs;
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): AIConfig {
    return this.configs[0]; // 简化实现
  }

  /**
   * 查找配置
   */
  private findConfig(configId: string): AIConfig {
    const config = this.configs.find(c => c.id === configId);
    if (!config) {
      throw new Error(`AI config not found: ${configId}`);
    }
    return config;
  }
}
```

**Step 2: 提交**

```bash
git add src/lib/ai-service/factory.ts
git commit -m "feat: enhance AI service factory"
```

---

## 第三阶段：状态管理

### Task 9: 创建Zustand Store

**Files:**
- Create: `src/lib/store/use-analysis-store.ts`

**Step 1: 创建分析状态Store**

```typescript
// src/lib/store/use-analysis-store.ts
import { create } from 'zustand';
import { AIConfig, AnalysisLog } from '@/types';

interface AnalysisState {
  // API配置
  apiConfigs: AIConfig[];
  selectedConfigId: string | null;

  // 日志
  currentTaskLogs: AnalysisLog[];

  // Actions
  setApiConfigs: (configs: AIConfig[]) => void;
  setSelectedConfigId: (id: string | null) => void;
  addConfig: (config: AIConfig) => void;
  updateConfig: (id: string, config: Partial<AIConfig>) => void;
  deleteConfig: (id: string) => void;

  // 日志Actions
  setLogs: (logs: AnalysisLog[]) => void;
  addLog: (log: AnalysisLog) => void;
  clearLogs: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  // 初始状态
  apiConfigs: [],
  selectedConfigId: null,
  currentTaskLogs: [],

  // API配置Actions
  setApiConfigs: (configs) => set({ apiConfigs: configs }),

  setSelectedConfigId: (id) => set({ selectedConfigId: id }),

  addConfig: (config) => set((state) => ({
    apiConfigs: [...state.apiConfigs, config],
  })),

  updateConfig: (id, updates) => set((state) => ({
    apiConfigs: state.apiConfigs.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
  })),

  deleteConfig: (id) => set((state) => ({
    apiConfigs: state.apiConfigs.filter((c) => c.id !== id),
    selectedConfigId: state.selectedConfigId === id ? null : state.selectedConfigId,
  })),

  // 日志Actions
  setLogs: (logs) => set({ currentTaskLogs: logs }),

  addLog: (log) => set((state) => ({
    currentTaskLogs: [...state.currentTaskLogs, log],
  })),

  clearLogs: () => set({ currentTaskLogs: [] }),
}));
```

**Step 2: 提交**

```bash
git add src/lib/store/use-analysis-store.ts
git commit -m "feat: add Zustand store for analysis state"
```

---

## 第四阶段：API端点

### Task 10: 创建配置API

**Files:**
- Create: `src/app/api/config/route.ts`

**Step 1: 创建配置API**

```typescript
// src/app/api/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import aiConfigs from '@/config/ai-configs.json';

export async function GET(request: NextRequest) {
  try {
    // 从环境变量替换API密钥
    const configs = aiConfigs.configs.map(config => ({
      ...config,
      apiKey: config.apiKey.includes('{{')
        ? `***${config.apiKey.match(/\{\{(.+?)\}\}/)?.[1]}***`
        : '***hidden***'
    }
  }));

    return NextResponse.json({
      success: true,
      data: {
        defaultConfigId: aiConfigs.defaultConfigId,
        configs,
      },
    });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GET_CONFIG_FAILED', message: '获取配置失败' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 这里可以实现配置保存逻辑
    // MVP阶段暂不支持持久化修改

    return NextResponse.json({
      success: true,
      data: body,
    });
  } catch (error) {
    console.error('Update config error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_CONFIG_FAILED', message: '更新配置失败' } },
      { status: 500 }
    );
  }
}
```

**Step 2: 提交**

```bash
git add src/app/api/config/route.ts
git commit -m "feat: add config API endpoint"
```

---

### Task 11: 创建日志API

**Files:**
- Create: `src/app/api/logs/[taskId]/route.ts`

**Step 1: 创建日志API**

```typescript
// src/app/api/logs/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analysisLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const logs = analysisLogger.get(params.taskId);
    const summary = analysisLogger.getSummary(params.taskId);

    return NextResponse.json({
      success: true,
      data: {
        taskId: params.taskId,
        logs,
        summary,
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GET_LOGS_FAILED', message: '获取日志失败' } },
      { status: 500 }
    );
  }
}
```

**Step 2: 提交**

```bash
git add src/app/api/logs
git commit -m "feat: add logs API endpoint"
```

---

## 第五阶段：UI组件

### Task 12: 创建设置页面

**Files:**
- Create: `src/app/settings/page.tsx`

**Step 1: 创建设置页面**

```typescript
// src/app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { AIConfig } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/config');
      const result = await response.json();
      if (result.success) {
        setConfigs(result.data.configs);
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p>加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-neutral-900">设置</h1>
          <Button variant="ghost" onClick={() => router.push('/')}>
            返回
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-2">API 配置</h2>
          <p className="text-neutral-500">管理您的AI服务提供商配置</p>
        </div>

        {/* 配置列表 */}
        <div className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm text-neutral-500">配置名称</Label>
                    <p className="font-medium text-neutral-900">{config.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-neutral-500">提供商</Label>
                      <p className="text-neutral-700">{config.provider}</p>
                    </div>
                    <div>
                      <Label className="text-neutral-500">模型</Label>
                      <p className="text-neutral-700">{config.model}</p>
                    </div>
                    <div>
                      <Label className="text-neutral-500">API地址</Label>
                      <p className="text-neutral-700 font-mono text-xs">{config.baseUrl}</p>
                    </div>
                    <div>
                      <Label className="text-neutral-500">最大Tokens</Label>
                      <p className="text-neutral-700">{config.maxTokens}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    编辑
                  </Button>
                  <Button variant="ghost" size="sm" className="text-error">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* 添加配置按钮 */}
        <Button className="mt-6" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          添加配置
        </Button>
      </div>
    </main>
  );
}
```

**Step 2: 提交**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add settings page"
```

---

### Task 13: 创建日志查看器组件

**Files:**
- Create: `src/components/analyze/LogViewer.tsx`

**Step 1: 创建日志查看器**

```typescript
// src/components/analyze/LogViewer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AnalysisLog } from '@/types';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface LogViewerProps {
  taskId: string;
}

export function LogViewer({ taskId }: LogViewerProps) {
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 定期轮询日志
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/logs/${taskId}`);
        const result = await response.json();
        if (result.success) {
          setLogs(result.data.logs);

          // 如果所有日志都是完成状态，停止轮询
          const allComplete = result.data.logs.every(
            log => log.status === 'success' || log.status === 'error'
          );
          if (allComplete) {
            clearInterval(interval);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId]);

  const getLogIcon = (log: AnalysisLog) => {
    switch (log.status) {
      case 'start':
        return <Clock className="w-4 h-4 text-info" />;
      case 'progress':
        return <Loader2 className="w-4 h-4 text-info animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-error" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      parse: 'text-blue-600',
      calculate: 'text-purple-600',
      ai: 'text-green-600',
      chart: 'text-orange-600',
      report: 'text-pink-600',
    };
    return colors[phase] || 'text-neutral-600';
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">分析日志</h3>

      <div className="space-y-2 font-mono text-sm">
        {logs.length === 0 ? (
          <p className="text-neutral-500">等待日志...</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg">
              <div className="mt-0.5">{getLogIcon(log)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`font-medium ${getPhaseColor(log.phase)}`}>
                    [{log.phase}]
                  </span>
                </div>
                <p className="text-neutral-700 mt-1">{log.step}</p>
                {log.error && (
                  <p className="text-error mt-1 text-xs">{log.error}</p>
                )}
                {log.duration && (
                  <span className="text-neutral-400 text-xs">
                    {log.duration}ms
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
```

**Step 2: 提交**

```bash
git add src/components/analyze/LogViewer.tsx
git commit -m "feat: add log viewer component"
```

---

### Task 14: 更新分析页面

**Files:**
- Modify: `src/app/analyze/[taskId]/page.tsx`

**Step 1: 更新分析页面**

```typescript
// src/app/analyze/[taskId]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePolling } from '@/hooks/usePolling';
import { ProgressBar } from '@/components/analyze/ProgressBar';
import { LogViewer } from '@/components/analyze/LogViewer';
import { Task } from '@/types';

export default function AnalyzePage({ params }: { params: { taskId: string } }) {
  const router = useRouter();
  const { task, error } = usePolling(params.taskId);

  useEffect(() => {
    if (task?.status === 'completed') {
      router.push(`/report/${task.id}`);
    }
  }, [task, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      {/* 顶部导航 */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">抖音账号分析</h1>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* 进度条 */}
        <ProgressBar task={task} />

        {/* 日志查看器 */}
        <LogViewer taskId={params.taskId} />
      </div>
    </main>
  );
}
```

**Step 2: 提交**

```bash
git add src/app/analyze
git commit -m "feat: update analyze page with log viewer"
```

---

### Task 15: 更新主页面UI

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: 更新主页面**

```typescript
// src/app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploader } from '@/components/upload/FileUploader';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { ColumnMapping } from '@/types';

export default function HomePage() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    title: '',
    likes: '',
    comments: '',
    saves: '',
    shares: '',
    publishTime: '',
  });
  const router = useRouter();

  const handleFileUploaded = (id: string, url: string) => {
    setFileId(id);
    setFileUrl(url);
  };

  const handleColumnConfirm = async (mapping: ColumnMapping) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          columnMapping: mapping,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/analyze/${result.data.taskId}`);
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600" />
            <h1 className="text-xl font-semibold text-neutral-900">抖音账号分析</h1>
          </div>
          <Button variant="ghost" onClick={() => router.push('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            设置
          </Button>
        </div>
      </header>

      {/* 主内容 */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {!fileId ? (
          <div className="border-2 border-dashed border-neutral-300 hover:border-indigo-500 transition-colors rounded-xl p-12">
            <FileUploader onFileUploaded={handleFileUploaded} />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
            <ColumnMapper
              fileId={fileId}
              fileUrl={fileUrl!}
              initialMapping={columnMapping}
              onConfirm={handleColumnConfirm}
            />
          </div>
        )}
      </div>
    </main>
  );
}
```

**Step 2: 提交**

```bash
git add src/app/page.tsx
git commit -m "feat: update home page UI with modern design"
```

---

## 第六阶段：更新现有组件

### Task 16: 更新FileUploader组件

**Files:**
- Modify: `src/components/upload/FileUploader.tsx`

**Step 1: 更新上传组件样式**

```typescript
// src/components/upload/FileUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';

interface FileUploaderProps {
  onFileUploaded: (fileId: string, url: string) => void;
}

export function FileUploader({ onFileUploaded }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      onFileUploaded(result.data.fileId, result.data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded]);

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* 图标 */}
      <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
        <Upload className="w-8 h-8 text-neutral-400" />
      </div>

      {/* 标题和描述 */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">上传数据文件</h3>
        <p className="text-neutral-500">
          支持 Excel (.xlsx, .xls) 和 CSV 文件，最大 10MB
        </p>
      </div>

      {/* 上传按钮 */}
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload">
        <Button
          disabled={uploading}
          size="lg"
          className="px-8"
        >
          {uploading ? (
            <>上传中...</>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              选择文件
            </>
          )}
        </Button>
      </label>

      {/* 错误提示 */}
      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
      )}
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add src/components/upload/FileUploader.tsx
git commit -m "style: update FileUploader with modern design"
```

---

### Task 17: 更新ProgressBar组件

**Files:**
- Modify: `src/components/analyze/ProgressBar.tsx'

**Step 1: 更新进度条样式**

```typescript
// src/components/analyze/ProgressBar.tsx
'use client';

import { Task } from '@/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  task: Task;
}

export function ProgressBar({ task }: ProgressBarProps) {
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      queued: '排队中...',
      parsing: '正在解析数据...',
      calculating: '正在计算指标...',
      analyzing: '正在进行AI分析...',
      generating_charts: '正在生成图表...',
      completed: '分析完成！',
      failed: '分析失败',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      queued: 'bg-neutral-500',
      parsing: 'bg-blue-500',
      calculating: 'bg-purple-500',
      analyzing: 'bg-green-500',
      generating_charts: 'bg-orange-500',
      completed: 'bg-emerald-500',
      failed: 'bg-red-500',
    };
    return colorMap[status] || 'bg-neutral-500';
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* 标题和进度 */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-neutral-900">分析进度</h3>
          <span className="text-sm font-medium text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full">
            {task.progress}%
          </span>
        </div>

        {/* 进度条 */}
        <Progress value={task.progress} className="h-2" />

        {/* 当前步骤 */}
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
          <p className="text-sm text-neutral-600">
            {task.currentStep || getStatusText(task.status)}
          </p>
        </div>

        {/* 错误信息 */}
        {task.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{task.error}</p>
          </div>
        )}

        {/* 完成状态 */}
        {task.status === 'completed' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-700">
              分析完成！共处理 <span className="font-semibold">{task.recordCount}</span> 条视频，
              发现 <span className="font-semibold">{task.viralCount}</span> 条爆款
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
```

**Step 2: 提交**

```bash
git add src/components/analyze/ProgressBar.tsx
git commit -m "style: update ProgressBar with modern design"
```

---

### Task 18: 创建配置API路由修复

**Files:**
- Modify: `src/app/api/config/route.ts`

**Step 1: 修复配置API的TypeScript错误**

```typescript
// src/app/api/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import aiConfigs from '@/config/ai-configs.json';

export async function GET(request: NextRequest) {
  try {
    // 从环境变量替换API密钥
    const configs = aiConfigs.configs.map((config: any) => {
      const apiKeyMatch = config.apiKey.match(/\{\{(.+?)\}\}/);
      return {
        ...config,
        apiKey: apiKeyMatch
          ? `***${apiKeyMatch[1]}***`
          : '***hidden***'
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        defaultConfigId: aiConfigs.defaultConfigId,
        configs,
      },
    });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GET_CONFIG_FAILED', message: '获取配置失败' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // MVP阶段暂不支持持久化修改
    return NextResponse.json({
      success: true,
      message: '配置更新仅在当前会话有效',
      data: body,
    });
  } catch (error) {
    console.error('Update config error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_CONFIG_FAILED', message: '更新配置失败' } },
      { status: 500 }
    );
  }
}
```

**Step 2: 提交**

```bash
git add src/app/api/config/route.ts
git commit -m "fix: correct TypeScript types in config API"
```

---

### Task 19: 添加Input组件

**Files:**
- Create: `src/components/ui/input.tsx'

**Step 1: 创建Input组件**

```typescript
// src/components/ui/input.tsx
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={className}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

**Step 2: 提交**

```bash
git add src/components/ui/input.tsx
git commit -m "feat: add Input component"
```

---

### Task 20: 最终测试和提交

**Step 1: 运行开发服务器测试**

```bash
cd "d:\Claude Code\project\test1"
npm run dev
```

**Step 2: 检查所有页面是否正常加载**

访问以下URL验证：
- http://localhost:3000 - 主页
- http://localhost:3000/settings - 设置页面

**Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete UI enhancement and configuration management"
```

---

## 执行说明

本计划包含20个任务，涵盖：
1. 配置文件系统（prompts.json, ai-configs.json）
2. 核心服务层（Prompt引擎、日志服务、动态AI客户端）
3. 状态管理（Zustand Store）
4. API端点（配置API、日志API）
5. UI组件（设置页面、日志查看器、更新的主页面）
6. 样式更新（现代简约风格）

**推荐执行方式：**

使用 **superpowers:subagent-driven-development** 在当前会话中执行，每个任务完成后进行代码审查。
