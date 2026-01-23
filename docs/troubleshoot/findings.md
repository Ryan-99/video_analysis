# 调查发现记录

## 🔥 已解决问题汇总

### 问题 1: 类型不匹配 (2025-01-22 14:40) ✅ 已修复
- **问题**: `word.ts` 中访问了不存在的属性 `description`
- **修复**: 在 `types/index.ts` 中添加 `description: string` 字段

### 问题 2: JSON 解析错误 (2025-01-22 14:50) ✅ 已修复
- **问题**: AI 返回 markdown 格式 JSON
- **修复**: 添加 `cleanAIResponse()` 函数清理 markdown 标记

### 问题 3: TextRun 语法错误 (2025-01-22 15:00) ✅ 已修复
- **错误**: `Expected ',', got ')'` at word.ts:148
- **原因**: `TextRun()` 第二个参数格式错误
- **修复**: 统一使用 `{ text: value }` 格式

## ✅ 所有问题已解决 (2025-01-22 15:30)

### 修复汇总
| 问题 | 修复方式 | 状态 |
|------|----------|------|
| 类型不匹配 | 添加 `description` 字段到 Report 类型 | ✅ |
| JSON 解析错误 | 添加 `cleanAIResponse()` 函数 | ✅ |
| TextRun 语法错误 | 修正参数格式为 `{ text: value }` | ✅ |
| Next.js 构建缓存 | 清除 .next 目录后重新构建 | ✅ |
| Next.js 开发服务器缓存 | 清除 .next 目录并重启 dev server | ✅ |
| 构建测试 | npm run build 通过 | ✅ |

### 验证结果
- ✅ 所有 TypeScript 编译错误已解决
- ✅ 构建成功 (EXIT_CODE: 0)
- ⏳ 待验证: 完整分析流程和 Word 下载功能

### 问题 4: Next.js 缓存问题 (2025-01-22 15:15) ✅ 已修复
- **问题**: 构建错误显示旧代码，但文件内容已正确修复
- **原因**: `.next` 目录缓存了未修复的代码版本
- **修复**: 删除 `.next` 目录后重新构建
- **教训**: 修改代码后如果构建错误与文件内容不符，先清除缓存

### 问题 5: Next.js 开发服务器缓存损坏 (2025-01-22 15:30) ✅ 已修复
- **问题**: `Persisting failed: Unable to write SST file` 和 `ENOENT: build-manifest.json`
- **原因**: `.next` 目录状态损坏，SST 文件写入失败
- **修复**: 删除 `.next` 目录，重启 dev server
- **教训**: 遇到 SST/Persisting 错误，需要清除缓存并重启服务器

## 错误详情

### TextRun 正确用法

❌ 错误:
```typescript
new TextRun(virals.patterns.commonElements || '暂无')  // 直接传字符串
```

✅ 正确:
```typescript
new TextRun({ text: virals.patterns.commonElements || '暂无' })  // 使用 text 属性
```

---

## 代码修复记录

### src/types/index.ts ✅
- 添加 `description: string` 到 `byCategory` 类型

### src/lib/ai-analysis/service.ts ✅
- 添加 `cleanAIResponse()` 函数处理 markdown 代码块
- 更新所有 `JSON.parse()` 调用

### src/lib/report/word.ts ✅
- 修复 `TextRun` 参数格式
- 正确使用 `{ text: value }` 格式

---

## 待验证
1. ⏳ 重新运行分析任务
2. ⏳ 验证 Word 下载功能
3. ⏳ 验证完整报告生成

---

# 爆款选题库生成失败原因分析报告

**日期**: 2025-01-22
**分析范围**: `src/lib/ai-analysis/service.ts`、`src/config/prompts.json`、选题库生成流程
**问题描述**: 30条爆款选题库生成总是失败

---

## 一、两阶段生成流程实现 ✅

### 1.1 流程设计

代码中已正确实现两阶段分批生成流程：

