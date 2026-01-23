# 自动字段映射功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移除手动列映射步骤，实现基于关键词匹配的自动字段映射，简化用户上传流程

**Architecture:** 将现有的两步流程（上传→确认映射→分析）简化为一步流程（上传→自动分析），通过增强的关键词匹配算法和AI辅助确保映射准确性

**Tech Stack:** Next.js 14, TypeScript, 现有的 parser 模块

---

## 任务概览

1. 增强自动列检测算法（关键词匹配优化）
2. 更新 API 路由以支持自动映射验证
3. 修改首页组件，移除手动映射步骤
4. 更新 PRD 文档

---

## Task 1: 增强关键词匹配算法

**Files:**
- Modify: `src/lib/parser/validator.ts`

**Step 1: 扩展关键词列表**

```typescript
// 在 KEYWORDS 常量中添加更多变体
const KEYWORDS = {
  title: [
    '标题', '题目', '视频标题', 'title', '视频名称', '作品标题',
    '内容', '视频内容', '文案', '标题文案', '作品名称', 'topic'
  ],
  likes: [
    '点赞', '点赞数', 'likes', '赞', '点赞量', '点赞数量',
    'like', '点赞总数', '获赞', '总点赞'
  ],
  comments: [
    '评论', '评论数', 'comments', '评', '评论量', '评论数量',
    'comment', '总评论', '评论总数'
  ],
  saves: [
    '收藏', '收藏数', 'saves', '收', '收藏量', '收藏数量',
    'save', '总收藏', '收藏总数', '喜欢'
  ],
  shares: [
    '转发', '转发数', 'shares', '发', '转发量', '转发数量',
    'share', '总转发', '转发总数', '分享'
  ],
  publishTime: [
    '发布时间', '时间', '发布', 'publish', 'date', '日期', '发布日期',
    'datetime', '时间戳', '创建时间', 'createTime', 'pubTime', 'pub_date'
  ],
};
```

**Step 2: 添加模糊匹配函数**

在 `validator.ts` 中添加新的模糊匹配函数：

```typescript
/**
 * 计算字符串相似度（Levenshtein距离）
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * 检查两个字符串是否相似（相似度 >= 70%）
 */
function isSimilar(str1: string, str2: string): boolean {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);
  const similarity = 1 - distance / maxLen;
  return similarity >= 0.7;
}

/**
 * 使用模糊匹配检测列
 */
export function detectColumnsWithFuzzy(headers: string[]): ColumnDetection {
  const result: ColumnDetection = {
    title: null,
    likes: null,
    comments: null,
    saves: null,
    shares: null,
    publishTime: null,
  };

  // 首先尝试精确匹配
  for (const [key, keywords] of Object.entries(KEYWORDS)) {
    for (const keyword of keywords) {
      const found = headers.find(h =>
        h.toLowerCase().includes(keyword.toLowerCase())
      );
      if (found) {
        result[key as keyof ColumnDetection] = found;
        break;
      }
    }
  }

  // 对未匹配的字段尝试模糊匹配
  for (const [key, keywords] of Object.entries(KEYWORDS)) {
    if (result[key as keyof ColumnDetection]) continue;

    for (const keyword of keywords) {
      const found = headers.find(h => isSimilar(h, keyword));
      if (found) {
        result[key as keyof ColumnDetection] = found;
        break;
      }
    }
  }

  return result;
}
```

**Step 3: 更新 detectColumns 函数使用新算法**

```typescript
export function detectColumns(headers: string[]): ColumnDetection {
  return detectColumnsWithFuzzy(headers);
}
```

**Step 4: 运行构建验证**

Run: `npm run build`
Expected: 成功构建，无类型错误

**Step 5: 提交更改**

```bash
git add src/lib/parser/validator.ts
git commit -m "feat: enhance column detection with fuzzy matching"
```

---

## Task 2: 添加映射完整性验证 API

**Files:**
- Modify: `src/app/api/analyze/route.ts`

**Step 1: 读取现有 analyze API**

Run: `cat src/app/api/analyze/route.ts`
Expected: 查看当前 API 的请求处理逻辑

**Step 2: 添加自动映射验证逻辑**

在 analyze API 的 POST 处理函数中，添加自动映射验证：

```typescript
// 在创建任务之前添加
import { detectColumns, validateColumnMapping } from '@/lib/parser';

export async function POST(request: NextRequest) {
  try {
    const { fileId, fileUrl, columnMapping } = await request.json();

    // 如果没有提供列映射，则自动检测
    let finalMapping = columnMapping;
    if (!finalMapping) {
      // 调用 parse API 获取列信息
      const parseResponse = await fetch(new URL('/api/parse', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileUrl }),
      });
      const parseResult = await parseResponse.json();

      if (parseResult.success) {
        finalMapping = parseResult.data.columnMapping;
      }
    }

    // 验证映射完整性
    const validation = validateColumnMapping(finalMapping);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INCOMPLETE_MAPPING',
            message: '字段映射不完整',
            missing: validation.missing,
          }
        },
        { status: 400 }
      );
    }

    // 继续创建分析任务...
  }
}
```

