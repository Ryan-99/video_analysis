# 研究发现与决策记录

## 需求清单

### 问题1: 选题库生成失败
- **错误类型**: Headers Timeout Error (UND_ERR_HEADERS_TIMEOUT)
- **失败场景**: 生成30条完整选题（标题+口播稿+分镜）
- **用户建议方案**:
  1. 第一步：基于账号内容规划30条选题大纲
  2. 第二步：分三次生成，每次10条完整选题
- **目标**: 避免单次AI请求过大导致超时

### 问题2: Word文档中添加图表图片
- **当前状态**: Word文档只包含文本，没有图表
- **图表类型需求**:
  - 月度趋势折线图
  - 全周期每日爆点折线图
  - 爆款分类柱状图
- **已有资源**:
  - `src/lib/charts/service.ts`: QuickChart API配置服务
  - `scripts/generate_charts.py`: Python matplotlib脚本
- **目标**: 在Word文档的合适位置嵌入图表图片

### 问题3: 添加返回主页按钮
- **目标页面**:
  - 分析页面 (`/analyze/[taskId]`)
  - 报告页面 (`/report/[reportId]`)
  - 其他可能的子页面
- **用户体验需求**:
  - 固定位置显示
  - 清晰的视觉反馈
  - 一致的交互样式

## 研究发现

### 1. 选题库生成的当前实现
**文件**: `src/lib/ai-analysis/service.ts`

```typescript
async generateTopics(...): Promise<Topic[]> {
  const result = await this.callAI(prompt, aiConfig, 600000, 16000);
  // 当前配置：10分钟超时，16000 tokens
  // 一次性要求生成30条完整选题
}
```

**Prompt配置**: `src/config/prompts.json` - `topic_generation`
- 要求AI生成6大类共30条选题
- 每条包含：id、category、titles(3个)、script(5段式)、storyboard(4个)、casePoint
- 口播稿要求150-200字

**超时分析**:
- 30条选题 × (3个标题 + 150-200字口播稿 + 4个分镜 + 案例点位)
- 估计输出token数：30 × 300 = 9000+ tokens
- 加上prompt本身，总token数可能超过16000限制
- 网络超时风险：长时间请求容易因网络波动中断

**结论**: 需要拆分成更小的请求

### 2. 图表生成的可用方案

#### 方案A: QuickChart API（已有）
**文件**: `src/lib/charts/service.ts`

**优点**:
- 无需Python环境，部署简单
- 已有完整配置代码
- 支持多种图表类型

**缺点**:
- 需要网络请求
- 图片需要下载转换为Buffer
- API可能有速率限制

**实现步骤**:
1. 生成图表URL: `generateChartImageUrl(config)`
2. 下载图片: `downloadChartImage(url)`
3. 转换为Buffer或Base64
4. 使用docx的ImageRun嵌入

#### 方案B: Python matplotlib脚本
**文件**: `scripts/generate_charts.py`

**优点**:
- 本地生成，无网络依赖
- 完全控制样式
- 支持中文字体

**缺点**:
- 需要Python环境
- 需要部署FastAPI服务（如project已部署的python-service）
- 增加部署复杂度

**结论**: 优先使用QuickChart API，简化架构

### 3. Word文档中嵌入图片的方法

**docx库支持两种方式**:

#### 方式1: 使用文件路径
```typescript
import { ImageRun } from 'docx';
new Paragraph({
  children: [
    new ImageRun({
      data: buffer, // Buffer
      transformation: { width: 600, height: 300 },
    }),
  ],
})
```

#### 方式2: 使用Base64
```typescript
new ImageRun({
  data: Buffer.from(base64String, 'base64'),
  transformation: { width: 600, height: 300 },
})
```

**决策**: 使用Buffer方式，因为downloadChartImage已经返回Buffer

### 4. 当前页面导航结构

**分析页面** (`src/app/analyze/[taskId]/page.tsx`):
- 已有失败时的返回按钮（第405-414行）
- 按钮样式：bg-white/5 border border-white/10
- 位置：底部状态栏右侧
- 仅在失败状态显示，正常状态无返回按钮

**报告页面** (`src/app/report/[reportId]/page.tsx`):
- 当前无返回按钮
- 页面结构简单：header + ReportViewer组件
- header包含标题"分析报告"
- 适合在header左侧添加返回按钮

**导航模式**:
- 当前使用 `router.push('/')` 返回主页
- 主页路径：`/`

## 技术决策