**阶段1：选题大纲生成** (`generateTopicOutline`)
- 生成30条选题大纲（id + category + titles）
- 超时时间：180秒（3分钟）
- 最大Token：4000
- Prompt: `topic_outline_generation`

**阶段2：选题详情分批生成** (`generateTopicDetails`)
- 分3批处理，每批10条选题
- 为每条选题生成完整内容（script + storyboard + casePoint）
- 超时时间：180秒（3分钟）/批次
- 最大Token：8000/批次
- Prompt: `topic_detail_generation`
- 批次间延迟：1秒（避免API速率限制）

### 1.2 代码位置

**文件**: `d:\Claude Code\project\test1\src\lib\ai-analysis\service.ts`

- 行 131-162: `generateTopicOutline()` 方法
- 行 172-241: `generateTopicDetails()` 方法
- 行 244-282: `generateTopics()` 主方法

### 1.3 类型定义

```typescript
// TopicOutline 类型
export interface TopicOutline {
  id: number;
  category: string;
  titles: string[];
}

// FullTopic 类型
export interface FullTopic extends TopicOutline {
  script: string;
  storyboard: string[];
  casePoint?: string;
}
```

---

## 二、Prompt 模板分析 ✅

### 2.1 选题大纲生成 Prompt (`topic_outline_generation`)

**文件**: `d:\Claude Code\project\test1\src\config\prompts.json` (行 46-72)

**模板关键要点**:
- 生成6大类共30条选题大纲
- 每类5条
- 分类建议：原生家庭/创伤疗愈、情感关系/认知觉醒、婚姻择偶/女性智慧、影视剧/情感解读、穿搭变美/生活方式、房产财富/商业认知
- 要求必须生成完整的30条选题大纲
- 只返回JSON，不要任何解释或说明文字

**分析**: ✅ 模板内容清晰明确，强调了必须生成30条选题

### 2.2 选题详情生成 Prompt (`topic_detail_generation`)

**文件**: `d:\Claude Code\project\test1\src\config\prompts.json` (行 73-91)

**模板关键要点**:
- 为每条选题生成完整的5段式口播稿
- 口播稿150-200字，简洁有力
- 分镜说明清晰具体，4个镜头
- 案例点位真实可信
- 只返回JSON，不要任何解释或说明文字

**分析**: ✅ 模板内容详细，包含5段式口播稿结构和示例

---

## 三、潜在失败点分析

### 3.1 JSON 解析失败 ⚠️ **高概率**

**问题**: AI 返回可能包含 markdown 代码块标记

