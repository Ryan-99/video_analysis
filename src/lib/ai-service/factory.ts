import { VideoData, AccountAnalysis } from '@/types';
import * as Claude from './claude';
import * as OpenAI from './openai';

/**
 * AI服务提供商类型
 */
export type AIProvider = 'claude' | 'openai';

/**
 * AI服务接口
 */
export interface AIService {
  analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis>;
}

/**
 * Claude服务实现
 */
class ClaudeService implements AIService {
  async analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis> {
    return Claude.analyzeAccount(videos);
  }
}

/**
 * OpenAI服务实现
 */
class OpenAIService implements AIService {
  async analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis> {
    return OpenAI.analyzeAccount(videos);
  }
}

/**
 * 带重试和回退机制的AI服务执行器
 * @param fn 要执行的函数
 * @param preferredProvider 首选的AI提供商
 * @returns 执行结果
 */
export async function executeWithFallback<T>(
  fn: (service: AIService) => Promise<T>,
  preferredProvider: AIProvider = 'claude'
): Promise<T> {
  // 确定提供商顺序
  const providers = preferredProvider === 'claude' ? ['claude', 'openai'] : ['openai', 'claude'];

  // 遍历所有提供商
  for (const provider of providers) {
    // 每个提供商最多重试3次，使用指数退避
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const service = provider === 'claude' ? new ClaudeService() : new OpenAIService();
        return await fn(service);
      } catch (error) {
        console.error(`${provider} attempt ${attempt + 1} failed:`, error);
        // 如果是最后一次尝试，跳出内层循环
        if (attempt === 2) break;
        // 指数退避等待
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw new Error('所有AI提供商均失败');
}
