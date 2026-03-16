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
export function cleanAIResponse(response: string): string {
  let cleaned = response.trim();

  // 诊断日志：记录原始响应信息
  const responsePreview = response.substring(0, Math.min(300, response.length));
  console.log('[cleanAIResponse] 原始响应长度:', response.length);
  console.log('[cleanAIResponse] 前300字符:', responsePreview);

  // 1. 移除 ```json 标记（必须在提取 JSON 之前）
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }

  // 2. 提取 JSON 内容（从第一个 { 或 [ 开始）
  const jsonStart = cleaned.indexOf('{');
  const jsonArrayStart = cleaned.indexOf('[');
  const startIndex = jsonStart === -1 ? jsonArrayStart :
                    jsonArrayStart === -1 ? jsonStart :
                    Math.min(jsonStart, jsonArrayStart);

  if (startIndex !== -1) {
    cleaned = cleaned.substring(startIndex);
  }

  // 2.5. 将中文双引号替换为转义的 ASCII 引号
  // AI 返回的 JSON 中，中文双引号（""）仅出现在文本内容中（如"穷忙"），
  // 不是 JSON 结构性引号。直接替换为 \" 使 JSON 解析器能正确处理
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '\\"');

  // 3. 查找匹配的结束括号并截取（考虑字符串内部和转义字符）
  const firstChar = cleaned.charAt(0);
  if (firstChar === '{') {
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (c === '\\') {
        escapeNext = true;
        continue;
      }
      // 处理各种引号：ASCII " 和中文 """""
      const isQuote = c === '"';
      if (isQuote) {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            cleaned = cleaned.substring(0, i + 1);
            break;
          }
        }
      }
    }
  } else if (firstChar === '[') {
    let depth = 0;
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) {
          cleaned = cleaned.substring(0, i + 1);
          break;
        }
      }
    }
  }

  // 4. 移除残留的 ``` 标记
  cleaned = cleaned.replace(/```/g, '').trim();

  // 5. 替换中文标点（在括号匹配之后，只处理提取的 JSON 内容）
  // 注意：中文双引号已在步骤 2.5 中处理（转为转义引号 \"）
  cleaned = cleaned
    // 其他中文标点
    .replace(/，/g, ',')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/？/g, '?')
    .replace(/！/g, '!')
    // 中文括号 - 转换为ASCII括号，便于JSON解析
    .replace(/（/g, '(').replace(/）/g, ')')
    // 中文方括号 - 转换为ASCII方括号
    .replace(/【/g, '[').replace(/】/g, ']');

  // 诊断日志：检查清理后的内容
  console.log('[cleanAIResponse] 清理后长度:', cleaned.length);
  const cleanedPreview = cleaned.substring(0, Math.min(300, cleaned.length));
  console.log('[cleanAIResponse] 清理后前300字符:', cleanedPreview);

  // 诊断：检测前200字符中的所有引号位置和上下文
  console.log('[cleanAIResponse] 前200字符中的引号位置分析:');
  let quoteCount = 0;
  for (let i = 0; i < Math.min(200, cleaned.length); i++) {
    const charCode = cleaned.charCodeAt(i);
    if (charCode === 34) {  // ASCII 双引号
      quoteCount++;
      const contextStart = Math.max(0, i - 15);
      const contextEnd = Math.min(cleaned.length, i + 15);
      const context = cleaned.substring(contextStart, contextEnd);
      console.log(`  Position ${i}: "${context.replace(/\n/g, '\\n')}"`);
    }
  }
  console.log('[cleanAIResponse] 总引号数:', quoteCount);

  return cleaned;
}

/**
 * 安全地解析 AI 返回的 JSON
 * 尝试多种策略来解析可能包含问题的 JSON
 */
export function safeParseJSON(jsonString: string, maxAttempts = 7): any {
  // 诊断日志：输入字符串分析
  console.log('[safeParseJSON] 输入字符串长度:', jsonString.length);

  // 检测前100字符中可能的问题模式
  let suspiciousPatterns = 0;
  const preview = jsonString.substring(0, Math.min(100, jsonString.length));
  console.log('[safeParseJSON] 前100字符预览:', preview);

  // 检测连续的引号（可能表示未转义）
  const consecutiveQuotes = preview.match(/"[^"]{0,10}"/g);
  if (consecutiveQuotes && consecutiveQuotes.length > 2) {
    console.log('[safeParseJSON] 警告：检测到多个连续的引号模式，可能存在未转义的引号');
    suspiciousPatterns++;
  }

  const attempts: Array<{ name: string; transform: (s: string) => string }> = [
    {
      name: '直接解析',
      transform: (s) => s,
    },
    {
      name: '再次替换中文标点（正则）',
      transform: (s) => {
        let result = s;
        // 使用正则全局替换所有中文标点
        result = result.replace(/[\u201C\u201D\uFF02\u201E\u201F\u2033\u2036]/g, '\\"'); // 各种中文引号
        result = result.replace(/[\u2018\u2019\uFF07]/g, "'"); // 各种中文单引号
        result = result.replace(/，/g, ',');
        result = result.replace(/：/g, ':');
        result = result.replace(/；/g, ';');
        result = result.replace(/？/g, '?');
        result = result.replace(/！/g, '!');
        result = result.replace(/（/g, '(').replace(/）/g, ')');
        // 移除【】的替换 - 它们在 JSON 字符串值内部是合法的
        return result;
      },
    },
    {
      name: '修复未转义的引号（增强版 - 多层检测）',
      transform: (s) => {
        console.log('[fixUnescapedQuotes] 开始处理...');

        const result: string[] = [];
        let inString = false;
        let escapeNext = false;
        let fixCount = 0;
        let braceDepth = 0;
        let bracketDepth = 0;

        // 辅助函数：查找下一个非空白字符
        const findNextNonWhitespace = (str: string, startIdx: number): { char: string, idx: number } => {
          let idx = startIdx;
          while (idx < str.length && /\s/.test(str[idx])) {
            idx++;
          }
          return { char: idx < str.length ? str[idx] : '', idx };
        };

        // 辅助函数：向后查找匹配的开引号，检查是否应该转义当前引号
        const shouldEscapeQuote = (str: string, pos: number): boolean => {
          let quoteDepth = 1; // 当前引号
          for (let i = pos - 1; i >= 0; i--) {
            const c = str[i];
            // 跳过转义字符
            if (c === '\\' && i > 0 && str[i - 1] !== '\\') {
              i--;
              continue;
            }
            if (c === '"') {
              quoteDepth--;
              if (quoteDepth === 0) {
                // 找到开引号，检查它是否在字符串值位置
                let prev = i - 1;
                while (prev >= 0 && /\s/.test(str[prev])) prev--;
                // 如果开引号前是 : 或 { 或 ,，说明这是字符串值的开始
                if (prev >= 0 && (str[prev] === ':' || str[prev] === '{' || str[prev] === ',')) {
                  return false; // 这是字符串值的结束标记，不需要转义
                }
                return true; // 内部引号，需要转义
              }
            }
          }
          return true; // 没找到开引号，需要转义
        };

        for (let i = 0; i < s.length; i++) {
          const c = s[i];

          if (escapeNext) {
            result.push(c);
            escapeNext = false;
            continue;
          }

          if (c === '\\') {
            result.push(c);
            escapeNext = true;
            continue;
          }

          // 跟踪JSON结构深度（不在字符串内时）
          if (!inString) {
            if (c === '{') braceDepth++;
            else if (c === '}') braceDepth--;
            else if (c === '[') bracketDepth++;
            else if (c === ']') bracketDepth--;
          }

          if (c === '"') {
            if (!inString) {
              // 进入字符串
              inString = true;
              result.push(c);
            } else {
              // 可能是字符串结束或内部引号
              const next = findNextNonWhitespace(s, i + 1);
              const nextChar = next.char;

              // 使用向后查找检查是否应该转义
              const isInternalQuote = shouldEscapeQuote(s, i);

              // 强结束标记：后面是 } ， ] ， ， 或空
              const isStrongEndMarker = nextChar === '}' || nextChar === ']' || nextChar === ',' || nextChar === '';

              // 弱结束标记：后面是 : （可能在对象键中）
              const isWeakEndMarker = nextChar === ':';

              if (isStrongEndMarker && !isInternalQuote) {
                // 确认是字符串结束
                inString = false;
                result.push(c);
              } else if (isWeakEndMarker && braceDepth > 0 && !isInternalQuote) {
                // 在对象内，后面是 : ，可能是键的结束
                // 需要进一步判断：检查前一个非空白字符
                let prevIdx = i - 1;
                while (prevIdx >= 0 && /\s/.test(s[prevIdx])) prevIdx--;

                if (prevIdx >= 0 && (s[prevIdx] === '{' || s[prevIdx] === ',')) {
                  // 在 { 或 , 之后，这是键的结束
                  inString = false;
                  result.push(c);
                } else {
                  // 其他情况，可能是内部引号，需要转义
                  result.push('\\"');
                  fixCount++;
                }
              } else {
                // 不是明显的结束标记，或检测为内部引号，需要转义
                result.push('\\"');
                fixCount++;
              }
            }
            continue;
          }

          result.push(c);
        }

        console.log(`[fixUnescapedQuotes] 处理完成，共修复 ${fixCount} 个未转义引号`);

        // 验证修复后的JSON是否有效
        const fixed = result.join('');
        try {
          JSON.parse(fixed);
          console.log('[fixUnescapedQuotes] ✅ 修复后的JSON有效');
          return fixed;
        } catch (error) {
          console.warn('[fixUnescapedQuotes] ⚠️ 修复后的JSON仍然无效，回退到原始输入');
          return s;
        }
      },
    },
    {
      name: '移除所有不可见字符',
      transform: (s) => {
        // 移除可能存在的零宽字符、BOM等
        let result = s.replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '');
        // 再替换中文标点
        result = result.replace(/[\u201C\u201D\uFF02\u201E\u201F\u2033\u2036]/g, '\\"');
        result = result.replace(/[\u2018\u2019\uFF07]/g, "'");
        result = result.replace(/，/g, ',');
        result = result.replace(/：/g, ':');
        return result;
      },
    },
    {
      name: '截取到第一个完整对象',
      transform: (s) => {
        // 尝试找到第一个完整的 JSON 对象
        let result = s;
        const firstBrace = result.indexOf('{');
        if (firstBrace === -1) return result;

        let depth = 0;
        let inString = false;
        let escapeNext = false;
        for (let i = firstBrace; i < result.length; i++) {
          const c = result[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (c === '\\') {
            escapeNext = true;
            continue;
          }
          // 处理各种引号
          const isQuote = c === '"';
          if (isQuote) {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (c === '{') depth++;
            else if (c === '}') {
              depth--;
              if (depth === 0) {
                return result.substring(firstBrace, i + 1);
              }
            }
          }
        }
        return result;
      },
    },
    {
      name: '强制修复常见错误',
      transform: (s) => {
        let result = s;
        // 移除末尾的逗号（{ "a": 1, } -> { "a": 1 }）
        result = result.replace(/,\s*([}\]])/g, '$1');
        // 修复未引用的键（{ a: 1 } -> { "a": 1 }）
        result = result.replace(/([{]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
        // 替换中文标点
        result = result.replace(/[\u201C\u201D\uFF02]/g, '\\"');
        result = result.replace(/，/g, ',');
        return result;
      },
    },
    {
      name: '智能补全截断的JSON',
      transform: (s) => {
        let result = s.trim();
        const firstBrace = result.indexOf('{');
        if (firstBrace === -1) return result;

        // 统计括号和引号
        let openBraces = 0;
        let openBrackets = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = firstBrace; i < result.length; i++) {
          const c = result[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (c === '\\') {
            escapeNext = true;
            continue;
          }
          const isQuote = c === '"';
          if (isQuote) {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (c === '{') openBraces++;
            else if (c === '}') openBraces--;
            else if (c === '[') openBrackets++;
            else if (c === ']') openBrackets--;
          }
        }

        // 补全缺失的括号
        while (openBrackets > 0) {
          result += ']';
          openBrackets--;
        }
        while (openBraces > 0) {
          result += '}';
          openBraces--;
        }

        // 如果在字符串中截断，尝试关闭字符串
        if (inString) {
          result += '"';
        }

        return result;
      },
    },
    {
      name: '提取部分有效数据',
      transform: (s) => {
        // 当JSON被严重截断时，尝试提取可用的部分数据
        let result = s.trim();
        const firstBrace = result.indexOf('{');
        if (firstBrace === -1) return result;

        // 找到最后一个完整的键值对
        let depth = 0;
        let inString = false;
        let escapeNext = false;
        let lastCompletePos = firstBrace;

        for (let i = firstBrace; i < result.length; i++) {
          const c = result[i];
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (c === '\\') {
            escapeNext = true;
            continue;
          }
          const isQuote = c === '"';
          if (isQuote) {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (c === '{') {
              depth++;
              lastCompletePos = i; // 记录这个位置作为可能的有效截止点
            } else if (c === '}') {
              depth--;
              if (depth >= 0) {
                lastCompletePos = i + 1; // 记录完整对象的位置
              }
              if (depth === 0) {
                // 找到完整对象，返回
                return result.substring(firstBrace, i + 1);
              }
            } else if (c === ',') {
              // 记录逗号位置，可能是一个完整的键值对结束
              lastCompletePos = i;
            }
          }
        }

        // 如果没找到完整对象，返回到上一个可能有效的位置
        if (lastCompletePos > firstBrace) {
          let partial = result.substring(firstBrace, lastCompletePos);
          // 补全括号
          let openBraces = 0;
          let inStr = false;
          for (let i = 0; i < partial.length; i++) {
            const c = partial[i];
            if (c === '\\') { i++; continue; }
            const isQuote = c === '"';
            if (isQuote) { inStr = !inStr; continue; }
            if (!inStr && c === '{') openBraces++;
          }
          // 移除末尾的逗号或无效字符
          partial = partial.replace(/[,]\s*$/, '');
          // 补全右括号
          while (openBraces > 0) {
            partial += '}';
            openBraces--;
          }
          return partial;
        }

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
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`[safeParseJSON] ❌ 尝试 ${i + 1} (${attempt.name}) 失败:`, errorMsg);

      // 第一次失败时，添加详细的诊断信息
      if (i === 0) {
        console.log('[safeParseJSON] === 诊断信息 ===');
        console.log('[safeParseJSON] 输入总长度:', jsonString.length, '字符');

        // 策略1: 标准格式 - 提取 position
        const positionMatch = errorMsg.match(/position (\d+)/);
        if (positionMatch) {
          const errorPos = parseInt(positionMatch[1]);
          const contextStart = Math.max(0, errorPos - 30);
          const contextEnd = Math.min(jsonString.length, errorPos + 30);
          const errorContext = jsonString.substring(contextStart, contextEnd);
          console.log(`[safeParseJSON] ✅ 标准格式 - 错误位置 ${errorPos} 上下文:`, errorContext);
          console.log(`[safeParseJSON] 错误位置的字符:`, jsonString.charAt(errorPos), `(code: ${jsonString.charCodeAt(errorPos)})`);
        } else {
          // 策略2: 非标准格式 - 通过 token 搜索定位
          console.log(`[safeParseJSON] ⚠️ 非标准错误格式，无法直接获取 position`);
          console.log(`[safeParseJSON] 原始错误信息:`, errorMsg);

          const tokenMatch = errorMsg.match(/Unexpected token '(.+?)'/);
          if (tokenMatch) {
            const errorToken = tokenMatch[1];
            console.log(`[safeParseJSON] 错误字符: '${errorToken}' (Unicode: U+${errorToken.charCodeAt(0).toString(16).toUpperCase()})`);

            // 搜索所有出现位置
            const positions: number[] = [];
            let pos = jsonString.indexOf(errorToken);
            while (pos !== -1) {
              positions.push(pos);
              pos = jsonString.indexOf(errorToken, pos + 1);
            }

            console.log(`[safeParseJSON] 字符 '${errorToken}' 在输入中出现 ${positions.length} 次，位置:`, positions.join(', '));

            // 显示每个位置的上下文（最多前5个）
            positions.slice(0, 5).forEach((pos, idx) => {
              const contextStart = Math.max(0, pos - 40);
              const contextEnd = Math.min(jsonString.length, pos + 40);
              const context = jsonString.substring(contextStart, contextEnd);
              console.log(`[safeParseJSON] 位置 ${pos} 的上下文 #${idx + 1}:`, context);
            });

            if (positions.length > 5) {
              console.log(`[safeParseJSON] ... 还有 ${positions.length - 5} 个位置未显示`);
            }
          }

          // 策略3: 通过内容片段定位
          const snippetMatch = errorMsg.match(/"(.{15,80})"/);
          if (snippetMatch) {
            const snippet = snippetMatch[1];
            const snippetPos = jsonString.indexOf(snippet);
            if (snippetPos !== -1) {
              console.log(`[safeParseJSON] 通过内容片段定位到位置: ${snippetPos}`);
              const contextStart = Math.max(0, snippetPos - 40);
              const contextEnd = Math.min(jsonString.length, snippetPos + snippet.length + 40);
              console.log(`[safeParseJSON] 片段上下文:`, jsonString.substring(contextStart, contextEnd));
            }
          }
        }
        console.log('[safeParseJSON] === 诊断结束 ===');
      }

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
    aiConfig?: string | null,
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

    // 4. 格式化断更期描述（旧格式，兼容）
    const gapPeriods = metrics.publishFrequency.gapPeriods?.map(p =>
      `${formatDateCN(p.start)} 至 ${formatDateCN(p.end)}（${p.days}天）`
    ).join('；') || '';

    // 4.5 格式化断更期列表（新格式）
    const gapPeriodsList = metrics.publishFrequency.gapPeriods?.map(p => ({
      start: formatDateCN(p.start),
      end: formatDateCN(p.end),
      days: p.days,
    }));

    // 5. 准备月度数据摘要，供 AI 分析阶段
    const monthlyDataSummary = monthlyData
      .map(m => `${m.month}: ${m.videoCount}条视频, 平均${Math.round(m.avgEngagement).toLocaleString()}互动`)
      .join('\n');

    // 6. 调用 AI（使用50条标题）
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
      monthly_data_summary: monthlyDataSummary, // 新增：月度数据摘要
    });

    const result = await this.callAI(prompt, aiConfig, 180000, 16000); // 3分钟，16000 tokens
    const aiAnalysis = safeParseJSON(cleanAIResponse(result));

    // 7. 合并程序计算的数据和 AI 分析结果
    return {
      nickname: accountName || '未知账号',
      ...aiAnalysis,
      dateRange: {
        start: metrics.dateRange.start,
        end: metrics.dateRange.end,
        stages: stages,
        // stageDetails 由 AI 分析提供（如果 AI 返回了）
        stageDetails: (aiAnalysis as any).stageDetails,
      },
      totalVideos: {
        count: metrics.totalVideos,
      },
      publishFrequency: {
        perWeek: metrics.publishFrequency.perWeek,
        hasGap: metrics.publishFrequency.hasGap,
        gapPeriods: gapPeriods || undefined,
        gapPeriodsList: gapPeriodsList,
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
   * 采用分开生成策略：
   * - 第一次调用：生成基础分析（summary, stages, peakMonths, viralThemes, explosivePeriods基础信息）
   * - 第二次调用：为每个 explosivePeriod 生成 topVideos
   */
  async analyzeMonthlyTrend(
    monthlyData: MonthlyData[],
    virals: ViralVideo[],
    aiConfig?: string | null,
    fileName?: string,
    totalVideos?: number
  ): Promise<{
    summary: string;
    dataScopeNote?: string;
    stages: Array<{ type: string; period: string; description: string }>;
    peakMonths?: Array<{
      month: string;
      description: string;
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
    viralThemes?: {
      hasThemes: boolean;
      themes?: Array<{
        themeType: string;
        representativeTitle: string;
        description: string;
      }>;
      reason?: string;
    };
    explosivePeriods?: Array<{
      periodName: string;
      period: string;
      explanation: string;
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
  }> {
    // 1. 格式化月度数据摘要
    const monthlySummary = monthlyData.map(m =>
      `${m.month}: 视频${m.videoCount}条, 平均互动${Math.round(m.avgEngagement).toLocaleString()}`
    ).join('\n');

    // 2. 格式化月度详细数据表格
    const monthlyTable = monthlyData.map(m => {
      const dateParts = m.month.split('-');
      const year = dateParts[0];
      const month = dateParts[1];
      return `${year}/${month} | ${m.videoCount}条 | ${Math.round(m.avgEngagement).toLocaleString()} | ${Math.round(m.p90).toLocaleString()} | ${Math.round(m.median).toLocaleString()} | ${Math.round(m.threshold).toLocaleString()}`;
    }).join('\n');

    // 3. 格式化爆款视频详细信息
    const viralDetail = virals.map(v => {
      const saveRate = v.totalEngagement > 0 ? (v.saves / v.totalEngagement * 100) : 0;
      const date = new Date(v.publishTime);
      const publishTime = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      return `${publishTime} | ${v.title} | 👍${v.likes.toLocaleString()} | 💬${v.comments.toLocaleString()} | ⭐${v.saves.toLocaleString()} | 🔁${v.shares.toLocaleString()} | 👉${v.totalEngagement.toLocaleString()} | 收藏率${saveRate.toFixed(2)}%`;
    }).join('\n');

    // 4. 第一次 AI 调用：生成基础分析（不含 explosivePeriods 的 topVideos）
    console.log('[analyzeMonthlyTrend] 第一次 AI 调用：生成基础分析...');
    const prompt1 = promptEngine.render('monthly_trend', {
      file_name: fileName || '未知文件',
      total_videos: totalVideos || virals.length,
      monthly_data_summary: monthlySummary,
      monthly_data_table: monthlyTable,
      viral_videos_detail: viralDetail,
    });

    const result1 = await this.callAI(prompt1, aiConfig, 240000, 16000); // 4分钟，16000 tokens（为 Vercel 留出 60s 缓冲）
    const baseAnalysis = safeParseJSON(cleanAIResponse(result1));
    console.log('[analyzeMonthlyTrend] 基础分析完成，explosivePeriods数量:', baseAnalysis.explosivePeriods?.length || 0);

    // 5. 第二次 AI 调用：为 explosivePeriods 生成 topVideos（如果有）
    let explosivePeriodsWithVideos: Array<{
      periodName: string;
      period: string;
      explanation: string;
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
    }> = [];

    if (baseAnalysis.explosivePeriods && baseAnalysis.explosivePeriods.length > 0) {
      console.log('[analyzeMonthlyTrend] 第二次 AI 调用：生成爆发期视频详情...');

      // 格式化爆发期列表
      const explosivePeriodsText = (baseAnalysis.explosivePeriods as Array<{
        periodName: string;
        period: string;
        explanation: string;
      }>).map((p: { periodName: string; period: string; explanation: string }) =>
        `- ${p.periodName}（${p.period}）：${p.explanation}`
      ).join('\n');

      // 构建时间范围映射表（帮助 AI 匹配视频到时期）
      const timeRangeMapping = this.buildTimeRangeMapping(baseAnalysis.explosivePeriods as Array<{
        periodName: string;
        period: string;
        explanation: string;
      }>, virals);

      // 调用第二次 AI
      const prompt2 = promptEngine.render('explosive_periods_detail', {
        explosive_periods: explosivePeriodsText,
        all_viral_videos: viralDetail,
        time_range_mapping: timeRangeMapping,
      });

      const result2 = await this.callAI(prompt2, aiConfig, 240000, 16000); // 4分钟，16000 tokens（为 Vercel 留出 60s 缓冲）
      const detailAnalysis = safeParseJSON(cleanAIResponse(result2));

      // 合并结果：将 topVideos 合并到对应的 explosivePeriod
      if (detailAnalysis.periodsWithVideos && detailAnalysis.periodsWithVideos.length > 0) {
        explosivePeriodsWithVideos = (baseAnalysis.explosivePeriods as Array<{
          periodName: string;
          period: string;
          explanation: string;
        }>).map((ep: { periodName: string; period: string; explanation: string }) => {
          const matchedDetail = (detailAnalysis.periodsWithVideos as Array<{
            periodName: string;
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
          }>).find((pv: { periodName: string }) => pv.periodName === ep.periodName);
          return {
            ...ep,
            topVideos: matchedDetail?.topVideos || [],
          };
        });
        console.log('[analyzeMonthlyTrend] 爆发期视频详情生成完成');
      } else {
        // 如果第二次调用失败，返回空的 topVideos
        explosivePeriodsWithVideos = (baseAnalysis.explosivePeriods as Array<{
          periodName: string;
          period: string;
          explanation: string;
        }>).map((ep: { periodName: string; period: string; explanation: string }) => ({
          ...ep,
          topVideos: [],
        }));
        console.warn('[analyzeMonthlyTrend] 爆发期视频详情生成失败，返回空列表');
      }
    }

    // 6. 返回完整结果
    return {
      ...baseAnalysis,
      explosivePeriods: explosivePeriodsWithVideos,
    };
  }

  /**
   * 构建时间范围映射表
   * 帮助 AI 将视频匹配到对应的爆发期
   */
  private buildTimeRangeMapping(
    explosivePeriods: Array<{ periodName: string; period: string; explanation: string }>,
    virals: ViralVideo[]
  ): string {
    // 为每个爆发期提取对应的视频时间范围
    const mapping: string[] = [];

    for (const ep of explosivePeriods) {
      // 尝试从 period 字段解析时间范围
      // 例如："2021年8月" -> 需要匹配 2021-08 的视频
      const periodMatch = ep.period.match(/(\d{4})年(\d{1,2})月/);
      if (periodMatch) {
        const year = periodMatch[1];
        const month = periodMatch[2].padStart(2, '0');
        const monthPrefix = `${year}-${month}`;

        // 找出该时期的视频数量
        const videosInPeriod = virals.filter(v => {
          const date = new Date(v.publishTime);
          const videoMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          return videoMonth === monthPrefix;
        });

        mapping.push(`${ep.periodName}（${ep.period}）：该时期有 ${videosInPeriod.length} 条爆款视频`);
      }
    }

    return mapping.join('\n') || '无法自动映射时间范围';
  }

  /**
   * 步骤4-1：分析爆款视频 - 主分析
   * 执行第一次 AI 调用：生成数据口径、逐月清单、分类总览、共性机制
   */
  async analyzeViralVideosMain(
    virals: ViralVideo[],
    threshold: number,
    monthlyData: MonthlyData[],
    aiConfig?: string | null,
    fileName?: string,
    totalVideos?: number
  ): Promise<{
    summary: string;
    total: number;
    threshold: number;
    dataScopeNote?: string;
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
    byCategory?: Array<{
      category: string;
      count: number;
      medianEngagement: number;
      medianSaveRate: number;
      p90SaveRate: number;
      description: string;
    }>;
    commonMechanisms?: {
      hasCategories: boolean;
      mechanisms?: Array<{
        pattern: string;
        evidence: string[];
      }>;
      reason?: string;
    };
  }> {
    console.log('[analyzeViralVideosMain] 第一次 AI 调用：主分析...');

    // 1. 格式化逐月数据摘要
    const monthlySummary = this.formatViralMonthlySummary(virals, monthlyData);

    // 2. 格式化爆款视频详细信息
    const viralDetail = virals.map(v => {
      const saveRate = v.totalEngagement > 0 ? (v.saves / v.totalEngagement * 100) : 0;
      const date = new Date(v.publishTime);
      const publishTime = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      return `${publishTime} | ${v.title} | 👍${v.likes.toLocaleString()} | 💬${v.comments.toLocaleString()} | ⭐${v.saves.toLocaleString()} | 🔁${v.shares.toLocaleString()} | 👉${v.totalEngagement.toLocaleString()} | 收藏率${saveRate.toFixed(2)}%`;
    }).join('\n');

    // 3. 第一次 AI 调用：主分析
    const prompt1 = promptEngine.render('viral_analysis', {
      total_virals: virals.length,
      threshold: Math.round(threshold).toString(),
      monthly_summary: monthlySummary,
      viral_videos_detail: viralDetail,
    });

    const result1 = await this.callAI(prompt1, aiConfig, 240000, 16000); // 4分钟，16000 tokens（为 Vercel 留出 60s 缓冲）
    const mainAnalysis = safeParseJSON(cleanAIResponse(result1));
    console.log('[analyzeViralVideosMain] 主分析完成');

    // 4. 返回主分析结果
    return {
      summary: mainAnalysis.summary || '',
      total: virals.length,
      threshold: threshold,
      dataScopeNote: mainAnalysis.dataScopeNote,
      monthlyList: mainAnalysis.monthlyList,
      byCategory: mainAnalysis.byCategory,
      commonMechanisms: mainAnalysis.commonMechanisms,
    };
  }

  /**
   * 步骤4-2：分析爆款视频 - 方法论抽象
   * 执行第二次 AI 调用：生成方法论（母题、公式、选题库）
   * 需要主分析的结果作为输入
   */
  async analyzeViralVideosMethodology(
    virals: ViralVideo[],
    mainAnalysis: {
      byCategory?: Array<{
        category: string;
        count: number;
        medianEngagement: number;
        medianSaveRate: number;
        p90SaveRate: number;
        description: string;
      }>;
    },
    aiConfig?: string
  ): Promise<{
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
  }> {
    console.log('[analyzeViralVideosMethodology] 第二次 AI 调用：方法论抽象...');

    // 1. 格式化分类摘要
    const categorySummary = this.formatCategorySummary(mainAnalysis.byCategory);

    // 2. 格式化爆款标题+发布时间
    const viralTitlesWithTime = this.formatViralTitlesWithTime(virals);

    // 3. 格式化爆款样本（取前20条）
    const viralSamples = this.formatViralSamples(virals, 20);

    // 4. 第二次 AI 调用：方法论抽象
    const prompt2 = promptEngine.render('viral_analysis_methodology', {
      category_summary: categorySummary,
      viral_titles_with_time: viralTitlesWithTime,
      viral_samples: viralSamples,
    });

    const result2 = await this.callAI(prompt2, aiConfig, 240000, 16000); // 4分钟，16000 tokens（为 Vercel 留出 60s 缓冲）
    const methodology = safeParseJSON(cleanAIResponse(result2));
    console.log('[analyzeViralVideosMethodology] 方法论抽象完成');

    // 5. 返回方法论结果
    return { methodology };
  }

  /**
   * 步骤4-1（新版）：数据分组与口径说明
   * 生成数据口径说明（P90/MAD解释）和月度分组信息
   * 这是三阶段拆分方案的第一步
   */
  async analyzeViralDataScope(
    virals: ViralVideo[],
    monthlyData: MonthlyData[],
    threshold: number,
    aiConfig?: string | null,
    fileName?: string,
    totalVideos?: number
  ): Promise<{
    summary: string;
    dataScopeNote: string;
    monthlyList: Array<{
      month: string;
      threshold: number;
      viralCount: number;
    }>;
  }> {
    console.log('[analyzeViralDataScope] 步骤4-1：数据分组与口径说明...');

    // 1. 从 virals 中统计每月的爆款数量
    const monthlyViralCount = new Map<string, number>();
    for (const v of virals) {
      const date = new Date(v.publishTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyViralCount.set(monthKey, (monthlyViralCount.get(monthKey) || 0) + 1);
    }

    // 2. 从 monthlyData 中提取必要信息，并合并爆款数量
    const monthlySummary = monthlyData.map(m => {
      const date = new Date(m.month);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const viralCount = monthlyViralCount.get(monthKey) || 0;
      const monthStr = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      return `${monthStr}：${viralCount}条爆款，阈值=${Math.round(m.threshold || 0).toLocaleString()}`;
    }).join('\n');

    // 3. 计算总爆款数
    const totalVirals = virals.length;

    // 4. AI 调用：生成数据口径说明和月度分组
    const prompt = promptEngine.render('viral_analysis_data_scope', {
      file_name: fileName || '未知文件',
      total_videos: totalVideos || totalVirals,
      total_virals: totalVirals,
      threshold: Math.round(threshold).toString(),
      monthly_summary: monthlySummary,
    });

    const result = await this.callAI(prompt, aiConfig, 240000, 16000); // 4分钟，16000 tokens
    const dataScope = safeParseJSON(cleanAIResponse(result));
    console.log('[analyzeViralDataScope] 数据分组与口径说明完成');

    // 5. 返回结果
    return {
      summary: dataScope.summary || '',
      dataScopeNote: dataScope.dataScopeNote || '',
      monthlyList: dataScope.monthlyList || [],
    };
  }

  /**
   * 步骤4-2（新版）：爆款分类分析
   * 只返回分类结果，不返回视频列表（避免响应过长）
   * monthlyList在代码中从原始数据构建
   */
  async analyzeViralClassification(
    virals: ViralVideo[],
    monthlyData: MonthlyData[],
    aiConfig?: string
  ): Promise<{
    byCategory: Array<{
      category: string;
      count: number;
      medianEngagement: number;
      medianSaveRate: number;
      p90SaveRate: number;
      description: string;
    }>;
    commonMechanisms: {
      hasCategories: boolean;
      mechanisms: Array<{
        pattern: string;
        evidence: string[];
      }> | null;
      reason: string | null;
    };
  }> {
    console.log('[analyzeViralClassification] 步骤4-2：爆款分类分析...');

    // 1. 格式化爆款视频详细信息（完整数据，不采样）
    // 紧凑格式：月/日 时:分 标题 L点赞 C评论 S收藏 Sh分享 E互动 R收藏率
    // 压缩优化：去除年份、分隔符、emoji、千分位，减少48%长度
    const viralDetail = virals.map(v => {
      const saveRate = v.totalEngagement > 0 ? (v.saves / v.totalEngagement * 100) : 0;
      const date = new Date(v.publishTime);
      const publishTime = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      return `${publishTime} ${v.title} L${v.likes} C${v.comments} S${v.saves} Sh${v.shares} E${v.totalEngagement} R${saveRate.toFixed(2)}`;
    }).join('\n');

    console.log(`[analyzeViralClassification] 处理 ${virals.length} 条爆款视频`);

    // 2. AI 调用：分类分析（只返回分类结果，不返回视频列表）
    const prompt = promptEngine.render('viral_analysis_classification', {
      viral_videos_detail: viralDetail,
    });

    const result = await this.callAI(prompt, aiConfig, 240000, 16000); // 4分钟，16000 tokens
    const classification = safeParseJSON(cleanAIResponse(result));
    console.log('[analyzeViralClassification] 爆款分类分析完成');

    // 3. 返回结果
    return {
      byCategory: classification.byCategory || [],
      commonMechanisms: classification.commonMechanisms || {
        hasCategories: false,
        mechanisms: null,
        reason: null,
      },
    };
  }

  /**
   * 辅助函数：从原始爆款数据构建monthlyList
   * 在步骤4-2调用后在pipeline中使用
   */
  private buildMonthlyListFromVirals(
    virals: ViralVideo[],
    monthlyData: MonthlyData[]
  ): Array<{
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
  }> {
    // 按月分组视频
    const monthlyVideos = new Map<string, typeof virals>();
    for (const v of virals) {
      const date = new Date(v.publishTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthlyVideos.has(monthKey)) {
        monthlyVideos.set(monthKey, []);
      }
      monthlyVideos.get(monthKey)!.push(v);
    }

    // 构建monthlyList
    const monthlyList: Array<{
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
    }> = [];

    for (const [monthKey, videos] of monthlyVideos) {
      const date = new Date(monthKey + '-01');
      const monthStr = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      const threshold = monthlyData.find(m => {
        const mDate = new Date(m.month);
        const mKey = `${mDate.getFullYear()}-${(mDate.getMonth() + 1).toString().padStart(2, '0')}`;
        return mKey === monthKey;
      })?.threshold || 0;

      // 格式化视频数据
      const formattedVideos = videos.map(v => {
        const saveRate = v.totalEngagement > 0 ? (v.saves / v.totalEngagement * 100) : 0;
        const vDate = new Date(v.publishTime);
        const publishTime = `${vDate.getFullYear()}/${vDate.getMonth() + 1}/${vDate.getDate()} ${vDate.getHours().toString().padStart(2, '0')}:${vDate.getMinutes().toString().padStart(2, '0')}`;
        return {
          publishTime,
          title: v.title,
          likes: v.likes,
          comments: v.comments,
          saves: v.saves,
          shares: v.shares,
          totalEngagement: v.totalEngagement,
          saveRate: Number(saveRate.toFixed(2)),
        };
      });

      // Top10标题（按互动量排序）
      const top10Titles = videos
        .sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 10)
        .map(v => v.title);

      monthlyList.push({
        month: monthStr,
        threshold,
        videos: formattedVideos,
        top10Titles,
      });
    }

    // 按月份排序
    return monthlyList.sort((a, b) => {
      const dateA = new Date(a.month.replace('年', '-').replace('月', '-01'));
      const dateB = new Date(b.month.replace('年', '-').replace('月', '-01'));
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * 步骤3：分析爆款视频分类（完整版本，保留兼容性）
   * 采用分开生成策略：
   * - 第一次调用：主分析（数据口径、逐月清单、分类总览、共性机制）
   * - 第二次调用：方法论抽象（母题、公式、选题库）
   */
  async analyzeViralVideos(
    virals: ViralVideo[],
    threshold: number,
    monthlyData: MonthlyData[],
    aiConfig?: string | null,
    fileName?: string,
    totalVideos?: number
  ): Promise<{
    summary: string;
    total: number;
    threshold: number;
    dataScopeNote?: string;
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
    byCategory?: Array<{
      category: string;
      count: number;
      medianEngagement: number;
      medianSaveRate: number;
      p90SaveRate: number;
      description: string;
    }>;
    commonMechanisms?: {
      hasCategories: boolean;
      mechanisms?: Array<{
        pattern: string;
        evidence: string[];
      }>;
      reason?: string;
    };
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
    topicLibrary?: Array<{
      id: number;
      publishTime: string;
      title: string;
      category: string;
      totalEngagement: number;
      saveRate: number;
      keyTakeaway: string;
    }>;
    patterns?: {
      commonElements?: string;
      timingPattern?: string;
      titlePattern?: string;
    };
  }> {
    console.log('[analyzeViralVideos] 第一次 AI 调用：主分析...');

    // 1. 格式化逐月数据摘要
    const monthlySummary = this.formatViralMonthlySummary(virals, monthlyData);

    // 2. 格式化爆款视频详细信息
    const viralDetail = virals.map(v => {
      const saveRate = v.totalEngagement > 0 ? (v.saves / v.totalEngagement * 100) : 0;
      const date = new Date(v.publishTime);
      const publishTime = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      return `${publishTime} | ${v.title} | 👍${v.likes.toLocaleString()} | 💬${v.comments.toLocaleString()} | ⭐${v.saves.toLocaleString()} | 🔁${v.shares.toLocaleString()} | 👉${v.totalEngagement.toLocaleString()} | 收藏率${saveRate.toFixed(2)}%`;
    }).join('\n');

    // 3. 第一次 AI 调用：主分析
    const prompt1 = promptEngine.render('viral_analysis', {
      total_virals: virals.length,
      threshold: Math.round(threshold).toString(),
      monthly_summary: monthlySummary,
      viral_videos_detail: viralDetail,
    });

    const result1 = await this.callAI(prompt1, aiConfig, 240000, 16000); // 4分钟，16000 tokens（为 Vercel 留出 60s 缓冲）
    const mainAnalysis = safeParseJSON(cleanAIResponse(result1));
    console.log('[analyzeViralVideos] 主分析完成');

    // 4. 第二次 AI 调用：方法论抽象
    console.log('[analyzeViralVideos] 第二次 AI 调用：方法论抽象...');

    const categorySummary = this.formatCategorySummary(mainAnalysis.byCategory);
    const viralTitlesWithTime = this.formatViralTitlesWithTime(virals);
    const viralSamples = this.formatViralSamples(virals, 20); // 取前20条作为样本

    const prompt2 = promptEngine.render('viral_analysis_methodology', {
      category_summary: categorySummary,
      viral_titles_with_time: viralTitlesWithTime,
      viral_samples: viralSamples,
    });

    const result2 = await this.callAI(prompt2, aiConfig, 240000, 16000); // 4分钟，16000 tokens（为 Vercel 留出 60s 缓冲）
    const methodology = safeParseJSON(cleanAIResponse(result2));
    console.log('[analyzeViralVideos] 方法论抽象完成');

    // 5. 生成爆款选题库（基础数据，后续可扩展）
    const topicLibrary = virals.map((v, idx) => {
      const saveRate = v.totalEngagement > 0 ? (v.saves / v.totalEngagement * 100) : 0;
      return {
        id: idx + 1,
        publishTime: new Date(v.publishTime).toLocaleString('zh-CN'),
        title: v.title,
        category: '', // TODO: 从 byCategory 推断分类
        totalEngagement: v.totalEngagement,
        saveRate: saveRate,
        keyTakeaway: '', // TODO: 可以从标题提取核心观点或后续AI提炼
      };
    });

    // 6. 返回完整结果
    return {
      summary: mainAnalysis.summary || '',
      total: virals.length,
      threshold: threshold,
      dataScopeNote: mainAnalysis.dataScopeNote,
      monthlyList: mainAnalysis.monthlyList,
      byCategory: mainAnalysis.byCategory,
      commonMechanisms: mainAnalysis.commonMechanisms,
      methodology,
      topicLibrary,
      patterns: mainAnalysis.patterns, // ✅ 添加 patterns 字段
    };
  }

  /**
   * 格式化逐月爆款数据摘要
   */
  private formatViralMonthlySummary(virals: ViralVideo[], monthlyData: MonthlyData[]): string {
    // 按月分组爆款视频
    const monthlyVirals = new Map<string, ViralVideo[]>();
    for (const v of virals) {
      const date = new Date(v.publishTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!monthlyVirals.has(monthKey)) {
        monthlyVirals.set(monthKey, []);
      }
      monthlyVirals.get(monthKey)!.push(v);
    }

    // 格式化输出
    const summary: string[] = [];
    for (const [month, videos] of Array.from(monthlyVirals.entries())) {
      const monthData = monthlyData.find(m => m.month === month);
      summary.push(`${month}：${videos.length}条爆款，阈值=${monthData?.threshold ? Math.round(monthData.threshold).toLocaleString() : 'N/A'}`);
    }
    return summary.join('\n');
  }

  /**
   * 格式化分类摘要
   */
  private formatCategorySummary(byCategory?: Array<{
    category: string;
    count: number;
    medianEngagement: number;
    medianSaveRate: number;
    p90SaveRate: number;
    description: string;
  }>): string {
    if (!byCategory || byCategory.length === 0) {
      return '无分类数据';
    }
    return byCategory.map(c =>
      `${c.category}：${c.count}条，互动中位数${Math.round(c.medianEngagement || 0).toLocaleString()}，收藏率中位数${(c.medianSaveRate || 0).toFixed(2)}%`
    ).join('\n');
  }

  /**
   * 格式化爆款标题+发布时间
   */
  private formatViralTitlesWithTime(virals: ViralVideo[]): string {
    return virals.map(v => {
      const date = new Date(v.publishTime);
      const hour = date.getHours();
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${hour}:00 | ${v.title}`;
    }).join('\n');
  }

  /**
   * 格式化爆款样本
   */
  private formatViralSamples(virals: ViralVideo[], count: number): string {
    return virals.slice(0, count).map(v =>
      `${v.title} | 互动${Math.round(v.totalEngagement).toLocaleString()} | 收藏率${((v.saves / v.totalEngagement) * 100).toFixed(2)}%`
    ).join('\n');
  }

  /**
   * 步骤4a：生成选题大纲（30条 id+category+titles）
   */
  async generateTopicOutline(
    account: AccountAnalysis,
    viralAnalysis: {
      byCategory: Array<{
        category: string;
        count: number;
        avgEngagement?: number;  // 旧格式兼容
        medianEngagement?: number; // 新格式
        description: string;
      }>;
      patterns: any;
    },
    aiConfig?: string
  ): Promise<TopicOutline[]> {
    console.log('[AIAnalysisService] ===== 开始生成选题大纲 =====');
    console.log('[AIAnalysisService] 账号类型:', account.accountType);
    console.log('[AIAnalysisService] 爆款分类数:', viralAnalysis.byCategory?.length || 0);

    // 格式化爆款分类（兼容新旧格式）
    const categoriesText = (viralAnalysis.byCategory || []).map(c => {
      const engagement = c.medianEngagement ?? c.avgEngagement ?? 0;
      return `${c.category}: ${c.count}条, 平均互动${Math.round(engagement)}\n描述：${c.description}`;
    }).join('\n\n');

    // 格式化爆款规律
    const patternsText = `共同元素：${viralAnalysis.patterns?.commonElements || '暂无'}\n发布时间规律：${viralAnalysis.patterns?.timingPattern || '暂无'}\n标题规律：${viralAnalysis.patterns?.titlePattern || '暂无'}`;

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
      console.log('[AIAnalysisService] 调用 AI，超时: 240秒（4分钟），最大 Tokens: 16000');
      const result = await this.callAI(prompt, aiConfig, 240000, 16000); // 4分钟，16000 tokens（为 Vercel 留出 60s 缓冲）

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
    viralAnalysis: { byCategory: Array<{ category: string; count: number; avgEngagement?: number; medianEngagement?: number; description: string }>; patterns: any },
    existingTopics: TopicOutline[],
    needCount: number
  ): string {
    const existingCategories = existingTopics.map(t => t.category).join('、');
    // 兼容新旧格式：medianEngagement 优先，fallback 到 avgEngagement
    const categoriesText = viralAnalysis.byCategory.map(c => {
      const engagement = c.medianEngagement ?? c.avgEngagement ?? 0;
      return `${c.category}: ${c.count}条, 平均互动${Math.round(engagement)}\n描述：${c.description}`;
    }).join('\n\n');

    return `你是专业的抖音内容策划师。请为以下账号补充生成 ${needCount} 条选题大纲。

【账号核心主题】
${account.coreTopics.join('、')}

【账号类型】
${account.accountType}

【目标受众】
${account.audience.description}

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
    aiConfig?: string | null,
    batchSize: number = 10
  ): Promise<FullTopic[]> {
    console.log('[Topics] 开始分批生成, 总数:', outlines.length, ', 每批:', batchSize);

    const allTopics: FullTopic[] = [];
    const batches = Math.ceil(outlines.length / batchSize);

    // 格式化爆款规律
    const patternsText = `共同元素：${viralPatterns?.commonElements || '暂无'}\n发布时间规律：${viralPatterns?.timingPattern || '暂无'}\n标题规律：${viralPatterns?.titlePattern || '暂无'}`;

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
        core_topic: account.coreTopics.join('、'),
        viral_patterns: patternsText,
        topic_outlines: outlinesText,
      });

      let result = '';
      try {
        // 每批超时 240 秒（4分钟），为 Vercel 留出缓冲时间
        result = await this.callAI(prompt, aiConfig, 240000, 16000); // 240秒，16000 tokens（为 Vercel 留出 60s 缓冲）

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
  private async callAI(prompt: string, aiConfig?: string | null, timeout: number = 180000, maxTokens: number = 8000, retries: number = 3): Promise<string> {
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
