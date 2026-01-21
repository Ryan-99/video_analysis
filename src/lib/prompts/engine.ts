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
