# 进度日志：修复 Vercel 超时和 AI 模型问题

**创建时间**: 2026-01-27

---

## 会话 1：问题诊断与修复

### 已完成
1. ✅ 探索代码库，了解 AI 调用配置
2. ✅ 阅读 vercel.json 和 process/route.ts
3. ✅ 阅读 AI 分析服务的实现代码
4. ✅ 创建规划文件 (task_plan.md, findings.md, progress.md)
5. ✅ 分析问题根本原因
6. ✅ 修改 AI 调用超时从 300s → 240s
7. ✅ 拆分 analyzeViralVideos 函数为两个独立函数
8. ✅ 修改 pipeline.ts 的 step4_ViralMain 和 step5_Methodology
9. ✅ 验证代码修改

### 当前状态
- 已完成超时修复
- 已完成步骤 4 拆分
- 等待用户更新 AI 模型配置

### 下一步
用户更新 AI 模型名称配置后测试完整流程

---

## 会话 2：深度分析 - 发现真正根因

### 用户反馈
用户指出：
- 其他步骤使用相同模型 (DeepSeek-V3.2) 成功
- 该模型在重构前工作正常
- 要求基于其他模块的 AI 调用模式分析问题

### 新发现：OpenAI 格式缺少 max_tokens 参数 ✅

**问题位置**: [service.ts:1278-1282](../src/lib/ai-analysis/service.ts#L1278-L1282)

**关键发现**：
- OpenAI 格式 API 调用**没有传递** `max_tokens` 参数
- Claude 格式**正确传递**了 `max_tokens` 参数
- 步骤4 要求 16000 tokens（所有步骤最高），模板最复杂
- 某些 API 提供商对未指定 `max_tokens` 的请求有默认行为差异

**各步骤对比**：

| 步骤 | maxTokens | Prompt 复杂度 | 状态 |
|------|-----------|---------------|------|
| 步骤1 | 8000 | 简单 | ✅ 成功 |
| 步骤2 | 12000 | 中等 | ✅ 成功 |
| 步骤4 | 16000 | 复杂（最长模板） | ❌ 失败 |

### 待修复
- [ ] 在 OpenAI 格式 API 调用中添加 `max_tokens` 参数

### 修复实施 ✅

**修改文件**: [src/lib/ai-analysis/service.ts:1282](../src/lib/ai-analysis/service.ts#L1282)

**修改内容**: 在 OpenAI 格式 API 调用中添加 `max_tokens: maxTokens` 参数

**修改后**:
```typescript
body: JSON.stringify({
  model: providerConfig.model,
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
  max_tokens: maxTokens,  // ✅ 已添加
}),
```

---

## 会话 3：前后端进度计算与锁机制问题 (2026-01-30)

### 问题日志
```
2026-01-30 04:10:38.947 [info] update完成: xxx 数据库值: { progress: 40, currentStep: '正在分析账号概况...' }
...
2026-01-30 04:11:05.793 [warning] [DatabaseTaskQueue] releaseLock: 任务 xxx 未释放锁, processing=false或不存在
```

### 问题分析
1. **进度显示**: 步骤完成后，进度直接设置为下一步的完成进度（如步骤0完成后设置为40%），这是设计行为
2. **锁释放警告**: `atomicUpdate` 在步骤完成后设置了 `processing: false`，导致锁被释放，然后 `process/route.ts` 的 `finally` 块尝试再次释放锁

### 修复实施 ✅

**修改文件**: [src/lib/analyzer/pipeline.ts:712-719](../src/lib/analyzer/pipeline.ts#L712-L719)

**修改内容**: 将 `processing: false` 改为 `processing: true`

**修改前**:
```typescript
await taskQueue.atomicUpdate(taskId, {
  analysisStep: nextStep,
  analysisData: JSON.stringify(stepData),
  status: nextStatus,
  currentStep: TaskStateMachine.getStepDescription(nextStep),
  progress: TaskStateMachine.getStepProgress(nextStep),
  processing: false,  // ❌ 导致锁被提前释放
});
```

**修改后**:
```typescript
await taskQueue.atomicUpdate(taskId, {
  analysisStep: nextStep,
  analysisData: JSON.stringify(stepData),
  status: nextStatus,
  currentStep: TaskStateMachine.getStepDescription(nextStep),
  progress: TaskStateMachine.getStepProgress(nextStep),
  processing: true,  // ✅ 保持锁定，由 process/route.ts 的 finally 块统一释放
});
```

### 验证结果
- ✅ 前端 API 已设置 `Cache-Control: no-store`
- ✅ 前端 fetch 已设置 `{ cache: 'no-store' }`
- ⏳ 等待部署验证
