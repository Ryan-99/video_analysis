// src/lib/ai-analysis/service.ts
import { promptEngine } from '@/lib/prompts';
import { VideoData, MonthlyData, ViralVideo, AccountAnalysis } from '@/types';
import { calculateMetrics } from '@/lib/analyzer/calculations';

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

  // 调试：记录原始响应的前500字符
  console.log('[cleanAIResponse] 原始响应长度:', cleaned.length);
  console.log('[cleanAIResponse] 原始响应预览:', cleaned.substring(0, 500));

  // 1. 尝试提取第一个有效的 JSON 对象/数组
  // 查找 { 或 [ 的位置（可能被 markdown 包围）
  const jsonStartPattern = /[\{\[]/;
  const startMatch = cleaned.match(jsonStartPattern);

  if (startMatch && startMatch.index !== undefined) {
    // 找到了 JSON 起始，截取从这里开始的内容
    cleaned = cleaned.substring(startMatch.index);
    console.log('[cleanAIResponse] 提取JSON后长度:', cleaned.length);
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

  // 调试：在替换前检查是否有中文引号
  const hasLeftQuote = cleaned.includes('"');
  const hasRightQuote = cleaned.includes('"');
  console.log('[cleanAIResponse] 替换前 - 包含中文左引号:"', hasLeftQuote, '中文右引号:"', hasRightQuote);
  if (hasLeftQuote || hasRightQuote) {
    // 找到第一个中文引号的位置
    const leftQuoteIdx = cleaned.indexOf('"');
    const rightQuoteIdx = cleaned.indexOf('"');
    console.log('[cleanAIResponse] 中文引号位置 - 左:', leftQuoteIdx, '右:', rightQuoteIdx);
    console.log('[cleanAIResponse] 引号周围内容:', cleaned.substring(Math.max(0, (leftQuoteIdx ?? 0) - 20), (leftQuoteIdx ?? 0) + 30));
  }

  // 5. 替换中文标点符号为英文（在提取JSON内容后进行）
  // 中文全角引号 -> 英文半角引号
  cleaned = cleaned.replace(/"/g, '"').replace(/"/g, '"');
  // 中文逗号 -> 英文逗号（在 JSON 中使用）
  cleaned = cleaned.replace(/，/g, ',');
  // 中文冒号 -> 英文冒号
  cleaned = cleaned.replace(/：/g, ':');
  // 中文分号 -> 英文分号
  cleaned = cleaned.replace(/；/g, ';');
  // 中文问号 -> 英文问号
  cleaned = cleaned.replace(/？/g, '?');
  // 中文感叹号 -> 英文感叹号
  cleaned = cleaned.replace(/！/g, '!');

  // 调试：替换后再次检查
  const stillHasLeftQuote = cleaned.includes('"');
  const stillHasRightQuote = cleaned.includes('"');
  console.log('[cleanAIResponse] 替换后 - 仍包含中文左引号:"', stillHasLeftQuote, '中文右引号:"', stillHasRightQuote);

  return cleaned;
}

/**
 * 安全地解析 AI 返回的 JSON
 * 尝试多种策略来解析可能包含问题的 JSON
 */
function safeParseJSON(jsonString: string, maxAttempts = 3): any {
  const attempts: Array<{ name: string; transform: (s: string) => string }> = [
    {
      name: '直接解析',
      transform: (s) => s,
    },
    {
      name: '替换所有中文标点',
      transform: (s) => {
        let result = s;
        // 替换所有可能的全角标点为半角
        result = result.replace(/"/g, '"').replace(/"/g, '"');
        result = result.replace(/'/g, "'").replace(/'/g, "'");
        result = result.replace(/，/g, ',');
        result = result.replace(/：/g, ':');
        result = result.replace(/；/g, ';');
        result = result.replace(/？/g, '?');
        result = result.replace(/！/g, '!');
        result = result.replace(/（/g, '(').replace(/）/g, ')');
        result = result.replace(/【/g, '[').replace(/】/g, ']');
        return result;
      },
    },
    {
      name: '移除所有不可见字符',
      transform: (s) => {
        // 移除可能存在的零宽字符、BOM等
        let result = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
        // 再替换中文标点
        result = result.replace(/"/g, '"').replace(/"/g, '"');
        result = result.replace(/'/g, "'").replace(/'/g, "'");
        result = result.replace(/，/g, ',');
        result = result.replace(/：/g, ':');
        return result;
      },
    },
  ];

  for (let i = 0; i < Math.min(attempts.length, maxAttempts); i++) {
    const attempt = attempts[i];
    try {
      const transformed = attempt.transform(jsonString);
      const parsed = JSON.parse(transformed);
      console.log(`[safeParseJSON] ✅ 尝试 ${i + 1} (${attempt.name}) 成功`);
      return parsed;
    } catch (error) {
      console.log(`[safeParseJSON] ❌ 尝试 ${i + 1} (${attempt.name}) 失败:`, error instanceof Error ? error.message : String(error));
      if (i === Math.min(attempts.length, maxAttempts) - 1) {
        // 最后一次尝试也失败了，抛出错误
        throw error;
      }
    }
  }

  throw new Error('JSON 解析失败');
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
    monthlyData: MonthlyData[],
    aiConfig?: string,
    accountName?: string | null
  ): Promise<AccountAnalysis> {
    // 1. 计算统计指标
    const metrics = calculateMetrics(videos);

    // 2. 格式化发布时间分布（取前3个时间段）
    const topTimeWindows = metrics.bestPublishTime
      .slice(0, 3)
      .map(t => `${t.hour}:00-${t.hour + 1}:00 (${t.percentage.toFixed(1)}%)`)
      .join('；');

    // 3. 从 monthlyData 提取阶段信息
    const stages = this.extractStages(monthlyData);

    // 4. 格式化断更期描述
    const gapPeriods = metrics.publishFrequency.gapPeriods?.map(p =>
      `${formatDateCN(p.start)} 至 ${formatDateCN(p.end)}（${p.days}天）`
    ).join('；') || '';

    // 5. 调用 AI（使用50条标题）
    const titles = videos.map(v => v.title).slice(0, 50).join('\n');

    const prompt = promptEngine.render('account_overview', {
      account_name: accountName || '未知账号',
      video_titles: titles,
      date_range_start: metrics.dateRange.start,
      date_range_end: metrics.dateRange.end,
      total_months: metrics.dateRange.totalMonths,
      total_videos: metrics.totalVideos,
      publish_per_week: metrics.publishFrequency.perWeek,
      has_gap: metrics.publishFrequency.hasGap,
      gap_periods: gapPeriods,
      publish_time_distribution: topTimeWindows,
    });

    const result = await this.callAI(prompt, aiConfig, 180000, 8000); // 3分钟，8000 tokens
    const aiAnalysis = safeParseJSON(cleanAIResponse(result));

    // 6. 合并程序计算的数据和 AI 分析结果
    return {
      nickname: accountName || '未知账号',
      ...aiAnalysis,
      dateRange: {
        start: metrics.dateRange.start,
        end: metrics.dateRange.end,
        stages: stages,
      },
      totalVideos: {
        count: metrics.totalVideos,
      },
      publishFrequency: {
        perWeek: metrics.publishFrequency.perWeek,
        hasGap: metrics.publishFrequency.hasGap,
        gapPeriods: gapPeriods || undefined,
      },
      bestPublishTime: {
        windows: metrics.bestPublishTime.slice(0, 3).map(t => ({
          timeRange: `${t.hour}:00-${t.hour + 1}:00`,
          percentage: t.percentage,
        })),
      },
    } as AccountAnalysis;
  }

  /**
   * 从月度数据提取账号发展阶段
   */
  private extractStages(monthlyData: MonthlyData[]): string {
    if (monthlyData.length === 0) return '';

    const stages: string[] = [];

    // 简单的阶段划分逻辑
    // 探索期：前3个月或视频数较少的时期
    // 起号期：互动量开始明显增长的时期
    // 爆发期：出现高互动爆款的时期
    // 成熟期：输出稳定的时期

    // 根据月度数据找出各个阶段的分界点
    let maxEngagement = 0;
    monthlyData.forEach(m => {
      if (m.p90 > maxEngagement) maxEngagement = m.p90;
    });

    // 计算平均互动量
    const avgAvgEngagement = monthlyData.reduce((sum, m) => sum + m.avgEngagement, 0) / monthlyData.length;

    // 简化的阶段描述
    const stageDescriptions: string[] = [];

    // 根据数据特征添加阶段描述
    if (monthlyData.length >= 6) {
      stageDescriptions.push('探索期');
    }
    if (avgAvgEngagement > maxEngagement * 0.3) {
      stageDescriptions.push('起号期');
    }
    if (maxEngagement > avgAvgEngagement * 3) {
      stageDescriptions.push('爆发期');
    }
    stageDescriptions.push('成熟期');

    return stageDescriptions.join(' → ');
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
    return safeParseJSON(cleanAIResponse(result));
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
    return safeParseJSON(cleanAIResponse(result));
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
    console.log('[AIAnalysisService] 账号类型:', account.accountType);
    console.log('[AIAnalysisService] 爆款分类数:', viralAnalysis.byCategory.length);

    // 格式化爆款分类
    const categoriesText = viralAnalysis.byCategory.map(c =>
      `${c.category}: ${c.count}条, 平均互动${Math.round(c.avgEngagement)}\n描述：${c.description}`
    ).join('\n\n');

    // 格式化爆款规律
    const patternsText = `共同元素：${viralAnalysis.patterns.commonElements}\n发布时间规律：${viralAnalysis.patterns.timingPattern}\n标题规律：${viralAnalysis.patterns.titlePattern}`;

    console.log('[AIAnalysisService] Prompt 数据准备完成');

    const prompt = promptEngine.render('topic_outline_generation', {
      core_topic: account.coreTopics.join('、'),
      account_type: account.accountType,
      audience: account.audience.description,
      viral_categories: categoriesText,
      viral_patterns: patternsText,
    });

    console.log('[AIAnalysisService] Prompt 渲染完成，长度:', prompt.length);

    try {
      // 增加最大 token 数到 16000 以确保能够生成完整的 30 条选题
      console.log('[AIAnalysisService] 调用 AI，超时: 300秒（5分钟），最大 Tokens: 16000');
      const result = await this.callAI(prompt, aiConfig, 300000, 16000); // 5分钟，16000 tokens

      console.log('[AIAnalysisService] AI 返回完成，响应长度:', result.length);
      console.log('[AIAnalysisService] AI 响应预览:', result.substring(0, 200));

      const cleaned = cleanAIResponse(result);
      console.log('[AIAnalysisService] 清理后长度:', cleaned.length);

      const parsed = safeParseJSON(cleaned);
      let outlines = parsed.topics || [];

      console.log(`[AIAnalysisService] 选题大纲生成完成，共 ${outlines.length} 条`);

      // 如果选题数量不足30条，尝试补充生成
      if (outlines.length < 30) {
        console.warn(`[AIAnalysisService] ⚠️ 选题数量不足：期望30条，实际${outlines.length}条，尝试补充生成...`);

        // 计算需要补充的数量
        const needMore = 30 - outlines.length;
        const supplementPrompt = this.generateSupplementPrompt(account, viralAnalysis, outlines, needMore);
        const supplementResult = await this.callAI(supplementPrompt, aiConfig, 180000, 8000);
        const supplementCleaned = cleanAIResponse(supplementResult);
        const supplementParsed = safeParseJSON(supplementCleaned);
        const supplementTopics = supplementParsed.topics || [];

        // 调整补充选题的 ID
        supplementTopics.forEach((t: TopicOutline, idx: number) => {
          t.id = outlines.length + idx + 1;
        });

        outlines = [...outlines, ...supplementTopics];
        console.log(`[AIAnalysisService] 补充后选题数量: ${outlines.length} 条`);
      }

      if (outlines.length > 0) {
        console.log('[AIAnalysisService] 第一条选题:', JSON.stringify(outlines[0]));
      }

      if (outlines.length < 30) {
        console.warn(`[AIAnalysisService] ⚠️ 最终选题数量仍不足：期望30条，实际${outlines.length}条`);
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
   * 生成补充选题的 prompt
   */
  private generateSupplementPrompt(
    account: AccountAnalysis,
    viralAnalysis: { byCategory: Array<{ category: string; count: number; avgEngagement: number; description: string }>; patterns: any },
    existingTopics: TopicOutline[],
    needCount: number
  ): string {
    const existingCategories = existingTopics.map(t => t.category).join('、');
    const categoriesText = viralAnalysis.byCategory.map(c =>
      `${c.category}: ${c.count}条, 平均互动${Math.round(c.avgEngagement)}\n描述：${c.description}`
    ).join('\n\n');

    return `你是专业的抖音内容策划师。请为以下账号补充生成 ${needCount} 条选题大纲。

【账号核心主题】
${account.coreTopic}

【账号类型】
${account.type}

【目标受众】
${account.audience}

【爆款分类】
${categoriesText}

【已有选题】（请不要重复这些分类）
${existingCategories}

【任务要求】
请基于【爆款分类】，补充生成 ${needCount} 条选题大纲。分类必须与已有选题不同。

【输出格式】
请严格按照以下JSON格式输出：
{
  "topics": [
    {"id": 1, "category": "分类名称", "titles": ["本质句标题", "反常识标题", "清单承诺标题"]},
    {"id": 2, "category": "分类名称", "titles": ["本质句标题", "反常识标题", "清单承诺标题"]}
  ]
}

【关键要点】
1. 必须生成完整的 ${needCount} 条选题大纲
2. 每条大纲包含：id、category、titles(3个)
3. 分类必须与已有选题不同，基于账号实际爆款分类
4. 只返回JSON，不要任何解释或说明文字`;
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
        const parsed = safeParseJSON(cleaned);
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

/**
 * 格式化日期为 "YYYY年M月" 格式（用于断更期描述）
 */
function formatDateCN(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

// 使用 globalThis 确保单例
const globalRef = globalThis as typeof globalThis & {
  aiAnalysisServiceInstance?: AIAnalysisService;
};

if (!globalRef.aiAnalysisServiceInstance) {
  globalRef.aiAnalysisServiceInstance = new AIAnalysisService();
}

export const aiAnalysisService = globalRef.aiAnalysisServiceInstance;
