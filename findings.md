# Findings: 55% 卡住问题分析

**更新时间**: 2025-01-27

---

## 问题现象

分析页面卡在 **55% "分析爆款视频"** 阶段

---

## 代码分析

### 调用链路
```
pipeline.ts (55%)
  ↓
aiAnalysisService.analyzeViralVideos()
  ↓
callAI() × 2次
  ↓
executeFetch() (timeout: 300000ms = 5分钟)
```

### 两次 AI 调用

| 调用 | Prompt | 超时 | maxTokens |
|------|--------|------|-----------|
| 第1次 | `viral_analysis_main` | 300秒 | 16000 |
| 第2次 | `viral_analysis_methodology` | 300秒 | 16000 |

### 可能的原因

1. **数据量过大**
   ```typescript
   const viralDetail = virals.map(v => {
     // 格式化每一条爆款视频
     return `${publishTime} | ${v.title} | ...`;
   }).join('\n');  // 所有爆款视频用 \n 连接
   ```

   如果爆款视频有几百条，`viralDetail` 字符串会非常大，可能导致：
   - API 请求体过大
   - AI 处理时间过长
   - 超出 token 限制

2. **maxTokens 设置**
   - 当前设置：16000 tokens
   - 如果 AI 响应很长，可能会超过这个限制

3. **网络/API 问题**
   - API 响应慢
   - 网络连接不稳定

---

## 解决方案

### 方案 1：增加超时时间（推荐）
将超时从 300 秒（5分钟）增加到更长时间：

```typescript
// 修改 service.ts 第 659 行和 676 行
const result1 = await this.callAI(prompt1, aiConfig, 600000, 32000); // 10分钟，32000 tokens
const result2 = await this.callAI(prompt2, aiConfig, 600000, 32000); // 10分钟，32000 tokens
```

### 方案 2：限制爆款视频数量
如果爆款视频太多，只取前 N 条进行 AI 分析：

```typescript
const maxVideosForAI = 100; // 最多分析100条
const viralsForAnalysis = virals.slice(0, maxVideosForAI);
```

### 方案 3：分批处理
将爆款视频分批发送给 AI，然后合并结果。

---

## 建议

**优先尝试方案 1**：增加超时时间和 maxTokens，因为：
1. 实现简单
2. 不影响功能
3. 能解决大部分情况

如果方案 1 无效，再考虑方案 2 或 3。
