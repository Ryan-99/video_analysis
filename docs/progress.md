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
