# 账号名称显示问题修复计划

创建时间: 2025-01-23

## 问题描述

1. **分析结果页面账号名称不正确** - 页面显示的是AI生成的账号名称（如"情感疗愈博主"），而不是从文件名提取的真实账号名称（如"张三"）
2. **导出文件名账号名称乱码** - 导出文件名中的中文账号名称显示为乱码

## 根因分析

### 问题1根因
- AI分析生成通用账号名称 → `resultData.account.name`
- 文件名提取真实账号名称 → `task.accountName`
- 报告页面只显示 `account.name`，没有使用真实的 `accountName`

### 问题2根因
- 中文文件名在 Content-Disposition header 中需要使用 RFC 5987 编码

## 修复方案

### 阶段1: 修复报告页面显示 ✅

**方案**: 修改报告API返回数据结构，包含真实账号名称

#### 步骤1.1: 修改报告API ✅
- 文件: `src/app/api/report/[id]/route.ts`
- 在返回数据中添加 `realAccountName: task.accountName`

#### 步骤1.2: 修改类型定义 ✅
- 文件: `src/types/index.ts`
- `Report` 接口添加 `realAccountName?: string | null`

#### 步骤1.3: 修改报告页面显示 ✅
- 文件: `src/components/report/ReportViewer.tsx`
- 添加 `const displayName = report.realAccountName || report.account.name`
- 显示 `displayName` 而不是直接显示 `report.account.name`

### 阶段2: 修复导出文件名编码 ✅

#### 步骤2.1: 修改文件名编码 ✅
- 文件: `src/app/api/report/[id]/download/route.ts`
- 使用 RFC 5987 格式: `Content-Disposition: attachment; filename="xxx"; filename*=UTF-8''encoded_name`

### 阶段3: 测试验证 ✅

- TypeScript 类型检查通过

## 阶段状态

| 阶段 | 状态 | 完成时间 |
|------|------|----------|
| 阶段1: 报告页面显示 | complete | 2025-01-23 |
| 阶段2: 导出文件名编码 | complete | 2025-01-23 |
| 阶段3: 测试验证 | complete | 2025-01-23 |

## 错误日志

(无错误)

## 修改的文件

1. `src/types/index.ts` - 添加 `Report.realAccountName` 字段
2. `src/app/api/report/[id]/route.ts` - 返回真实账号名称
3. `src/components/report/ReportViewer.tsx` - 优先显示真实账号名称
4. `src/app/api/report/[id]/download/route.ts` - 修复中文文件名编码