**Step 3: 运行构建验证**

Run: `npm run build`
Expected: 成功构建

**Step 4: 提交更改**

```bash
git add src/app/api/analyze/route.ts
git commit -m "feat: add auto-mapping validation in analyze API"
```

---

## Task 3: 更新首页组件 - 移除手动映射步骤

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: 移除列映射相关状态和导入**

```typescript
// 删除以下导入和状态
- import { ColumnMapper } from '@/components/upload/ColumnMapper';
- import { ColumnMapping } from '@/types';

- const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
-   title: '',
-   likes: '',
-   comments: '',
-   saves: '',
-   shares: '',
-   publishTime: '',
- });
```

**Step 2: 简化 handleFileUploaded 函数**

```typescript
/**
 * 处理文件上传成功 - 直接开始分析
 */
const handleFileUploaded = async (id: string, url: string, name: string) => {
  try {
    // 直接调用分析 API，不传列映射（后端自动检测）
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId: id,
        fileUrl: url,
      }),
    });

    const result = await response.json();

    if (result.success) {
      router.push(`/analyze/${result.data.taskId}`);
    } else {
      // 显示错误信息
      console.error('分析启动失败:', result.error);
      alert(`分析启动失败: ${result.error.message}`);
    }
  } catch (error) {
    console.error('Failed to start analysis:', error);
    alert('分析启动失败，请重试');
  }
};
```

**Step 3: 更新上传后的 UI 显示**

替换 `!fileId ? (...) : (...)` 部分：

```typescript
{/* 上传区域 */}
{!fileId ? (
  <FileUploader onFileUploaded={handleFileUploaded} />
) : (
  <section className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm">
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">文件上传成功</h3>
      <p className="text-sm text-gray-500 mb-6">
        文件: <span className="text-gray-700">{fileName || '未知文件'}</span>
      </p>
      <div className="flex items-center justify-center gap-3">
        <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm text-gray-600">正在自动识别字段并开始分析...</span>
      </div>
    </div>
  </section>
)}
```

**Step 4: 更新流程说明步骤数**

```typescript
{/* 流程说明 */}
<section className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm">
  <h3 className="text-sm font-semibold text-gray-900 mb-8 uppercase tracking-wide">分析流程</h3>
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-4 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
          style={{ backgroundColor: accentColor }}
        >
          1
        </div>
        <h4 className="text-base font-semibold text-gray-900">上传数据</h4>
      </div>
      <p className="text-sm text-gray-500 ml-14">支持 CSV / Excel 格式</p>
    </div>

    <div className="w-16 h-px bg-gray-200" />

    <div className="flex-1">
      <div className="flex items-center gap-4 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
          style={{ backgroundColor: accentColor }}
        >
          2
        </div>
        <h4 className="text-base font-semibold text-gray-900">自动分析</h4>
      </div>
      <p className="text-sm text-gray-500 ml-14">智能识别字段</p>
    </div>

    <div className="w-16 h-px bg-gray-200" />

    <div className="flex-1">
      <div className="flex items-center gap-4 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
          3
        </div>
        <h4 className="text-base font-semibold text-gray-900">获取报告</h4>
      </div>
      <p className="text-sm text-gray-500 ml-14">AI 生成分析</p>
    </div>
  </div>
</section>
```

**Step 5: 运行构建验证**

Run: `npm run build`
Expected: 成功构建，无 ColumnMapper 相关错误

**Step 6: 提交更改**

```bash
git add src/app/page.tsx
git commit -m "feat: remove manual column mapping step, auto-detect on upload"
```

---

## Task 4: 更新 PRD 文档

**Files:**
- Modify: `docs/PRD.md`

**Step 1: 更新功能1的描述**

在 `### 2.1 MVP阶段核心功能` 的 `#### 功能1：文件上传与解析` 部分：

```markdown
#### 功能1：文件上传与解析
**用户流程**：上传Excel/CSV → 自动识别字段 → 开始分析

| 功能点 | 描述 |
|--------|------|
| 文件格式支持 | Excel (.xlsx, .xls)、CSV |
| 文件大小限制 | 10MB |
| 自动字段识别 | 基于关键词匹配和模糊匹配算法自动识别数据列 |
| 数据清洗 | 空值处理、格式转换、异常值检测 |
| 数据验证 | 必要字段检查、数据量验证 |
| 智能容错 | 支持多种列名变体，自动修正常见命名差异 |
```

**Step 2: 更新数据流程图**

在 `### 3.4 数据流程图` 部分，简化流程：

```markdown
### 3.4 数据流程图

```
用户上传Excel/CSV
    ↓
