# Findings: 55% 超时问题分析与修复

**更新时间**: 2025-01-27

---

## 问题现象

分析页面卡在 **55% "分析爆款视频"** 阶段

```
Vercel Runtime Timeout Error: Task timed out after 300 seconds
```

---

## 根本原因

### Vercel Serverless Function 超时限制

`/api/jobs/process` 的 `maxDuration = 300` 秒（5分钟），但完整的分析流程包含：

| 步骤 | 描述 | 耗时 |
|------|------|------|
| 1 | 解析数据 | ~5秒 |
| 2 | 计算指标 | ~10秒 |
| 3 | AI 账号概况 | ~56秒 |
| 4 | AI 月度趋势 | ~67秒 |
| 5 | AI 爆发期详情 | ~134秒 |
| 6 | **AI 爆款主分析** | **> 60秒** ❌ |
| 7 | AI 方法论抽象 | 未执行 |

**累计时间 > 300 秒 → 超时**

### 调用链路
```
/api/jobs/process (maxDuration = 300s)
  └── executeAnalysis() 一次性执行所有步骤
      └── analyzeViralVideos() 包含 2 次 AI 调用
          ├── viral_analysis_main (300秒超时设置)
          └── viral_analysis_methodology (300秒超时设置)
```

---

## 解决方案

### 临时修复（已废弃）

**跳过耗时的 `analyzeViralVideos` AI 调用，使用简化数据**

### 完整解决方案（已实现）✅

**将分析流程拆分为独立步骤，每次调用执行一步**

#### 数据模型变更
- `analysisStep`: 当前步骤 (0-6)
- `analysisData`: 临时存储中间数据（JSON）
- `fileContent`: Base64 编码的文件内容（解决 Blob URL 过期）

#### 步骤定义
| analysisStep | 名称 | 预计时间 | 说明 |
|--------------|------|----------|------|
| 0 | 解析数据 | 5秒 | 解析Excel + 计算指标 |
| 1 | 账号概况 AI | 60秒 | AI 分析账号定位 |
| 2 | 月度趋势 AI | 70秒 | AI 分析趋势 + 阶段划分 |
| 3 | 爆发期详情 AI | 140秒 | AI 分析爆发期细节 |
| 4 | 爆款主分析 AI | 90秒 | AI 爆款分类 + 规律 |
| 5 | 方法论 AI | 60秒 | AI 方法论抽象 |
| 6 | 完成 | 1秒 | 保存结果，进入选题生成 |

#### 执行流程
```
/api/jobs/process
  ├── 检查 task.analysisStep
  ├── 调用 executeAnalysisStep(taskId, step)
  ├── 保存中间数据到 task.analysisData
  └── 更新 task.analysisStep = step + 1
```

#### Blob URL 过期解决方案
- 上传时将文件内容转为 Base64 并保存到 `fileContent` 字段
- 分步执行时直接从数据库读取，不依赖 Blob URL
- 优先级: Base64 > Blob URL > 本地文件

---

## 提交记录

```
ce40129 feat: 实现分步执行架构解决 Vercel 超时问题
b80431a fix: 临时修复 Vercel 超时问题（跳过耗时 AI 分析）
```

---

## 关键文件变更

### 数据库 (prisma/schema.prisma)
- 新增 `fileContent String?` 字段
- 保留 `analysisStep`, `analysisData` 字段

### 类型定义 (src/types/index.ts)
- Task 接口新增 `fileContent` 字段

### API 层
- `src/app/api/parse/route.ts`: 返回 Base64 文件内容
- `src/app/api/analyze/route.ts`: 保存 Base64 文件内容
- `src/app/api/jobs/process/route.ts`: 分步路由逻辑

### 核心逻辑 (src/lib/analyzer/pipeline.ts)
- 新增 `executeAnalysisStep()` 主函数
- 新增 `step0_ParseData()` ~ `step6_Complete()` 步骤函数
- 修改 `parseData()` 支持从 Base64 读取
- 保留 `executeAnalysis()` 兼容旧任务

---

## 测试建议

1. **创建新分析任务** - 验证分步执行是否正常工作
2. **查看 Vercel 日志** - 确认每个步骤独立执行，不超过 300 秒
3. **检查分析结果** - 确认完整 AI 分析功能恢复
4. **测试 Blob URL 过期场景** - 等待 1 小时后继续执行，验证 Base64 读取

---

## 兼容性说明

- **向后兼容**: 保留旧 `executeAnalysis()` 函数，旧任务仍可用
- **自动迁移**: 旧任务 `analysisStep = null` 时自动使用旧模式
- **渐进式**: 新任务使用分步模式，逐步切换
