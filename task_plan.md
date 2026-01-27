# Task Plan: 拆分分析流程解决 Vercel 超时问题

**创建时间**: 2025-01-27
**完成时间**: 2025-01-27
**目标**: 将 executeAnalysis 拆分成多个步骤，每次调用执行一步

---

## 问题根因

`executeAnalysis` 函数在一次调用中执行所有 AI 分析步骤，总时间超过 300 秒导致 Vercel 超时。

---

## 解决方案

### 核心思路
利用现有任务队列，**每次 `/api/jobs/process` 调用只执行一个分析步骤**。

### 实施步骤

#### Step 1: 扩展数据模型 ✅
- 在 Prisma schema 添加 `analysisStep`, `analysisData`, `fileContent` 字段
- 在 Task 类型添加对应字段

#### Step 2: 拆分 executeAnalysis ✅
```typescript
// 新增函数
executeAnalysisStep(taskId, step) // 根据 step 执行对应步骤
step0_ParseData() ~ step6_Complete() // 各步骤实现
```

#### Step 3: 修改 jobs/process ✅
根据 `task.analysisStep` 路由到对应步骤

#### Step 4: 解决 Blob URL 过期问题 ✅
- 上传时保存 Base64 文件内容到数据库
- 分步执行时从数据库读取，不依赖 Blob URL

---

## 进度跟踪

| 步骤 | 状态 | 文件 |
|------|------|------|
| 1. 修改 Prisma schema | ✅ 完成 | prisma/schema.prisma |
| 2. 更新 Task 类型 | ✅ 完成 | types/index.ts |
| 3. 修改 parse API | ✅ 完成 | app/api/parse/route.ts |
| 4. 修改 analyze API | ✅ 完成 | app/api/analyze/route.ts |
| 5. 拆分 pipeline 逻辑 | ✅ 完成 | lib/analyzer/pipeline.ts |
| 6. 修改 jobs/process | ✅ 完成 | app/api/jobs/process/route.ts |
| 7. 运行迁移 | ✅ 完成 | prisma db push |
| 8. Git 提交部署 | ✅ 完成 | ce40129 |

---

## 分析步骤定义

| analysisStep | 名称 | 预计时间 | 函数 |
|--------------|------|----------|------|
| 0 | 解析数据 | 5秒 | step0_ParseData |
| 1 | 账号概况 AI | 60秒 | step1_AccountOverview |
| 2 | 月度趋势 AI | 70秒 | step2_MonthlyTrend |
| 3 | 爆发期详情 AI | 140秒 | step3_ExplosivePeriods |
| 4 | 爆款主分析 AI | 90秒 | step4_ViralMain |
| 5 | 方法论 AI | 60秒 | step5_Methodology |
| 6 | 完成 | 1秒 | step6_Complete |

---

## 提交记录

```
ce40129 feat: 实现分步执行架构解决 Vercel 超时问题
```

---

## 兼容性说明

1. **向后兼容**: 保留 `executeAnalysis()` 函数，旧任务仍可用
2. **自动检测**: 任务 `analysisStep = null/undefined` 时使用旧模式
3. **渐进式**: 新任务自动使用分步模式

---

## 下一步

等待 Vercel 部署完成后进行测试验证
