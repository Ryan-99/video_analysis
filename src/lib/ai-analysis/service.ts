// src/lib/ai-analysis/service.ts
import { promptEngine } from '@/lib/prompts';
import { VideoData, MonthlyData, ViralVideo, AccountAnalysis } from '@/types';

/**
 * 清理 AI 返回的 JSON 字符串
 * 处理各种可能的 AI 返回格式问题：
 * - markdown 代码块标记 (```json ... ```)
 * - AI 添加的额外说明文字
 * - JSON 前后的多余空白
 * - 多个代码块
 * - 中文引号问题
 */
function cleanAIResponse(response: string): string {
  let cleaned = response.trim();

  // 0. 先替换中文引号为英文引号（在整个文本上替换，避免破坏 JSON 结构）
  // 中文全角引号 -> 英文半角引号
  cleaned = cleaned.replace(/"/g, '"').replace(/"/g, '"');
  // 中文逗号 -> 英文逗号（在 JSON 中使用）
  cleaned = cleaned.replace(/，/g, ',');

  // 1. 尝试提取第一个有效的 JSON 对象/数组
  // 查找 { 或 [ 的位置（可能被 markdown 包围）
  const jsonStartPattern = /[\{\[]/;
  const startMatch = cleaned.match(jsonStartPattern);

  if (startMatch && startMatch.index !== undefined) {
    // 找到了 JSON 起始，截取从这里开始的内容
    cleaned = cleaned.substring(startMatch.index);
  }

  // 2. 移除 markdown 代码块语言标记（如 ```json）
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
  }

  // 3. 查找匹配的结束括号
  let braceCount = 0;
  let bracketCount = 0;
  let endIndex = -1;
  const firstChar = cleaned.charAt(0);

  if (firstChar === '{') {
    // 查找匹配的 }
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;

      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  } else if (firstChar === '[') {
    // 查找匹配的 ]
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;

      if (bracketCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (endIndex !== -1) {
    cleaned = cleaned.substring(0, endIndex);
  }

  // 4. 移除可能残留的 ``` 标记
  cleaned = cleaned.replace(/```/g, '').trim();

  return cleaned;
}

/**
 * 选题大纲类型
 */
export interface TopicOutline {
  id: number;
  category: string;
  titles: string[];
}

/**
 * 完整选题类型
 */
export interface FullTopic extends TopicOutline {
  script: string;
  storyboard: string[];
  casePoint?: string;
}

/**
 * AI 分析服务
 * 按照PRD要求，逐步调用AI生成报告内容
 */
export class AIAnalysisService {
  /**
   * 步骤1：分析账号概况
   */
  async analyzeAccountOverview(
    videos: VideoData[],
    aiConfig?: string,
    accountName?: string | null
  ): Promise<AccountAnalysis> {
    const titles = videos.map(v => v.title).slice(0, 30).join('\n');

    const prompt = promptEngine.render('account_overview', {
      account_name: accountName || '未知账号',
      video_titles: titles,
    });

    const result = await this.callAI(prompt, aiConfig, 180000, 8000); // 3分钟，8000 tokens
    return JSON.parse(cleanAIResponse(result)) as AccountAnalysis;
  }

  /**
   * 步骤2：分析月度趋势和阶段划分
   */
  async analyzeMonthlyTrend(
    monthlyData: MonthlyData[],
    virals: ViralVideo[],
    aiConfig?: string
  ): Promise<{ summary: string; stages: Array<{ type: string; period: string; description: string }> }> {
    // 格式化月度数据
    const monthlyText = monthlyData.map(m =>
      `${m.month}: 视频${m.videoCount}条, 平均互动${Math.round(m.avgEngagement)}, P90${Math.round(m.p90)}, 中位数${Math.round(m.median)}, 阈值${Math.round(m.threshold)}`
    ).join('\n');

    // 格式化爆款数据
    const viralText = virals.map(v =>
      `${v.title} | 互动${Math.round(v.totalEngagement)}`
    ).join('\n');

    const prompt = promptEngine.render('monthly_trend', {
      monthly_data: monthlyText,
      viral_data: viralText,
    });

    const result = await this.callAI(prompt, aiConfig, 180000, 8000); // 3分钟，8000 tokens
    return JSON.parse(cleanAIResponse(result));
  }

  /**
   * 步骤3：分析爆款视频分类
   */
  async analyzeViralVideos(
    virals: ViralVideo[],
    threshold: number,
    aiConfig?: string
  ): Promise<{
    summary: string;
    byCategory: Array<{ category: string; count: number; avgEngagement: number; description: string }>;
    patterns: { commonElements: string; timingPattern: string; titlePattern: string };
  }> {
    // 格式化爆款视频列表
    const viralText = virals.map(v =>
      `${v.title} | 互动${Math.round(v.totalEngagement)}`
    ).join('\n');

    const prompt = promptEngine.render('viral_analysis', {
      viral_videos: viralText,
      threshold: Math.round(threshold).toString(),
    });

    const result = await this.callAI(prompt, aiConfig, 300000, 12000); // 5分钟，12000 tokens
    return JSON.parse(cleanAIResponse(result));
  }

  /**
   * 步骤4a：生成选题大纲（30条 id+category+titles）
   */
  async generateTopicOutline(
    account: AccountAnalysis,
    viralAnalysis: { byCategory: Array<{ category: string; count: number; avgEngagement: number; description: string }>; patterns: any },
    aiConfig?: string
  ): Promise<TopicOutline[]> {
    console.log('[AIAnalysisService] ===== 开始生成选题大纲 =====');
    console.log('[AIAnalysisService] 账号类型:', account.type);
    console.log('[AIAnalysisService] 爆款分类数:', viralAnalysis.byCategory.length);

    // 格式化爆款分类
    const categoriesText = viralAnalysis.byCategory.map(c =>
      `${c.category}: ${c.count}条, 平均互动${Math.round(c.avgEngagement)}\n描述：${c.description}`
    ).join('\n\n');

    // 格式化爆款规律
    const patternsText = `共同元素：${viralAnalysis.patterns.commonElements}\n发布时间规律：${viralAnalysis.patterns.timingPattern}\n标题规律：${viralAnalysis.patterns.titlePattern}`;

    console.log('[AIAnalysisService] Prompt 数据准备完成');

    const prompt = promptEngine.render('topic_outline_generation', {
      core_topic: account.coreTopic,
      account_type: account.type,
      audience: account.audience,
      viral_categories: categoriesText,
      viral_patterns: patternsText,
    });

    console.log('[AIAnalysisService] Prompt 渲染完成，长度:', prompt.length);

    try {
      console.log('[AIAnalysisService] 调用 AI，超时: 300秒（5分钟），最大 Tokens: 6000');
      const result = await this.callAI(prompt, aiConfig, 300000, 6000); // 5分钟，6000 tokens

      console.log('[AIAnalysisService] AI 返回完成，响应长度:', result.length);
      console.log('[AIAnalysisService] AI 响应预览:', result.substring(0, 200));

      const cleaned = cleanAIResponse(result);
      console.log('[AIAnalysisService] 清理后长度:', cleaned.length);

      const parsed = JSON.parse(cleaned);
      const outlines = parsed.topics || [];

      console.log(`[AIAnalysisService] 选题大纲生成完成，共 ${outlines.length} 条`);
      if (outlines.length > 0) {
        console.log('[AIAnalysisService] 第一条选题:', JSON.stringify(outlines[0]));
      }

      if (outlines.length < 30) {
        console.warn(`[AIAnalysisService] ⚠️ 选题数量不足：期望30条，实际${outlines.length}条`);
      }

      return outlines;
    } catch (error) {
      console.error('[AIAnalysisService] ❌ 选题大纲生成失败:', error);
      if (error instanceof SyntaxError) {
        console.error('[AIAnalysisService] JSON 解析错误，响应内容可能不是有效的 JSON');
      }
      return [];
    }
  }

  /**
   * 步骤4b：为选题大纲生成完整内容（分批）
   * @param outlines - 选题大纲列表
   * @param account - 账号分析结果
   * @param viralPatterns - 爆款规律
   * @param aiConfig - AI配置
   * @param batchSize - 每批处理的数量（默认10条）
   */
  async generateTopicDetails(
    outlines: TopicOutline[],
    account: AccountAnalysis,
    viralPatterns: any,
    aiConfig?: string,
    batchSize: number = 10
  ): Promise<FullTopic[]> {
    console.log('[Topics] 开始分批生成, 总数:', outlines.length, ', 每批:', batchSize);

    const allTopics: FullTopic[] = [];
    const batches = Math.ceil(outlines.length / batchSize);

    // 格式化爆款规律
    const patternsText = `共同元素：${viralPatterns.commonElements}\n发布时间规律：${viralPatterns.timingPattern}\n标题规律：${viralPatterns.titlePattern}`;

    for (let i = 0; i < batches; i++) {
      const startIdx = i * batchSize;
      const endIdx = Math.min(startIdx + batchSize, outlines.length);
      const batch = outlines.slice(startIdx, endIdx);

      console.log(`[Topics] 第 ${i + 1}/${batches} 批 (${startIdx + 1}-${endIdx})`);

      // 格式化选题大纲
      const outlinesText = batch.map(t =>
        `${t.id}. ${t.category}\n标题：${t.titles.join(' / ')}`
      ).join('\n\n');

      const prompt = promptEngine.render('topic_detail_generation', {
        core_topic: account.coreTopic,
        viral_patterns: patternsText,
        topic_outlines: outlinesText,
      });

      let result = '';
      try {
        // 每批超时 300 秒（5分钟），确保充分时间生成
        result = await this.callAI(prompt, aiConfig, 300000, 12000); // 300秒，12000 tokens

        const cleaned = cleanAIResponse(result);
        const parsed = JSON.parse(cleaned);
        const batchTopics = parsed.topics || [];

        // 合并原始大纲数据和新生成的详情
        for (const detail of batchTopics) {
          const outline = batch.find(o => o.id === detail.id);
          if (outline) {
            allTopics.push({
              ...outline,
              ...detail,
            });
          }
        }

        console.log(`[Topics] 第 ${i + 1}/${batches} 批完成, 累计 ${allTopics.length} 条`);
      } catch (error) {
        console.error(`[Topics] 第 ${i + 1}/${batches} 批失败:`, error instanceof Error ? error.message : error);
        // 失败的批次只保留大纲数据
        for (const outline of batch) {
          allTopics.push({
            ...outline,
            script: '',
            storyboard: [],
            casePoint: '',
          });
        }
      }

      // 添加延迟避免 API 速率限制
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('[Topics] 完成, 总数:', allTopics.length);
    return allTopics;
  }

  /**
   * 调用AI的通用方法（带重试机制）
   * @param prompt - 提示词
   * @param aiConfig - AI配置（JSON字符串）
   * @param timeout - 超时时间（毫秒）
   * @param maxTokens - 最大token数（默认8000）
   */
  private async callAI(prompt: string, aiConfig?: string, timeout: number = 120000, maxTokens: number = 8000, retries: number = 2): Promise<string> {
    if (!aiConfig) {
      throw new Error('AI配置未设置');
    }

    const providerConfig = JSON.parse(aiConfig);

    // 解析API密钥（支持环境变量）
    const apiKey = providerConfig.apiKey.startsWith('{{')
      ? process.env[providerConfig.apiKey.slice(2, -2)] || providerConfig.apiKey
      : providerConfig.apiKey;

    if (!apiKey || apiKey === '' || apiKey.includes('your_')) {
      throw new Error('API密钥未配置，请在设置中配置API密钥');
    }

    console.log(`[AI] 调用AI: ${providerConfig.model}, 超时: ${timeout/1000}秒, 重试次数: ${retries}`);
    console.log(`[AI] API URL: ${providerConfig.apiUrl}`);
    console.log(`[AI] Prompt (前200字符): ${prompt.substring(0, 200)}...`);

    // 重试循环
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.executeFetch(prompt, providerConfig, apiKey, timeout, maxTokens, attempt);
      } catch (error) {
        const isLastAttempt = attempt === retries;
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.error(`[AI] 请求失败 (尝试 ${attempt + 1}/${retries + 1}): ${errorMsg}`);

        // 网络错误且非最后一次尝试，则重试
        if (!isLastAttempt && (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ETIMEDOUT'))) {
          const delay = Math.pow(2, attempt) * 1000; // 指数退避: 1s, 2s, 4s...
          console.log(`[AI] 等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // 最后一次尝试或非网络错误，抛出异常
        throw new Error(`AI请求失败: ${errorMsg}`);
      }
    }

    throw new Error('AI请求失败: 未知错误');
  }

  /**
   * 执行实际的 fetch 请求
   */
  private async executeFetch(
    prompt: string,
    providerConfig: any,
    apiKey: string,
    timeout: number,
    maxTokens: number,
    attempt: number
  ): Promise<string> {
    console.log(`[AI] 发送请求 (尝试 ${attempt + 1})...`);

    // 构建请求
    let url = providerConfig.apiUrl;
    if (providerConfig.apiFormat === 'claude') {
      const baseUrl = providerConfig.apiUrl.replace(/\/v1\/messages$/, '').replace(/\/$/, '');
      url = `${baseUrl}/v1/messages`;
      console.log(`[AI] Claude URL: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: providerConfig.model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API错误 (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      const result = data.content?.[0]?.text || '';
      console.log(`[AI] Response (前500字符): ${result.substring(0, 500)}...`);
      return result;
    } else {
      // OpenAI格式
      if (!url.includes('/chat/completions')) {
        const baseUrl = url.replace(/\/$/, '');
        url = `${baseUrl}/chat/completions`;
      }
      console.log(`[AI] OpenAI URL: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API错误 (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content || '';
      console.log(`[AI] Response (前500字符): ${result.substring(0, 500)}...`);
      return result;
    }
  }
}

// 使用 globalThis 确保单例
const globalRef = globalThis as typeof globalThis & {
  aiAnalysisServiceInstance?: AIAnalysisService;
};

if (!globalRef.aiAnalysisServiceInstance) {
  globalRef.aiAnalysisServiceInstance = new AIAnalysisService();
}

export const aiAnalysisService = globalRef.aiAnalysisServiceInstance;