| 决策 | 理由 |
|------|------|
| 选题库两阶段生成（大纲+分批） | 降低单次请求复杂度，避免超时 |
| 每批生成10条选题而非30条 | 平衡请求大小和批次数 |
| 使用QuickChart API生成图表 | 无需Python依赖，简化部署 |
| 图表作为Buffer嵌入Word | docx原生支持，无需临时文件 |
| 创建可复用的BackButton组件 | UI一致性，便于维护 |
| 返回按钮固定在顶部导航栏 | 最符合用户习惯，易发现 |

## 实现细节

### 选题库生成新流程

**第一步：生成选题大纲**
- Prompt: 基于30条选题的ID、分类、3个标题备选
- 输出: 简化的JSON，不包含口播稿和分镜
- 预计token: 约2000-3000

**第二步：分批生成完整内容**
- 分3批，每批10条
- Prompt: 包含大纲信息，要求生成口播稿和分镜
- 每批预计token: 约3000-4000
- 总计: 约9000-12000 tokens（分散在3个请求中）

**合并策略**:
- 将3批结果按ID合并
- 验证总数是否为30条
- 记录任何失败的批次

### Word文档图表插入位置

根据当前word.ts结构，建议插入位置：
1. **月度趋势图**: 在 `generateMonthlySection()` 中，总结之后、数据表格之前
2. **每日爆点图**: 在 `generateViralSection()` 中，爆款统计之后
3. **爆款分类图**: 在爆款分类详情表格之前或之后

### 返回按钮设计

**组件规格**:
- 位置: 页面顶部导航栏左侧
- 样式: 与现有失败按钮一致
- 图标: 左箭头 + "返回首页" 文字
- 响应式: 移动端只显示图标

**组件文件**: `src/components/ui/BackButton.tsx`

## 遇到的问题

| 问题 | 解决方案 |
|------|----------|
| - | - |

## 实现细节规划

### 问题1: 选题库分批生成实现

#### 新增Prompt模板: topic_outline_generation
**文件**: `src/config/prompts.json`

```json
{
  "topic_outline_generation": {
    "name": "选题大纲生成",
    "template": "你是专业的抖音内容策划师。请根据以下账号信息，规划30条爆款选题的大纲。\n\n【账号核心主题】\n{{core_topic}}\n\n【账号类型】\n{{account_type}}\n\n【目标受众】\n{{audience}}\n\n【爆款分类】\n{{viral_categories}}\n\n【爆款规律】\n{{viral_patterns}}\n\n【任务要求】\n请规划6大类共30条选题的大纲，每类5条。\n\n【输出格式】\n请严格按照以下JSON格式输出：\n{\n  \"topics\": [\n    {\n      \"id\": 1,\n      \"category\": \"分类名称\",\n      \"titles\": [\"本质句标题\", \"反常识标题\", \"清单承诺标题\"]\n    }\n  ]\n}\n\n注意：只生成大纲（id、category、titles），不生成口播稿和分镜。",
    "variables": { ... },
    "outputFormat": "json"
  }
}
```

#### 修改方法: generateTopicsWithBatches
**文件**: `src/lib/ai-analysis/service.ts`

```typescript
async generateTopicsWithBatches(
  account: AccountAnalysis,
  viralAnalysis: any,
  aiConfig?: string
): Promise<Topic[]> {
  // 步骤1: 生成大纲
  const outline = await this.generateTopicOutline(account, viralAnalysis, aiConfig);

  // 步骤2: 分3批生成完整内容
  const batches = [
    outline.topics.slice(0, 10),
    outline.topics.slice(10, 20),
    outline.topics.slice(20, 30)
  ];

  const results = [];
  for (const batch of batches) {
    const batchResult = await this.generateTopicBatch(batch, viralAnalysis, aiConfig);
    results.push(...batchResult);
  }

  return results;
}

private async generateTopicOutline(...): Promise<{topics: TopicOutline[]}> {
  const prompt = promptEngine.render('topic_outline_generation', { ... });
  const result = await this.callAI(prompt, aiConfig, 120000, 4000);
  return JSON.parse(cleanAIResponse(result));
}

private async generateTopicBatch(
  batch: TopicOutline[],
  viralAnalysis: any,
  aiConfig?: string
): Promise<Topic[]> {
  const prompt = `请为以下${batch.length}条选题大纲生成完整的口播稿和分镜：\n\n${JSON.stringify(batch)}\n\n请保持原有的id、category、titles，添加script、storyboard、casePoint字段。`;
  const result = await this.callAI(prompt, aiConfig, 180000, 6000);
  return JSON.parse(cleanAIResponse(result));
}
```

