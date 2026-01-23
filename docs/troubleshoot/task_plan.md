# 下载 Word 报告 500 错误排查计划

## 问题描述
- 下载 Word 报告时返回 500 错误
- 错误信息涉及 build-manifest.json 文件找不到
- Next.js 开发服务器出现 SST 文件写入失败

## 调查阶段

### 阶段 1: 收集错误信息 ✅ 完成
- [x] 分析现有的错误日志
- [x] 重现错误并捕获完整堆栈
- [x] 识别错误发生的确切位置

### 阶段 2: 检查代码逻辑 ✅ 完成
- [x] 验证 download route 的实现
- [x] 验证 word.ts 生成逻辑
- [x] **检查数据类型匹配** → 发现类型不匹配！

### 阶段 3: 测试修复方案 ✅ 完成
- [x] 应用修复
- [x] 构建测试通过 (EXIT_CODE: 0)

### 阶段 4: 验证完整流程 ⏳ 进行中
- [ ] 端到端测试 (上传→分析→下载Word)

## 错误日志

### 初始错误
```
GET /api/report/594788b6-2e35-4176-8c4d-93dc851a059a/download?format=word 500
Error: ENOENT: no such file or directory, open 'D:\Claude Code\project\test1\.next\dev\server\app\report\[reportId]\page\build-manifest.json'
```

## 根本原因已找到！

**类型不匹配**: `word.ts:182` 访问 `cat.description` 但 `Report.virals.byCategory` 类型定义中没有此字段

**AI 服务返回的数据结构**:
```typescript
byCategory: Array<{ category: string; count: number; avgEngagement: number; description: string }>
```

**Report 类型定义**:
```typescript
byCategory: Array<{ category: string; count: number; avgEngagement: number }> // ❌ 缺少 description
```

## 尝试记录

### 尝试 1: 清除 .next 缓存
- 操作: 删除 .next 文件夹
- 结果: 无效，问题不是缓存
- 日期: 2025-01-22

### 尝试 2: 类型系统分析
- 操作: 检查 types/index.ts 和 AI 服务返回类型
- 结果: **成功找到根本原因**
- 日期: 2025-01-22

## 决策记录

### 决策 1
- 内容: 添加详细日志到下载 API
- 理由: 需要更准确的错误定位
- 日期: 2025-01-22

### 决策 2
- 内容: 修复 Report 类型定义，添加 description 字段
- 理由: AI 服务返回的数据包含 description，类型定义需要匹配
- 日期: 2025-01-22

### 决策 3
- 内容: 添加 `cleanAIResponse()` 函数处理 markdown 格式 JSON
- 理由: AI 服务返回 markdown 代码块包裹的 JSON，需要清理后再解析
- 日期: 2025-01-22

### 决策 4
- 内容: 修复 TextRun 参数格式
- 理由: docx 库的 TextRun 构造函数需要 `{ text: value }` 对象格式
- 日期: 2025-01-22

### 决策 5
- 内容: 清除 .next 缓存解决构建错误
- 理由: Next.js 缓存了旧代码，导致构建时显示已修复的代码仍有错误
- 日期: 2025-01-22

### 决策 6
- 内容: 清除 .next 缓存解决开发服务器 SST 错误
- 理由: Next.js 开发服务器缓存损坏，导致 SST 文件写入失败
- 日期: 2025-01-22

## 最终状态 (2025-01-22 15:30)

### 所有修复已完成
1. ✅ 类型定义修复 (`src/types/index.ts`)
2. ✅ JSON 解析修复 (`src/lib/ai-analysis/service.ts`)
3. ✅ TextRun 语法修复 (`src/lib/report/word.ts`)
4. ✅ Next.js 构建缓存 (清除 .next 目录)
5. ✅ Next.js 开发服务器缓存 (清除 .next 目录并重启)
6. ✅ 构建测试通过 (npm run build)

### 下一步
- 等待用户重启 dev server
- 测试完整分析流程
- 验证 Word 报告下载功能正常工作

### 关键教训
遇到以下错误时，清除 `.next` 目录并重启开发服务器：
- `Persisting failed: Unable to write SST file`
- `ENOENT: build-manifest.json`
- 构建错误与文件内容不一致
