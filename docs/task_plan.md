# 任务计划：修复 Vercel 超时和 AI 模型不支持问题

**创建时间**: 2026-01-27
**问题 ID**: ISSUE-001

---

## 问题概述

从错误日志中发现两个主要问题：

1. **Vercel Runtime 超时错误**
   ```
   Vercel Runtime Timeout Error: Task timed out after 300 seconds
   ```

2. **AI 模型不支持错误**
   ```
   OpenAI API错误 (400): {"error":{"message":"Model not support","type":"rix_api_error"}}
   ```

---

## 阶段划分

### 阶段 1：问题诊断 [complete]
- [x] 分析超时原因
- [x] 定位 AI 模型配置问题
- [x] 确定根本原因

**阶段 1 总结**：
- 超时原因：Vercel maxDuration=300s，AI 调用超时=300s，两次连续调用超限
- 模型问题：用户配置的 `DeepSeek-V3.2` 模型名称不被 API 支持
- 修复方案：组合方案 C（拆分步骤 + 减少超时 + 模型验证）

### 阶段 2：实施修复 [complete]

#### 2.1 减少超时时间 [complete]
- [x] 修改 service.ts 中 AI 调用超时从 300s → 240s

**修改的文件**：
- src/lib/ai-analysis/service.ts:412 (analyzeMonthlyTrend 第一次调用)
- src/lib/ai-analysis/service.ts:459 (analyzeMonthlyTrend 第二次调用)
- src/lib/ai-analysis/service.ts:659 (analyzeViralVideos 第一次调用)
- src/lib/ai-analysis/service.ts:676 (analyzeViralVideos 第二次调用)
- src/lib/ai-analysis/service.ts:816 (generateTopicOutline 调用)
- src/lib/ai-analysis/service.ts:964 (generateTopicDetails 调用)

#### 2.2 拆分步骤 4 [complete]

**发现问题**：
- `analyzeViralVideos` 函数内部执行两次 AI 调用（主分析 + 方法论）
- 即使减少单次超时到 240s，两次连续调用仍可能超过 Vercel 300s 限制
- 当前 step5_Methodology 实际上不执行任何操作

**方案**：将两次 AI 调用拆分到步骤 4 和步骤 5
- 步骤 4：执行主分析（第一次 AI 调用）
- 步骤 5：执行方法论抽象（第二次 AI 调用）

**已完成**：
- [x] 修改 analyzeViralVideos，将其拆分为两个函数
- [x] 修改 pipeline.ts 的 step4_ViralMain 和 step5_Methodology
- [x] 验证代码修改

**修改的文件**：
- src/lib/ai-analysis/service.ts:543-703（添加两个新函数）
  - `analyzeViralVideosMain` - 执行主分析
  - `analyzeViralVideosMethodology` - 执行方法论抽象
- src/lib/analyzer/pipeline.ts:795-871
  - `step4_ViralMain` - 调用主分析函数
  - `step5_Methodology` - 调用方法论函数并合并结果

#### 2.3 添加模型名称验证
- [ ] 在 SettingsDialog 添加常用模型预设
- [ ] 添加模型名称验证提示

### 阶段 3：验证修复 [in_progress]
- [ ] 用户重新配置 AI 模型
- [ ] 测试完整流程
- [ ] 确认问题已解决
- [ ] 更新文档

---

## 错误日志

```
2026-01-27 13:01:31.974 [info] [AI] 调用AI: DeepSeek-V3.2, 超时: 300秒, 重试次数: 2
2026-01-27 13:01:31.974 [info] [AI] API URL: https://www.dmxapi.cn/v1
2026-01-27 13:06:30.700 [error] Vercel Runtime Timeout Error: Task timed out after 300 seconds
AI请求失败: OpenAI API错误 (400): {"error":{"message":"Model not support","type":"rix_api_error"}}
```

---

## 决策记录

| 决策 | 原因 | 日期 |
|------|------|------|
| 采用组合方案 C | 综合考虑超时和架构问题 | 2026-01-27 |
| 先减少超时 | 最简单快速，降低即时风险 | 2026-01-27 |
| 后拆分步骤 | 需要更多测试，但更稳定 | 2026-01-27 |

---

## 下一步行动

1. ✅ 修改 AI 调用超时从 300s → 240s（已完成）
2. ✅ 拆分步骤 4，将两次 AI 调用分离（已完成）
3. ⚠️ 用户需要更新 AI 模型名称配置

---

## 当前状态

**已完成**：
- ✅ 问题诊断完成
- ✅ 超时时间已减少到 240 秒
- ✅ 步骤 4 已拆分，每次只有一个 AI 调用

**待处理**：
- ⚠️ AI 模型名称配置问题（用户需要更新）

---

## 会话 3: 前后端进度计算与锁机制问题 (2026-01-30)

### 问题概述
从日志中发现锁释放警告：
```
[warning] [DatabaseTaskQueue] releaseLock: 任务 xxx 未释放锁, processing=false或不存在
```

### 阶段划分

#### 阶段 1: 代码分析 [complete]
- [x] 分析后端进度计算逻辑
- [x] 分析锁机制实现
- [x] 检查前端 API 缓存设置

**阶段 1 总结**：
- **进度显示**: 步骤完成后设置下一步的完成进度（设计行为，不是bug）
- **锁释放问题**: `atomicUpdate` 设置 `processing: false` 导致锁被提前释放
- **前端缓存**: 已正确设置 `Cache-Control: no-store` 和 `{ cache: 'no-store' }`

#### 阶段 2: 实施修复 [complete]

**修改文件**: [src/lib/analyzer/pipeline.ts:718](../src/lib/analyzer/pipeline.ts#L718)

**修改内容**: 将 `processing: false` 改为 `processing: true`

**原因**:
- `atomicUpdate` 默认会自动释放锁（`database.ts:129-131`）
- 分步流程中，步骤完成后不应释放锁，应由 `process/route.ts` 的 `finally` 块统一释放

#### 阶段 3: 部署验证 [pending]
- [ ] 部署到 Vercel
- [ ] 调用 API 测试
- [ ] 分析实时日志
- [ ] 确认问题已修复

---

### 问题分析详情

#### 问题 1: 进度在步骤开始时显示为完成值
**日志**: `update完成: xxx 数据库值: { progress: 40, currentStep: '正在分析账号概况...' }`

**原因**: 步骤 0 完成后，`atomicUpdate` 调用 `getStepProgress(1)` 返回 40（步骤1的完成进度）

**结论**: 这是设计行为，不是bug。步骤完成后立即显示下一步的进度是合理的。

#### 问题 2: 锁释放警告
**日志**: `releaseLock: 任务 xxx 未释放锁, processing=false或不存在`

**原因**:
1. `pipeline.ts:718` 设置 `processing: false`
2. 锁被 `atomicUpdate` 释放
3. `process/route.ts:135` 尝试再次释放锁
4. 警告：`processing=false或不存在`

**修复**: 将 `processing: false` 改为 `processing: true`

---

### 当前状态

**已完成**：
- ✅ 问题分析完成
- ✅ 锁释放机制修复完成

**下一步**：
- ⏳ 部署到 Vercel 并验证