**已有解决方案**: `cleanAIResponse()` 函数
- 位置: `service.ts` 行 9-33
- 功能: 移除 markdown 代码块标记 (\`\`\`json 和 \`\`\`)

**风险**: 如果 AI 返回格式不是标准 markdown 代码块，清理函数可能无法处理

**示例风险场景**:
```
AI 返回：
这是我的分析结果：
```json
{
  "topics": [...]
}
```
以上是30条选题。
```

当前 `cleanAIResponse()` 只处理标准 markdown 块，无法处理前后有额外文字的情况。

### 3.2 AI 返回不完整的数据 ⚠️ **高概率**

**问题**: AI 可能返回不足 30 条选题

**当前处理**:
```typescript
// 行 154-157: 大纲生成失败返回空数组
catch (error) {
  console.error('[AIAnalysisService] 选题大纲生成失败:', error);
  return [];
}
```

**风险**: 如果阶段1（大纲生成）失败，整个选题库将为空数组，不会继续生成详情

### 3.3 Prompt 引擎变量替换问题 ⚠️ **中概率**

**问题**: 变量值可能包含特殊字符导致替换失败

**Prompt 引擎**: `d:\Claude Code\project\test1\src\lib\prompts\engine.ts`

```typescript
// 行 30-38: 变量替换实现
for (const [key, value] of Object.entries(variables)) {
  const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
  result = result.replace(regex, this.formatValue(value));
}
```

**风险场景**:
- 如果 `viral_categories` 或 `viral_patterns` 包含特殊正则表达式字符（如 `(`, `)`, `[`, `]`），可能导致替换失败
- `formatValue()` 对对象的 JSON.stringify 可能引入换行符，破坏 JSON 结构

### 3.4 API 调用超时 ⚠️ **中概率**

**当前超时设置**:
- 选题大纲: 180秒（3分钟）
- 选题详情: 180秒/批次（3分钟）

**风险**: 使用较慢的 AI 模型或网络问题时可能超时

### 3.5 AI Token 限制 ⚠️ **高概率**

**当前 Token 设置**:
- 选题大纲: 4000 tokens
- 选题详情: 8000 tokens

**风险**:
- 4000 tokens 可能不足以生成30条选题大纲（估算需要1500-2000 tokens输出，加上prompt）
- 8000 tokens 对于10条详细内容（每条约150-200字口播稿）可能紧张（估算需要3000-4000 tokens输出）

**估算**:
- 30条大纲 × (id + category + 3 titles) ≈ 1500-2000 tokens（输出）
- 10条详情 × (150字口播稿 + 分镜 + 案例点位) ≈ 3000-4000 tokens（输出）

### 3.6 数据类型不匹配 ⚠️ **中概率**

**问题**: `viralAnalysis.patterns` 可能为 undefined

**代码位置**: `pipeline.ts` 行 198-202
```typescript
const topics = await aiAnalysisService.generateTopics(
  accountAnalysis,
  viralAnalysis,  // 包含 patterns 字段
  task.aiConfig
);
```

**在 service.ts 中的使用**:
```typescript
// 行 142
const patternsText = `共同元素：${viralPatterns.commonElements}\n发布时间规律：${viralPatterns.timingPattern}\n标题规律：${viralPatterns.titlePattern}`;
```

**风险**: 如果 `viralAnalysis.patterns` 为 undefined，会导致后续访问 `viralPatterns.commonElements` 等报错

### 3.7 ID 匹配失败 ⚠️ **中概率**

**问题**: 选题详情生成时，ID 匹配可能失败

**代码位置**: `service.ts` 行 209-217
```typescript
for (const detail of batchTopics) {
  const outline = batch.find(o => o.id === detail.id);
  if (outline) {
    allTopics.push({
      ...outline,
      ...detail,
    });
  }
}
```

**风险**:
- 如果 AI 返回的 `detail.id` 与大纲的 `outline.id` 不匹配，选题会被跳过
- 如果 AI 返回的选题数量少于10条，部分选题会丢失详情
- 没有日志记录哪些选题被跳过

---

## 四、错误处理机制分析

### 4.1 大纲生成错误处理

```typescript
try {
  const result = await this.callAI(prompt, aiConfig, 180000, 4000);
  const parsed = JSON.parse(cleanAIResponse(result));
  const outlines = parsed.topics || [];
  console.log(`[AIAnalysisService] 选题大纲生成完成，共 ${outlines.length} 条`);
  return outlines;
} catch (error) {
  console.error('[AIAnalysisService] 选题大纲生成失败:', error);
  return [];  // 返回空数组
}
```

**分析**: ✅ 有 try-catch，但返回空数组会导致整个选题库为空
**问题**: 没有记录 AI 返回的原始数据，无法调试

### 4.2 详情生成错误处理

```typescript
try {
  const result = await this.callAI(prompt, aiConfig, 180000, 8000);
  const parsed = JSON.parse(cleanAIResponse(result));
  const batchTopics = parsed.topics || [];
  // ... 合并数据
} catch (error) {
  console.error(`[AIAnalysisService] 第 ${i + 1}/${batches} 批选题详情生成失败:`, error);
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
```

**分析**: ✅ 优雅降级，失败的批次保留大纲数据
**问题**: 没有记录具体的失败原因

### 4.3 选题数量验证

```typescript
// 行 272-274: 验证选题数量
if (fullTopics.length < 30) {
  console.warn(`[AIAnalysisService] 选题数量不足：期望30条，实际${fullTopics.length}条`);
}
```

**分析**: ✅ 有警告日志，但不中断流程
**问题**: 没有记录哪些选题缺失

---

## 五、可能的根本原因总结

### 高概率原因

1. **AI 返回 JSON 格式问题** ⭐⭐⭐⭐⭐
   - AI 返回可能包含 markdown 代码块
   - AI 可能添加额外说明文字
   - `cleanAIResponse()` 可能无法处理所有情况

2. **AI Token 限制导致截断** ⭐⭐⭐⭐
   - 4000 tokens 不足以生成完整的30条大纲
   - 8000 tokens 可能不足以生成10条详情

3. **AI 返回数据不完整** ⭐⭐⭐⭐
   - AI 可能忽略"必须生成30条"的要求
   - AI 可能生成错误的分类结构

### 中概率原因

4. **Prompt 引擎变量替换问题** ⭐⭐⭐
   - `viral_categories` 或 `viral_patterns` 包含特殊字符
   - JSON.stringify 导致格式问题

5. **API 超时** ⭐⭐⭐
   - 3分钟超时可能不够
   - 网络延迟或 AI 响应慢

6. **数据类型不匹配** ⭐⭐
   - `viralAnalysis.patterns` 可能为 undefined
   - ID 匹配失败

### 低概率原因

7. **AI 理解偏差** ⭐
   - AI 可能不理解"必须生成30条"的要求
   - AI 可能生成错误的分类

---

## 六、具体解决方案建议

### 6.1 增强 JSON 清理函数 ✅ **优先级 P0**

**问题**: `cleanAIResponse()` 可能无法处理所有 AI 返回格式

**解决方案**:
```typescript
function cleanAIResponse(response: string): string {
  let cleaned = response.trim();

  // 移除 markdown 代码块标记
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    } else {
      const lastCodeBlock = cleaned.lastIndexOf('\n```');
      if (lastCodeBlock !== -1) {
        cleaned = cleaned.substring(0, lastCodeBlock);
      }
    }
  }

  // 新增：移除可能的解释性文字（提取 JSON 部分）
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  } else if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
  }

  return cleaned.trim();
}
```

### 6.2 增加 Token 限制 ✅ **优先级 P0**

**当前**: 4000 (大纲) / 8000 (详情)
**建议**: 6000 (大纲) / 12000 (详情)

**修改位置**: `service.ts`
- 行 153: `const result = await this.callAI(prompt, aiConfig, 180000, 6000);`
- 行 204: `const result = await this.callAI(prompt, aiConfig, 180000, 12000);`

### 6.3 添加重试机制 ✅ **优先级 P1**

**问题**: 单次失败直接返回空数组

**解决方案**:
```typescript
async generateTopicOutline(...): Promise<TopicOutline[]> {
  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.callAI(prompt, aiConfig, 180000, 6000);
      const parsed = JSON.parse(cleanAIResponse(result));
      const outlines = parsed.topics || [];

      if (outlines.length >= 30) {
        console.log(`[AIAnalysisService] 选题大纲生成完成，共 ${outlines.length} 条`);
        return outlines;
      }

      console.warn(`[AIAnalysisService] 选题数量不足：${outlines.length}/30，重试 ${attempt}/${maxRetries}`);
    } catch (error) {
      lastError = error;
      console.error(`[AIAnalysisService] 选题大纲生成失败（尝试 ${attempt}/${maxRetries}）:`, error);
    }

    // 重试前等待
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.error('[AIAnalysisService] 选题大纲生成最终失败:', lastError);
  return [];
}
```

### 6.4 添加详细的调试日志 ✅ **优先级 P0**

**问题**: 无法追踪 AI 返回的原始数据

**解决方案**:
```typescript
async generateTopicOutline(...): Promise<TopicOutline[]> {
  try {
    const result = await this.callAI(prompt, aiConfig, 180000, 6000);

    // 添加调试日志
    console.log('[AIAnalysisService] AI 原始返回长度:', result.length);
    console.log('[AIAnalysisService] AI 原始返回（前500字符）:', result.substring(0, 500));

    const cleaned = cleanAIResponse(result);
    console.log('[AIAnalysisService] 清理后长度:', cleaned.length);
    console.log('[AIAnalysisService] 清理后（前500字符）:', cleaned.substring(0, 500));

    const parsed = JSON.parse(cleaned);
    const outlines = parsed.topics || [];
    console.log(`[AIAnalysisService] 解析后选题数量: ${outlines.length}`);

    if (outlines.length > 0) {
      console.log('[AIAnalysisService] 第一条选题示例:', JSON.stringify(outlines[0]));
    }

    return outlines;
  } catch (error) {
    console.error('[AIAnalysisService] 选题大纲生成失败:', error);
    console.error('[AIAnalysisService] 错误堆栈:', error instanceof Error ? error.stack : 'Unknown');
    return [];
  }
}
```

### 6.5 添加数据验证 ✅ **优先级 P1**

**问题**: 无法验证 AI 返回的数据结构是否正确

**解决方案**:
```typescript
function validateTopicOutline(data: any): data is TopicOutline[] {
  if (!Array.isArray(data)) {
    console.error('[validateTopicOutline] 数据不是数组');
    return false;
  }

  if (data.length !== 30) {
    console.warn(`[validateTopicOutline] 选题数量不足: ${data.length}/30`);
  }

  for (const item of data) {
    if (!item.id || !item.category || !Array.isArray(item.titles)) {
      console.error('[validateTopicOutline] 无效的选题结构:', item);
      return false;
    }
    if (item.titles.length !== 3) {
      console.warn(`[validateTopicOutline] 选题 ${item.id} 标题数量不足: ${item.titles.length}/3`);
    }
  }

  return true;
}

