# 研究发现 - 账号名称显示问题

创建时间: 2025-01-23

## 问题1: 报告页面账号名称不正确

### 数据流追踪

```
page.tsx (提取) → analyze API → taskQueue → pipeline.ts → resultData → report page
```

### 关键发现

1. **报告页面显示的是 AI 生成的账号名称** (`report.account.name`)
   - 在 `ReportViewer.tsx` 第145行显示 `report.account.name`
   - 这个 `name` 来自 AI 分析结果 (`AccountAnalysis.name`)

2. **从文件名提取的账号名称存储在 task.accountName**
   - 存储在 `Task.accountName` 字段中
   - 但没有传递到 `Report.account` 中

3. **问题根因**:
   - AI 分析生成的是通用的账号名称（如"情感疗愈博主"）
   - 从文件名提取的真实账号名称（如"张三"）存储在 task.accountName 中
   - 报告页面只显示 AI 生成的名称，没有使用真实账号名称

### 数据流图

```
文件名提取 → task.accountName → taskQueue
                                   ↓
AI分析 → resultData.account.name (AI生成的名称)
                                   ↓
                            Report.account.name ← 报告页面显示
```

## 问题2: 导出文件名账号名称乱码

### 文件名生成逻辑

在 `download/route.ts`:
```typescript
const accountName = task.accountName || resultData.account?.name || '账号';
filename = `分析报告_${accountName}（博主名称）.docx`;
```

### 可能原因

1. **中文文件名编码问题** - 浏览器下载时 UTF-8 编码可能未正确处理
2. **Content-Disposition header 需要特殊处理中文**

### 修复方案

使用 RFC 5987 编码格式处理中文文件名：
```
Content-Disposition: attachment; filename*=UTF-8''encoded_filename
```
