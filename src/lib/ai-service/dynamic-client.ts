// src/lib/ai-service/dynamic-client.ts
import { AIConfig } from '@/types';
import { cleanAIResponse, safeParseJSON } from '@/lib/ai-analysis/service';

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
   * 解析响应中的JSON（使用统一的容错解析函数）
   */
  private parseResponse(text: string): any {
    try {
      // 使用统一的容错解析函数
      const cleaned = cleanAIResponse(text);
      return safeParseJSON(cleaned);
    } catch (error) {
      console.error('[DynamicAIClient] JSON解析失败，返回原始文本:', error);
      return { text };
    }
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