// 在 generateTopicOutline 中使用
if (!validateTopicOutline(outlines)) {
  console.error('[AIAnalysisService] 选题大纲数据验证失败');
  return [];
}
```

### 6.6 优化 Prompt 模板 ✅ **优先级 P1**

**问题**: Prompt 可能不够明确

**建议增强 topic_outline_generation**:
```
【关键要求】
1. 必须生成完整的30条选题大纲，不能少于30条
2. 每条大纲包含：id(1-30连续数字)、category(分类名称)、titles(3个标题数组)
3. 必须返回纯JSON格式，不要有任何markdown代码块标记
4. 不要添加任何解释性文字，只返回JSON数据
5. id必须从1开始连续到30，不能跳号
6. 每个选题的titles数组必须包含3个标题
```

---

## 七、建议的修复优先级

### P0（立即修复）

1. ✅ 增强 `cleanAIResponse()` 函数 - 处理更多 AI 返回格式
2. ✅ 增加 Token 限制到 6000/12000 - 防止输出截断
3. ✅ 添加详细调试日志 - 便于定位问题

### P1（重要）

4. ✅ 添加重试机制 - 提高成功率
5. ✅ 添加数据验证函数 - 确保 AI 返回正确格式
6. ✅ 优化 Prompt 模板 - 明确 JSON 格式要求

### P2（可选）

7. ⏳ 增强 Prompt 引擎安全性 - 处理特殊字符
8. ⏳ 添加单元测试覆盖边界情况
9. ⏳ 实现断点续传机制 - 失败后可以继续生成

---

## 八、下一步行动

1. **立即实施 P0 修复** - 修改 `service.ts` 代码
2. **添加详细的调试日志** - 运行测试并收集日志
3. **根据日志分析具体失败原因** - 定位真正的问题
4. **实施 P1 修复** - 提高成功率和稳定性
5. **完整测试验证** - 确保选题库生成成功

---

## 九、结论

选题库生成失败最可能的原因是：

1. **AI 返回的 JSON 格式问题** - 可能包含 markdown 代码块或额外文字
2. **Token 限制不足** - 导致 AI 输出被截断
3. **AI 返回数据不完整** - 忽略了"必须生成30条"的要求
4. **缺乏详细的调试日志** - 无法准确定位失败原因

建议按照优先级依次实施修复方案，并在每次修复后进行完整测试和日志分析。
