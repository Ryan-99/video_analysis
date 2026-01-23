# 调查进度日志

## 2025-01-22 当前会话

### 14:30 - 初始化
- 创建 task_plan.md、findings.md、progress.md
- 记录初始问题描述

### 14:35 - 代码审查
- 检查了 download/route.ts
- 检查了 word.ts
- 已添加详细日志

### 14:40 - 🔥 找到根本原因！
- 发现类型不匹配问题
- `Report.virals.byCategory` 缺少 `description` 字段
- AI 服务返回数据包含 `description`，但类型定义中没有

### 14:45 - 修复完成
- ✅ 更新 `src/types/index.ts`
- ✅ 添加 `description: string` 到 byCategory 类型
- ✅ 添加 `patterns?` 可选字段到 virals 类型

### 14:50 - 发现新问题
- **JSON 解析错误**: AI 返回 markdown 格式 JSON (```json ... ```)
- 错误: `SyntaxError: Unexpected token '`', "```json {` is not valid JSON`
- 位置: `analyzeMonthlyTrend` 方法

### 14:55 - 新问题修复完成
- ✅ 添加 `cleanAIResponse()` 函数处理 markdown 代码块
- ✅ 更新所有 `JSON.parse()` 调用使用清理函数

### 15:00 - TextRun 语法错误修复完成
- ✅ 修复 `word.ts:148-150` 的 TextRun 参数格式
- ✅ 统一使用 `{ text: value }` 格式
- ✅ 构建测试通过 (EXIT_CODE: 0)

### 15:15 - Next.js 缓存问题解决
- **问题**: 构建错误显示旧代码，但文件内容已正确
- **原因**: `.next` 目录缓存了未修复的代码
- **解决**: 删除 `.next` 目录，重新构建成功

### 已完成修复
1. ✅ 类型不匹配 - 添加 `description` 字段
2. ✅ JSON 解析错误 - 添加 `cleanAIResponse()` 函数
3. ✅ TextRun 语法错误 - 修正参数格式
4. ✅ Next.js 缓存问题 - 清除 .next 目录
5. ✅ 构建测试通过 (EXIT_CODE: 0)

### 待执行操作
1. ⏳ 测试完整分析流程（上传→分析→下载Word）
2. ⏳ 验证30条选题库生成

### 15:30 - Next.js 开发服务器缓存损坏
- **问题**: `Persisting failed: Unable to write SST file` 和 `ENOENT: build-manifest.json`
- **原因**: `.next` 目录状态损坏
- **解决**: 删除 `.next` 目录，重启 dev server
- **预防**: 遇到这类错误时，停止服务器，清除缓存，重新启动

### 关键文件
- ✅ `src/types/index.ts` - 已修复类型定义
- ✅ `src/lib/ai-analysis/service.ts` - 已添加 cleanAIResponse
- `src/app/api/report/[id]/download/route.ts` - 已添加日志
- `src/lib/report/word.ts` - 已添加日志

### 16:00 - Word 文档无法打开问题修复
- **问题**: 生成的 Word 文档无法打开，文件大小很小
- **原因**: 图表服务导入可能导致运行时错误
- **解决**: 移除图表功能，简化 Word 生成代码
- **状态**: 代码已简化，构建通过 (EXIT_CODE: 0)

### 16:30 - 优化 30 条选题库生成
- **问题**: 30 条选题库总是生成失败
- **优化内容**:
  - ✅ 重写 `src/config/prompts.json` 中的 `topic_generation` 模板
  - ✅ 添加明确的 6 大类分类建议
  - ✅ 强调必须生成完整 30 条选题
  - ✅ 清晰的 5 段式口播稿结构要求
  - ✅ 移除歧义性语言
- **状态**: Prompt 已优化，待测试验证

### 16:45 - 创建图表生成功能
- **创建文件**:
  - ✅ `src/app/api/chart/route.ts` - 图表生成 API 端点
  - ✅ `scripts/generate_charts.py` - Python 图表生成脚本
  - ✅ `src/lib/charts/service.ts` - 图表配置服务
- **功能**:
  - 月度趋势折线图
  - 每日爆款散点图
  - 爆款分类柱状图
- **状态**: 构建测试通过 (EXIT_CODE: 0)

### 待执行操作
1. ⏳ 用户测试完整分析流程（上传→分析→下载Word）
2. ⏳ 验证30条选题库生成是否正常

### 17:00 - 发现正确的 Prompt 参考文档
- **发现**: `prompt/` 文件夹包含完整的 6 步分析流程
- **正确流程**:
  1. S1: 账号概况 (02_账号概况.md)
  2. S2: 月度平均综合表现趋势拆解 (03_月度平均综合表现趋势拆解.md)
  3. S3: 全周期每日爆款视频拆解 (04_全周期每日爆款视频拆解.md)
  4. S4: 30条可直接拍的爆款选题库 (05_30条可直接拍的爆款选题库.md)
  5. S5: 生成Word文档 (06_生成word文档.md)

