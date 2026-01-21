// src/lib/prompts/index.ts
import { PromptEngine } from './engine';
import promptsConfig from '@/config/prompts.json';

// 创建单例实例
export const promptEngine = new PromptEngine(
  promptsConfig as any
);

export { PromptEngine };