前端验证（格式、大小）
    ↓
上传到存储
    ↓
后端解析文件 → 自动识别列名 → 数据清洗 → 数据验证
    ↓
【自动映射验证】如果映射不完整，返回错误提示
    ↓
创建分析任务 → 返回任务ID
    ↓
【并行处理两路任务】
    ↓                      ↓
┌────────────┐      ┌────────────┐
│ 计算任务流  │      │ AI分析流    │
│ (代码执行)  │      │ (异步调用)   │
│            │      │            │
│ - 基础指标  │      │ - 账号概况  │
│ - 月度统计  │      │ - 阶段划分  │
│ - P90/MAD  │      │ - 爆款分类  │
│ - 阈值计算  │      │ - 母题抽象  │
│ - 爆款筛选  │      │ - 方法论    │
└────────────┘      └────────────┘
    ↓                      ↓
    └──────────┬──────────┘
               ↓
        调用Python图表服务（Railway）
               ↓
        生成PNG图表
               ↓
    ┌────────────────────┐
    │   生成最终报告      │
    │  - Word文档         │
    │  - Excel源文件      │
    │  - PNG图表          │
    └────────────────────┘
               ↓
        更新任务状态为完成
               ↓
        前端轮询检测到完成
               ↓
        用户下载/预览报告
```
```

**Step 3: 更新版本历史**

在文档顶部的更新内容中添加：

```markdown
> **文档版本**: v1.3
> **创建日期**: 2025-01-20
> **最后更新**: 2025-01-21
> **更新内容**:
> - **移除手动列映射步骤**，实现自动字段识别
> - 新增自定义AI配置功能（支持自定义API地址、模型名称、环境变量）
> - 新增API格式选择（OpenAI/Claude格式）
> - 新增日志查看器功能（实时显示分析过程日志）
> - UI风格更新为现代简约设计（去掉渐变效果）
> - 蓝色主题色饱和度提升（#4a7cff）
```

**Step 4: 添加技术说明章节**

在代码与AI分工部分后添加：

```markdown
### 7.3 自动字段映射技术

#### 关键词匹配
- 精确匹配：列名包含关键词
- 模糊匹配：Levenshtein距离算法，相似度>=70%
- 支持中英文混合识别

#### 字段映射规则
| 目标字段 | 支持的列名关键词 |
|----------|------------------|
| 视频标题 | 标题/题目/title/内容/文案/视频名称/作品标题 |
| 点赞数 | 点赞/likes/赞/获赞/点赞总数 |
| 评论数 | 评论/comments/评/评论量 |
| 收藏数 | 收藏/saves/收/喜欢 |
| 转发数 | 转发/shares/发/分享 |
| 发布时间 | 发布时间/time/publish/date/日期/发布日期 |
```

**Step 5: 验证文档格式**

Run: `head -50 docs/PRD.md`
Expected: 文档头部格式正确

**Step 6: 提交更改**

```bash
git add docs/PRD.md
git commit -m "docs: update PRD for auto column mapping feature"
```

---

## Task 5: 清理未使用的组件（可选）

**Files:**
- Delete: `src/components/upload/ColumnMapper.tsx`

**Step 1: 检查是否有其他地方引用**

Run: `grep -r "ColumnMapper" src/`
Expected: 只有 page.tsx 中的导入（已被移除）

**Step 2: 删除组件文件**

Run: `rm src/components/upload/ColumnMapper.tsx`

**Step 3: 提交更改**

```bash
git add src/components/upload/ColumnMapper.tsx
git commit -m "chore: remove unused ColumnMapper component"
```

---

## 验收测试

### 测试场景1: 标准列名上传
| 操作 | 预期结果 |
|------|----------|
| 上传包含"点赞数"、"评论数"等标准列名的Excel | 自动识别成功，直接进入分析 |
| 不显示列映射界面 | ✅ |
| 分析进度页面正常显示 | ✅ |

### 测试场景2: 变体列名上传
| 操作 | 预期结果 |
|------|----------|
| 上传包含"获赞"、"总评论"等变体列名的CSV | 模糊匹配识别成功 |
| 自动开始分析 | ✅ |

### 测试场景3: 缺失必要字段
| 操作 | 预期结果 |
|------|----------|
| 上传缺少必要字段的文件 | 返回错误提示缺失字段 |
| 不创建分析任务 | ✅ |

---

## 完成检查清单

- [ ] 关键词列表已扩展
- [ ] 模糊匹配算法已实现
- [ ] detectColumns 函数已更新
- [ ] analyze API 支持自动映射
- [ ] 首页已移除手动映射步骤
- [ ] 流程说明已更新为2步
- [ ] PRD 文档已更新
- [ ] ColumnMapper 组件已删除
- [ ] 构建成功无错误
- [ ] 所有更改已提交

---

**计划完成日期**: 2025-01-21
**预计耗时**: 1-2小时