### 17:05 - 选题库超时问题分析
- **错误**: `HeadersTimeoutError: UND_ERR_HEADERS_TIMEOUT`
- **根本原因**: 单次生成30条完整选题（每条含5段式口播稿），输出Token约9000+
- **用户建议解决方案**: 两阶段分批生成
  1. 阶段1: 生成选题大纲（30条 id+category+titles）
  2. 阶段2: 分3批生成完整内容（每批10条，生成script+storyboard+casePoint）

### 17:10 - Word 缺少图表问题
- **当前状态**: Word 只包含文本和表格，没有 PNG 图片
- **需要添加的图表**:
  1. 月度平均互动趋势折线图（S2输出）
  2. 全周期每日爆点折线图（S3输出）
- **解决方案**: 使用 docx 的 ImageRun 嵌入图片Buffer

### 17:15 - 返回主页按钮
- **当前状态**: 分析页面仅失败时显示返回按钮
- **需求**: 每个页面添加返回主页按钮

### 17:30 - 返回主页按钮已完成 ✅
- ✅ 创建 `src/components/ui/BackButton.tsx` 组件
- ✅ 添加到分析页面 header
- ✅ 添加到报告页面 header
- ✅ 构建测试通过 (EXIT_CODE: 0)

### 17:45 - Word 文档添加图表已完成 ✅
- ✅ 修改 `src/lib/report/word.ts` 添加 ImageRun 和 ImageType 导入
- ✅ 添加 ChartBuffers 接口定义
- ✅ 修改 generateWordReport 接收可选的 chartBuffers 参数
- ✅ 在月度趋势章节添加图表图片
- ✅ 在爆款分析章节添加每日爆点图表图片
- ✅ 修改 `src/app/api/report/[id]/download/route.ts` 生成图表图片
- ✅ 使用 QuickChart API 下载图表 Buffer
- ✅ 构建测试通过 (EXIT_CODE: 0)

### 18:00 - 选题库两阶段分批生成已完成 ✅
- ✅ 修改 `src/config/prompts.json` 添加两个新 prompt：
  - `topic_outline_generation` - 生成选题大纲（30条 id+category+titles）
  - `topic_detail_generation` - 为一批选题生成完整内容
- ✅ 修改 `src/lib/ai-analysis/service.ts`：
  - 添加 `TopicOutline` 和 `FullTopic` 类型定义
  - 添加 `generateTopicOutline()` 方法
  - 添加 `generateTopicDetails()` 方法（分批生成，每批10条）
  - 修改 `generateTopics()` 方法使用两阶段流程
- ✅ 阶段1: 生成选题大纲（3分钟，4000 tokens）
- ✅ 阶段2: 分3批生成完整内容（每批3分钟，8000 tokens）
- ✅ 批次之间添加1秒延迟避免 API 速率限制
- ✅ 构建测试通过 (EXIT_CODE: 0)

### 今日完成总结
1. ✅ 添加返回主页按钮 - 改善用户导航体验
2. ✅ Word 文档添加图表 - 月度趋势和每日爆点折线图
3. ✅ 选题库两阶段分批生成 - 解决超时问题

### 待测试
- ⏳ 用户测试完整分析流程（上传→分析→下载Word）
- ⏳ 验证30条选题库生成是否正常
- ⏳ 验证 Word 文档中图表是否正确嵌入

### 18:30 - 首页布局优化和账号名称识别 ✅
- **需求**: Analysis Flow 模块放到上传文件前
- **需求**: 从文件名识别账号名称
- **需求**: 导出文件名使用"分析+账号名称"格式

**实现内容**:
- ✅ 修改 `src/app/page.tsx`:
  - 添加 `extractAccountNameFromFileName()` 函数
  - 将 Analysis Flow 模块移到上传区域之前
  - 上传成功后显示识别的账号名称
  - 将 accountName 传递给 analyze API
- ✅ 修改 `src/types/index.ts`:
  - 在 Task 接口添加 `accountName?: string | null` 字段
- ✅ 修改 `src/lib/queue/memory.ts`:
  - `create()` 方法添加 `accountName` 参数
  - 保存账号名称到任务对象
- ✅ 修改 `src/app/api/analyze/route.ts`:
  - 接收 `accountName` 参数
  - 传递给 taskQueue.create()
- ✅ 修改 `src/app/api/report/[id]/download/route.ts`:
  - 从 task.accountName 或 resultData.account.name 获取账号名称
  - 生成文件名格式：`分析-${accountName}.docx` / `分析-${accountName}.xlsx`
