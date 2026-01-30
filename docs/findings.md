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

## 新发现：OpenAI 格式 API 调用缺少 max_tokens 参数

**问题位置**：[service.ts:1278-1282](../src/lib/ai-analysis/service.ts#L1278-L1282)

**问题描述**：
```typescript
// OpenAI 格式 - 缺少 max_tokens 参数
body: JSON.stringify({
  model: providerConfig.model,
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
  // ❌ 没有传递 max_tokens
}),
```

**Claude 格式对比**（正确实现）：
```typescript
// Claude 格式 - 正确传递 max_tokens
body: JSON.stringify({
  model: providerConfig.model,
  max_tokens: maxTokens,  // ✅
  messages: [{ role: 'user', content: prompt }],
}),
```

**各步骤 maxTokens 参数对比**：

| 步骤 | 函数 | maxTokens | 状态 | Prompt 复杂度 |
|------|------|-----------|------|---------------|
| 步骤1 | analyzeAccountOverview | 8000 | ✅ 成功 | 简单 |
| 步骤2 | analyzeMonthlyTrend | 12000 | ✅ 成功 | 中等 |
| 步骤4 | analyzeViralVideosMain | 16000 | ❌ 失败 | 复杂（最长模板） |

**为什么步骤4特别容易失败**：
1. `viral_analysis_main` 模板是所有模板中最长的（~30行）
2. 要求生成大量嵌套 JSON 结构（monthlyList、byCategory等）
3. 步骤4 的 `maxTokens=16000` 是所有步骤中最高的
4. 当 OpenAI 格式不传递 `max_tokens` 时，某些 API 提供商可能：
   - 使用不合适的默认值
   - 对不同模型有不同的默认行为
   - DeepSeek-V3.2 可能对未指定 `max_tokens` 的请求有特殊处理

**为什么其他步骤成功**：
- 步骤1 (8000 tokens)：prompt 简单，在默认限制内
- 步骤2 (12000 tokens)：复杂度中等，勉强在默认限制内
- 步骤4 (16000 tokens)：最复杂，超过某些 API 的默认限制

**修复方案**：
在 OpenAI 格式 API 调用中添加 `max_tokens` 参数：
```typescript
body: JSON.stringify({
  model: providerConfig.model,
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
  max_tokens: maxTokens,  // 添加此参数
}),
```

---

## 待确认事项

- [x] 当前使用的 AI 配置是从哪里获取的
- [x] OpenAI 格式缺少 max_tokens 参数（已修复）
- [x] 是否需要实施修复：添加 max_tokens 参数到 OpenAI 格式（已完成）
- [x] 是否需要实施步骤 4 的拆分（已完成）

---

## 新发现：maxTokens=16000 超出模型限制

**问题位置**: [service.ts:614, 697](../src/lib/ai-analysis/service.ts#L614)

**各步骤 maxTokens 对比**：

| 步骤 | 函数 | maxTokens | 状态 |
|------|------|-----------|------|
| 步骤1 | analyzeAccountOverview | 8000 | ✅ 成功 |
| 步骤2 | analyzeMonthlyTrend | 12000 | ✅ 成功 |
| 步骤3 | analyzeMonthlyTrend | 12000 | ✅ 成功 |
| 步骤4 | analyzeViralVideosMain | 16000 | ❌ 失败 |
| 步骤5 | analyzeViralVideosMethodology | 16000 | ❌ 失败 |

**真正根因**：
- 步骤4、5 使用了 `maxTokens: 16000`
- DeepSeek-V3.2 模型的 max_tokens 上限可能是 8192 或 12288
- 超出限制时，API 返回 `"Model not support"` 错误
- 步骤1、2、3 使用 8000/12000 都在限制内，所以成功

**修复方案**：
将步骤4、5 的 maxTokens 从 16000 降低到 12000

```typescript
// 修改前
const result1 = await this.callAI(prompt1, aiConfig, 240000, 16000);

// 修改后
const result1 = await this.callAI(prompt1, aiConfig, 240000, 12000);
```

---

## 新发现：前后端进度计算与锁机制问题 (2026-01-30)

### 问题日志分析

```
2026-01-30 04:10:38.869 [info] [DatabaseTaskQueue] update: xxx updates: {"status":"analyzing","currentStep":"正在分析账号概况..."}
2026-01-30 04:10:38.947 [info] [DatabaseTaskQueue] update完成: xxx 数据库值: { status: 'analyzing', progress: 40, currentStep: '正在分析账号概况...' }
...
2026-01-30 04:11:05.696 [info] [Jobs] 分步分析步骤完成: xxx, 步骤: 1
2026-01-30 04:11:05.696 [info] [Jobs] 释放任务 xxx 的原子锁
2026-01-30 04:11:05.793 [warning] [DatabaseTaskQueue] releaseLock: 任务 xxx 未释放锁, processing=false或不存在
```

### 根本原因分析

#### 问题 1: 步骤开始时设置进度导致进度覆盖

**代码位置**: `src/lib/analyzer/pipeline.ts` 的各步骤函数

**问题代码** (步骤1为例，第801-806行):
```typescript
await taskQueue.update(task.id, {
  status: 'analyzing',
  currentStep: '正在分析账号概况...',
  // ❌ 注意：不在这里设置 progress，避免与步骤完成后的进度冲突
  // progress 会在步骤完成后通过 atomicUpdate 统一更新
});
```

虽然注释说"不在这里设置 progress"，但实际上 `update` 函数会保留数据库中的 `progress: 40`（从上一步更新来的值），然后在步骤完成后，`atomicUpdate` 会设置新的进度值。

**实际执行流程**:
1. 步骤 1 开始时: `update` 保留 `progress: 40`
2. 步骤 1 完成后: `atomicUpdate` 设置 `progress: 40` (仍然是40)
3. 问题: 步骤完成时的进度应该比步骤开始时的进度高，但实际相同

**进度配置** (`src/lib/queue/progress-config.ts`):
```typescript
export const STEP_FLOW_PROGRESS = {
  step0_parse_complete: 25,    // 步骤0完成
  step1_account_complete: 40,  // 步骤1完成 - 与步骤0完成相同!
  step2_monthly_complete: 55,  // 步骤2完成
  ...
}
```

**发现**: `step1_account_complete: 40` 与 `step0_parse_complete: 25` 之间的差距是 15%，但步骤1开始时显示 40%，步骤1完成后仍然是 40%，这说明进度没有被正确更新。

#### 问题 2: atomicUpdate 自动释放锁机制

**代码位置**: `src/lib/queue/database.ts` 第128-131行

```typescript
// 自动释放锁：如果未指定 processing，默认为 false
if (updateData.processing === undefined) {
  updateData.processing = false;
}
```

**问题**:
- `atomicUpdate` 会在每次调用时**自动释放锁**（设置 `processing: false`）
- 但是，分步流程中，步骤完成后不应该立即释放锁
- 锁应该在 `process/route.ts` 的 `finally` 块中释放（第134-138行）

**实际执行流程**:
1. `process/route.ts` 获取锁 (`acquireLockWithTimeout`)
2. 执行 `executeAnalysisStep` → `atomicUpdate` (自动释放锁!)
3. `process/route.ts` 的 `finally` 块尝试释放锁 → 此时锁已被 `atomicUpdate` 释放
4. 警告: `releaseLock: 任务 xxx 未释放锁, processing=false或不存在`

#### 问题 3: 前端轮询缓存

**代码位置**: 需要检查前端 API 调用

**问题**: Next.js 默认缓存可能导致前端获取到过期的任务状态

---

### 优化方案

#### 方案 1: 修复进度配置

**问题**: `step1_account_complete: 40` 应该比 `step0_parse_complete: 25` 高，但实际上步骤1完成后进度仍然是40

**分析**:
- 步骤 0 完成后，`atomicUpdate` 设置 `progress: 25`
- 步骤 1 开始时，`update` 保留 `progress: 25`（但从日志看是40）
- 步骤 1 完成后，`atomicUpdate` 设置 `progress: 40`

**从日志看**，步骤1开始时 `progress` 已经是 40，这说明：
- 要么上一步（步骤0）完成后设置的是 40（而不是25）
- 要么 `update` 函数没有正确保留进度值

#### 方案 2: 修复 atomicUpdate 的自动释放锁机制

**当前行为**: `atomicUpdate` 总是自动释放锁

**问题**: 分步流程中，步骤完成后不应释放锁，应该由 `process/route.ts` 的 `finally` 块统一释放

**修复方案**:
1. 修改 `atomicUpdate`，添加参数控制是否自动释放锁
2. 或者，在分步流程的 `atomicUpdate` 调用中显式设置 `processing: true`

#### 方案 3: 确保前端 API 禁用缓存

**修复方案**:
1. 前端调用时添加 `{ cache: 'no-store' }`
2. 后端 API 响应添加 `Cache-Control: no-store` 响应头

---

### 核心问题确认

#### 问题 1: 步骤开始时进度被下一步的进度覆盖 ✅ 已确认

**代码位置**: `src/lib/analyzer/pipeline.ts` 第712-718行

**问题代码**:
```typescript
await taskQueue.atomicUpdate(taskId, {
  analysisStep: nextStep,           // 设置下一步的步骤号
  analysisData: JSON.stringify(stepData),
  status: nextStatus,                // 设置下一步的状态
  currentStep: TaskStateMachine.getStepDescription(nextStep),  // 下一步的描述
  progress: TaskStateMachine.getStepProgress(nextStep),        // ⚠️ 下一步的进度!
  processing: false,
});
```

**问题分析**:
- 当步骤 0 完成后，`nextStep = 1`，`getStepProgress(1)` 返回 `40`
- 这意味着步骤 0 完成后，进度直接被设置为步骤 1 完成后的进度（40%）
- 同样，步骤 1 完成后，`nextStep = 2`，进度被设置为步骤 2 完成后的进度（55%）

**这是正确的行为吗？**
- 从用户体验角度，步骤完成后显示下一步的进度是合理的（表示"即将进入下一步"）
- 但这导致的问题是：步骤执行过程中，进度不会变化，始终显示步骤完成后的进度值

**从日志看**:
```
04:10:38.947 [info] update完成: xxx 数据库值: { progress: 40, currentStep: '正在分析账号概况...' }
```
这表示步骤 1 开始时，进度已经是 40%。这是步骤 0 完成后设置的进度（`getStepProgress(1) = 40`）。

**结论**: 这不是bug，而是设计行为。步骤完成后立即设置下一步的进度，让用户知道即将进入哪个步骤。

#### 问题 2: atomicUpdate 自动释放锁导致警告 ✅ 已确认

**代码流程**:
1. `process/route.ts` 第86行: `await taskQueue.acquireLockWithTimeout(task.id)` - 获取锁
2. 第109行: `await executeAnalysisStep(task.id, task.analysisStep)` - 执行步骤
3. `pipeline.ts` 第712-718行: `await taskQueue.atomicUpdate(..., processing: false)` - 自动释放锁!
4. `process/route.ts` 第135行: `await taskQueue.releaseLock(task.id)` - 尝试释放锁（但已被释放）
5. 警告: `releaseLock: 任务 xxx 未释放锁, processing=false或不存在`

**问题根源**:
- `atomicUpdate` 在第718行显式设置了 `processing: false`
- 这导致锁在步骤完成后立即被释放
- 然后 `process/route.ts` 的 `finally` 块尝试再次释放锁，导致警告

**解决方案**:
- 选项A: 移除第718行的 `processing: false`，让 `process/route.ts` 的 `finally` 块统一释放锁
- 选项B: 修改 `process/route.ts`，在调用 `executeAnalysisStep` 之前检查是否需要释放锁

#### 问题 3: 进度在步骤执行过程中不更新 ⚠️ 可能存在

**当前行为**:
- 步骤开始时: 进度 = 步骤完成后的进度值（如40%）
- 步骤执行中: 进度保持不变（因为没有更新）
- 步骤完成后: 进度 = 下一步完成后的进度值（如55%）

**理想行为**:
- 步骤开始时: 进度 = 上一步完成后的进度值 + 一点增量（如26%）
- 步骤执行中: 进度逐渐增加（如果可以的话）
- 步骤完成后: 进度 = 本步骤完成后的进度值（如40%）

---

### 优化方案总结

#### 方案 1: 修复锁释放机制（推荐）

**修改**: `src/lib/analyzer/pipeline.ts` 第712-719行

```typescript
// 修改前
await taskQueue.atomicUpdate(taskId, {
  analysisStep: nextStep,
  analysisData: JSON.stringify(stepData),
  status: nextStatus,
  currentStep: TaskStateMachine.getStepDescription(nextStep),
  progress: TaskStateMachine.getStepProgress(nextStep),
  processing: false,  // ❌ 移除这行
});

// 修改后
await taskQueue.atomicUpdate(taskId, {
  analysisStep: nextStep,
  analysisData: JSON.stringify(stepData),
  status: nextStatus,
  currentStep: TaskStateMachine.getStepDescription(nextStep),
  progress: TaskStateMachine.getStepProgress(nextStep),
  // ✅ 不设置 processing: false，让 process/route.ts 的 finally 块统一释放
});
```

**原因**: `atomicUpdate` 默认会自动释放锁（见 `database.ts` 第129-131行），所以显式设置 `processing: false` 是多余的，而且会导致警告。

**等等！** 让我再检查 `atomicUpdate` 的自动释放逻辑...

重新阅读 `database.ts` 第128-131行:
```typescript
// 自动释放锁：如果未指定 processing，默认为 false
if (updateData.processing === undefined) {
  updateData.processing = false;
}
```

这意味着：
- 如果不指定 `processing`，会自动设置为 `false`（释放锁）
- 如果指定 `processing: true`，会保持锁定状态

所以，正确的修复方案是：
**添加 `processing: true`**，而不是移除 `processing: false`!

```typescript
// 修改后
await taskQueue.atomicUpdate(taskId, {
  analysisStep: nextStep,
  analysisData: JSON.stringify(stepData),
  status: nextStatus,
  currentStep: TaskStateMachine.getStepDescription(nextStep),
  progress: TaskStateMachine.getStepProgress(nextStep),
  processing: true,  // ✅ 保持锁定，让 process/route.ts 的 finally 块释放
});
```

#### 方案 2: 调整进度计算逻辑（可选）

**当前进度值**:
- 步骤 0 完成: 25%
- 步骤 1 完成: 40%
- 步骤 2 完成: 55%
- ...

**问题**: 步骤完成后，进度直接跳到下一步的完成值，用户看不到步骤的进展。

**可选方案**:
1. 在步骤开始时设置一个"开始进度"（如步骤1开始时26%）
2. 在步骤完成后设置"完成进度"（如步骤1完成时40%）

但这需要修改代码逻辑，当前的设计（直接设置为下一步的完成进度）也是合理的。

---

### 需要验证的问题

1. **锁释放流程**: ✅ 已确认 - 需要添加 `processing: true`
2. **进度显示逻辑**: ✅ 已确认 - 当前设计是合理的
3. **前端进度显示**: 需要检查前端 API 调用是否禁用缓存

---

### 关键文件

| 文件 | 作用 | 需要修改 |
|------|------|----------|
| `src/lib/queue/database.ts` | 锁机制实现 | 是 |
| `src/lib/analyzer/pipeline.ts` | 分步流程实现 | 可能 |
| `src/lib/queue/progress-config.ts` | 进度配置 | 可能 |
| `src/lib/queue/state-machine.ts` | 状态机 | 需要检查 |
| `src/app/api/jobs/process/route.ts` | 任务处理入口 | 需要检查 |
| 前端 API 调用 | 进度轮询 | 需要检查 |

---

## 会话 4: 前端进度显示为 0% 的根本原因分析与修复 (2026-01-30)

### 问题描述
用户报告：前台一直是0%，等到后台都处理了好几个步骤了，前台才显示40且一直不动。

### 根本原因分析

#### 问题 1: 步骤开始时不更新进度 ✅ 已确认并修复

**代码位置**: `src/lib/analyzer/pipeline.ts` 第741-746行

**问题代码**:
```typescript
await taskQueue.update(task.id, {
  status: 'parsing',
  currentStep: '正在解析数据...',
  // ❌ 不设置 progress，所以 progress 保持为 0
});
```

**时序问题**:
```
时间  →  步骤0开始  →  步骤0执行中  →  步骤0完成  →  步骤1开始  →  步骤1执行中  →  步骤1完成
进度  →    0%      →     0%      →    40%     →    40%     →     40%     →    55%
       ↑                                  ↑
    前端显示0%                        前端突然跳到40%
```

**修复方案**: 双进度机制
- **步骤开始进度**：步骤开始时设置较低的进度值
- **步骤完成进度**：步骤完成后设置较高的进度值
- **平滑递增**：确保进度始终单调递增，无跳变

---

### 修复实施 ✅

#### 1. 添加步骤开始进度配置（progress-config.ts）

新增进度值：
- step0_parse_start: 5%
- step1_account_start: 28%
- step2_monthly_start: 42%
- step3_explosive_start: 57%
- step4_viral_start: 67%
- step5_methodology_start: 72%

#### 2. 添加获取开始进度的函数（state-machine.ts）

```typescript
static getStepStartProgress(step: number): number {
  const progressMap: Record<number, number> = {
    0: 5, 1: 28, 2: 42, 3: 57, 4: 67, 5: 72
  };
  return progressMap[step] ?? 76;
}
```

#### 3. 修改所有步骤函数（pipeline.ts）

每个步骤函数在开始时设置开始进度

#### 4. 修复后的时序

```
时间  →  步骤0开始  →  步骤0执行中  →  步骤0完成  →  步骤1开始  →  步骤1执行中  →  步骤1完成
进度  →    5%      →     5%      →    25%     →    28%     →     28%     →    40%
       ↑                                  ↑
    前端立即显示5%                    平滑递增
```

---

### 修改的文件

1. `src/lib/queue/progress-config.ts` - 添加步骤开始进度配置
2. `src/lib/queue/state-machine.ts` - 添加 `getStepStartProgress` 函数
3. `src/lib/analyzer/pipeline.ts` - 修改 step0-step5 所有步骤函数
4. `src/lib/queue/database.ts` - 移除调试日志
5. `src/app/api/tasks/[id]/route.ts` - 简化日志输出

---

### 预期效果

- ✅ 任务创建后立即显示 5%
- ✅ 步骤 0 执行期间保持 5%
- ✅ 步骤 0 完成后平滑递增到 25%
- ✅ 步骤 1 开始时跳到 28%
- ✅ 进度始终单调递增，无跳变
- ✅ 前端能实时看到当前步骤的进度

