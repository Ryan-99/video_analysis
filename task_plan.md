# Task Plan: 拆分分析流程解决 Vercel 超时问题

**创建时间**: 2025-01-27
**目标**: 将 executeAnalysis 拆分成多个步骤，每次调用执行一步

---

## 问题根因

`executeAnalysis` 函数在一次调用中执行所有 AI 分析步骤，总时间超过 300 秒导致 Vercel 超时。

---

## 解决方案

### 核心思路
利用现有任务队列，**每次 `/api/jobs/process` 调用只执行一个分析步骤**。

### 实施步骤

#### Step 1: 扩展数据模型
- 在 Prisma schema 添加 `analysisStep` 字段
- 在 Task 类型添加对应字段

#### Step 2: 拆分 executeAnalysis
```typescript
// 原 executeAnalysis → 拆分为：
executeAnalysisStep(task) // 根据 task.analysisStep 执行对应步骤
```

#### Step 3: 修改 jobs/process
根据 `task.analysisStep` 路由到对应步骤

---

## 进度跟踪

| 步骤 | 状态 | 文件 |
|------|------|------|
| 1. 修改 Prisma schema | in_progress | prisma/schema.prisma |
| 2. 更新 Task 类型 | pending | types/index.ts |
| 3. 拆分 pipeline 逻辑 | pending | lib/analyzer/pipeline.ts |
| 4. 修改 jobs/process | pending | app/api/jobs/process/route.ts |
| 5. 运行迁移 | pending | prisma db push |
| 6. 测试验证 | pending | - |

---

## 分析步骤定义

| analysisStep | 名称 | 预计时间 |
|--------------|------|----------|
| 0 | 解析数据 | 5秒 |
| 1 | 账号概况 AI | 60秒 |
| 2 | 月度趋势 AI | 70秒 |
| 3 | 爆发期详情 AI | 140秒 |
| 4 | 爆款主分析 AI | 90秒 |
| 5 | 方法论 AI | 60秒 |
| 6 | 完成 | 1秒 |