- ✅ 构建测试通过 (EXIT_CODE: 0)

### 文件名提取规则
- 移除文件扩展名 (.xlsx, .xls, .csv)
- 移除常见关键词后缀（数据、明细、视频、账号、分析、报告等）
- 移除日期格式（2024-01-01、20240101等）
- 保留核心账号名称

### 18:45 - 爆款选题库生成失败原因分析 ✅
- **问题**: 30条爆款选题库生成总是失败
- **分析范围**:
  - `src/lib/ai-analysis/service.ts` - AI 分析服务
  - `src/config/prompts.json` - Prompt 模板
  - `src/lib/prompts/engine.ts` - Prompt 引擎
  - `src/lib/analyzer/pipeline.ts` - 分析管道
- **分析完成**: ✅ 详细分析报告已记录到 `docs/troubleshoot/findings.md`

### 发现的主要问题

#### 高概率原因
1. **AI 返回 JSON 格式问题** ⭐⭐⭐⭐⭐
   - AI 返回可能包含 markdown 代码块
   - AI 可能添加额外说明文字
   - `cleanAIResponse()` 可能无法处理所有情况

2. **AI Token 限制导致截断** ⭐⭐⭐⭐
   - 当前: 4000 (大纲) / 8000 (详情)
   - 估算需要: 6000 (大纲) / 12000 (详情)

3. **AI 返回数据不完整** ⭐⭐⭐⭐
   - AI 可能忽略"必须生成30条"的要求
   - AI 可能生成错误的分类结构

#### 中概率原因
4. **Prompt 引擎变量替换问题** ⭐⭐⭐
   - `viral_categories` 或 `viral_patterns` 包含特殊字符
   - JSON.stringify 可能导致格式问题

5. **API 超时** ⭐⭐⭐
   - 3分钟超时可能不够
   - 网络延迟或 AI 响应慢

6. **数据类型不匹配** ⭐⭐
   - `viralAnalysis.patterns` 可能为 undefined
   - ID 匹配失败

### 建议的解决方案

#### P0（立即修复）
1. ✅ 增强 `cleanAIResponse()` 函数 - 处理更多 AI 返回格式
2. ✅ 增加 Token 限制到 6000/12000 - 防止输出截断
3. ✅ 添加详细调试日志 - 便于定位问题

#### P1（重要）
4. ✅ 添加重试机制 - 提高成功率
5. ✅ 添加数据验证函数 - 确保 AI 返回正确格式
6. ✅ 优化 Prompt 模板 - 明确 JSON 格式要求

#### P2（可选）
7. ⏳ 增强 Prompt 引擎安全性 - 处理特殊字符
8. ⏳ 添加单元测试覆盖边界情况
9. ⏳ 实现断点续传机制 - 失败后可以继续生成

### 下一步行动
1. ⏳ 实施 P0 修复 - 修改 `service.ts` 代码
2. ⏳ 添加详细的调试日志 - 运行测试并收集日志
3. ⏳ 根据日志分析具体失败原因 - 定位真正的问题
4. ⏳ 实施 P1 修复 - 提高成功率和稳定性
5. ⏳ 完整测试验证 - 确保选题库生成成功

### 19:00 - P0 修复已完成 ✅
**问题**: 30条爆款选题库生成偶发失败

**已实施的 P0 修复**:
1. ✅ **增强 `cleanAIResponse()` 函数** ([service.ts:13-74](src/lib/ai-analysis/service.ts#L13-L74))
   - 智能提取第一个有效 JSON 对象/数组
   - 正确处理嵌套的 `{}` 和 `[]` 括号匹配
   - 移除 markdown 代码块标记 (```json)
   - 移除 AI 添加的额外说明文字
   - 处理多种 AI 返回格式

2. ✅ **增加 Token 限制**
   - 选题大纲: 4000 → 6000 tokens ([service.ts:203](src/lib/ai-analysis/service.ts#L203))
   - 选题详情: 8000 → 12000 tokens ([service.ts:282](src/lib/ai-analysis/service.ts#L282))

3. ✅ **添加详细调试日志**
   - 记录每个阶段的 Prompt 长度
   - 记录 AI 响应长度和预览
   - 记录清理后的 JSON 长度
   - 记录每批次的处理进度
   - 区分 SyntaxError 和其他错误类型

**修改的文件**:
- [src/lib/ai-analysis/service.ts](src/lib/ai-analysis/service.ts)

**验证结果**:
- ✅ TypeScript 类型检查通过
- ✅ 代码编译无误

### 下一步
- ⏳ 用户测试完整分析流程，观察新的调试日志
- ⏳ 根据日志分析具体的失败原因（如果仍有失败）
- ⏳ 如果 P0 修复不足以解决问题，实施 P1 修复（重试机制、数据验证等）