### 问题2: Word图表嵌入实现

#### 修改: generateMonthlySection
**文件**: `src/lib/report/word.ts`

```typescript
async function generateMonthlySection(
  trend: Report['monthlyTrend'],
  chartBuffer?: Buffer
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: '【趋势总结】', bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: trend.summary })] }),
    new Paragraph({ text: '' }),
  ];

  // 插入图表
  if (chartBuffer) {
    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: chartBuffer,
            transformation: { width: 600, height: 300 },
          }),
        ],
      })
    );
    paragraphs.push(new Paragraph({ text: '' }));
  }

  // ... 其余内容
  return paragraphs;
}
```

#### 修改: generateViralSection
类似地添加每日爆点图和分类图。

#### 修改: generateWordReport
在调用时生成图表：

```typescript
export async function generateWordReport(report: Report): Promise<Buffer> {
  // 生成图表
  const monthlyChartBuffer = await generateAndDownloadChart(
    generateMonthlyTrendConfig(report.monthlyTrend.data)
  );

  const dailyChartBuffer = await generateAndDownloadChart(
    generateDailyViralsConfig(report.virals.list)
  );

  const categoriesChartBuffer = await generateAndDownloadChart(
    generateViralCategoriesConfig(report.virals.byCategory)
  );

  const doc = new Document({
    sections: [{
      children: [
        // ... 标题
        new Paragraph({ text: '二、月度趋势分析', heading: HeadingLevel.HEADING_2 }),
        ...generateMonthlySection(report.monthlyTrend, monthlyChartBuffer),

        new Paragraph({ text: '三、爆款视频分析', heading: HeadingLevel.HEADING_2 }),
        ...generateViralSection(report.virals, dailyChartBuffer, categoriesChartBuffer),
        // ...
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}

async function generateAndDownloadChart(config: ChartConfig): Promise<Buffer> {
  const url = generateChartImageUrl(config);
  return await downloadChartImage(url);
}
```

### 问题3: 统一返回按钮组件

#### 新建: BackButton组件
**文件**: `src/components/ui/BackButton.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export function BackButton({ className = '', label = '返回首页' }: BackButtonProps) {
  const router = useRouter();
  const { theme } = useTheme();

  const getCtaColor = () => {
    switch (theme) {
      case 'yellow': return '#facc15';
      case 'green': return '#22c55e';
      default: return '#6366f1';
    }
  };

  return (
    <button
      onClick={() => router.push('/')}
      className={`flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.02] transition-colors ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
```

#### 修改: 分析页面
**文件**: `src/app/analyze/[taskId]/page.tsx`

在header中添加返回按钮（始终显示）：

```typescript
import { BackButton } from '@/components/ui/BackButton';

// 在header中添加
<header className="flex items-center justify-between mb-16">
  <div className="flex items-center gap-4">
    <BackButton />  {/* 新增 */}
    {/* ... 现有内容 */}
  </div>
  {/* ... */}
</header>
```

#### 修改: 报告页面
**文件**: `src/app/report/[reportId]/page.tsx`

```typescript
import { BackButton } from '@/components/ui/BackButton';

// 在header中添加
<header className="flex items-center justify-between mb-12">
  <div className="flex items-center gap-4">
    <BackButton />
    <div>
      <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-3">
        Analysis Report
      </p>
      <h1 className="text-white text-4xl font-bold tracking-tight">
        分析报告
      </h1>
    </div>
  </div>
</header>
```

## 资源清单

### 代码文件
- `src/lib/ai-analysis/service.ts` - AI分析服务
- `src/config/prompts.json` - Prompt配置
- `src/lib/charts/service.ts` - 图表配置服务
- `src/lib/report/word.ts` - Word生成逻辑
- `src/app/analyze/[taskId]/page.tsx` - 分析页面

### 文档
- `docs/PRD.md` - 产品需求文档
- `docs/plans/task_plan.md` - 任务计划
- `docs/plans/progress.md` - 进度日志

### 外部资源
- [docx documentation](https://docx.js.org/) - Word生成库文档
- [QuickChart API](https://quickchart.io/) - 图表生成服务

---

*更新此文件，特别是在每2次view/browser/search操作之后*
*这可以防止视觉信息丢失*
