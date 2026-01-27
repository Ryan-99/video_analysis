# 研究发现：修复 Vercel 超时和 AI 模型问题

**创建时间**: 2026-01-27

---

## 问题分析

### 1. 超时问题分析

**Vercel 配置** (src/app/api/jobs/process/route.ts:7-8):
```typescript
export const runtime = 'nodejs';
export const maxDuration = 300; // 300 秒 = 5 分钟
```

**AI 调用超时** (src/lib/ai-analysis/service.ts:659, 676):
```typescript
const result1 = await this.callAI(prompt1, aiConfig, 300000, 16000); // 5分钟
const result2 = await this.callAI(prompt2, aiConfig, 300000, 16000); // 5分钟
```

**根本原因**：
- Vercel Serverless 函数最大执行时间设置为 300 秒
- 单次 AI 调用超时也是 300 秒
- 两次 AI 调用连续执行，总时间超过 Vercel 限制
- 即使单次调用在 299 秒完成，加上网络延迟和响应处理时间，也容易超时

### 2. AI 模型配置问题

**错误信息**：
```
OpenAI API错误 (400): {"error":{"message":"Model not support","type":"rix_api_error"}}
```

**日志显示**：
- 模型名称：`DeepSeek-V3.2`
- API URL：`https://www.dmxapi.cn/v1`

**根本原因**：
1. 用户在前端设置界面配置的模型名称 `DeepSeek-V3.2` 不被 API 支持
2. API 提供商 `dmxapi.cn` 不支持这个模型名称
3. 正确的 DeepSeek 模型名称应该是：
   - `deepseek-chat`
   - `deepseek-coder`
   - `deepseek-reasoner`

**AI 配置流程**：
```
localStorage (SettingsDialog)
  ↓
page.tsx (读取并选择默认提供商)
  ↓
/api/analyze (接收并存储到数据库)
  ↓
pipeline.ts (从任务获取)
  ↓
service.ts (解析并调用 API)
```

### 3. 超时与模型问题的关联

**重要发现**：
- 即使模型名称错误，AI 调用仍然会尝试执行
- 由于模型错误，API 返回 400 错误
- 但在此之前，请求已经等待了很长时间（接近超时时间）
- 这说明可能是 API 端点响应慢或者有重试机制

---

## 相关文件

| 文件路径 | 作用 | 需要修改 |
|----------|------|----------|
| src/app/api/jobs/process/route.ts | Vercel 超时配置 | 是 |
| src/lib/ai-analysis/service.ts | AI 调用超时配置 | 是 |
| src/lib/analyzer/pipeline.ts | 分析流程编排 | 是 |
| src/app/page.tsx | AI 配置读取 | 否 |
| src/components/SettingsDialog.tsx | AI 配置设置 | 否 |

---

## 修复方案

### 方案 A：减少超时时间（推荐）

将单次 AI 调用超时从 300 秒减少到 240 秒，为 Vercel 处理留出时间。

**优点**：
- 简单直接
- 不改变架构
- 降低超时风险

**缺点**：
- AI 调用可能因超时而失败

### 方案 B：拆分步骤 4（推荐）

将步骤 4 拆分为两个子步骤：
- 步骤 4-1：主分析（第一次 AI 调用）
- 步骤 4-2：方法论抽象（第二次 AI 调用）

**优点**：
- 每次只有一个 AI 调用
- 超时风险降低
- 可以独立重试失败的步骤

**缺点**：
- 需要修改 pipeline.ts
- 需要修改数据库 schema（analysisStep 支持子步骤）

### 方案 C：组合方案（最佳）

结合方案 A 和方案 B：
1. 拆分步骤 4 为 4-1 和 4-2
2. 减少单次 AI 调用超时到 240 秒
3. 添加模型名称验证

---

## 已完成的修复

### 1. 超时时间减少 ✅
已将所有 AI 调用超时从 300 秒减少到 240 秒，为 Vercel 留出 60 秒缓冲时间。

**修改位置**：
- src/lib/ai-analysis/service.ts:412, 459 (analyzeMonthlyTrend)
- src/lib/ai-analysis/service.ts:659, 676 (analyzeViralVideos)
- src/lib/ai-analysis/service.ts:816 (generateTopicOutline)
- src/lib/ai-analysis/service.ts:964 (generateTopicDetails)

### 2. 发现架构问题 ✅ 已修复
**问题**：`analyzeViralVideos` 函数内部执行两次连续的 AI 调用（主分析 + 方法论），总时间仍可能超过 Vercel 300s 限制。

**已实施修复**：将两次 AI 调用拆分到步骤 4 和步骤 5
- 步骤 4 (step4_ViralMain) 调用 `analyzeViralVideosMain`（第一次 AI 调用）
- 步骤 5 (step5_Methodology) 调用 `analyzeViralVideosMethodology`（第二次 AI 调用）
- 每次只有一个 AI 调用，不会超过 240 秒

---

## 待确认事项

- [x] 当前使用的 AI 配置是从哪里获取的
- [ ] 用户是否需要重新配置 AI 模型名称
- [ ] 是否需要添加模型名称验证
- [x] 是否需要实施步骤 4 的拆分（已完成）
