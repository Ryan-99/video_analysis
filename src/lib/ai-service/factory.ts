// src/lib/ai-service/factory.ts
import { AIConfig, AnalysisLog } from '@/types';
import { DynamicAIClient } from './dynamic-client';
import { promptEngine } from '@/lib/prompts';

/**
 * AI服务提供商类型（保留向后兼容）
 */
export type AIProvider = 'claude' | 'openai';

/**
 * AI服务接口（保留向后兼容）
 */
export interface AIService {
  analyzeAccount(videos: any[]): Promise<any>;
}

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
    const prompt = promptEngine.render(promptId, variables);
    return this.call(configId, prompt);
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
    return this.configs[0];
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

// 保留原有的向后兼容函数
import * as ClaudeService from './claude';
import * as OpenAIService from './openai';

class ClaudeCompat implements AIService {
  async analyzeAccount(videos: any[]): Promise<any> {
    return ClaudeService.analyzeAccount(videos);
  }
}

class OpenAICompat implements AIService {
  async analyzeAccount(videos: any[]): Promise<any> {
    return OpenAIService.analyzeAccount(videos);
  }
}

/**
 * 带重试和回退机制的AI服务执行器（保留向后兼容）
 */
export async function executeWithFallback<T>(
  fn: (service: AIService) => Promise<T>,
  preferredProvider: AIProvider = 'claude'
): Promise<T> {
  const providers = preferredProvider === 'claude' ? ['claude', 'openai'] : ['openai', 'claude'];

  for (const provider of providers) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const service = provider === 'claude' ? new ClaudeCompat() : new OpenAICompat();
        return await fn(service);
      } catch (error) {
        console.error(`${provider} attempt ${attempt + 1} failed:`, error);
        if (attempt === 2) break;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw new Error('所有AI提供商均失败');
}
