# Prompt 汇总整理计划

创建时间: 2025-01-23

## 任务目标

将项目中所有使用的 prompt 汇总到一个统一的位置，方便后续维护和修改。

## 相关文件

- `src/config/prompts.json` - Prompt 配置文件
- `src/lib/prompts/index.ts` - Prompt 引擎
- `src/lib/ai-analysis/service.ts` - 使用 prompt 的服务

## 阶段划分

### 阶段 1: Prompt 位置分析 ✅
- ✅ 读取 prompts.json 了解现有 prompt 结构
- ✅ 搜索代码中所有使用 prompt 的地方
- ✅ 确认是否有硬编码的 prompt

### 阶段 2: Prompt 文档化 ✅
- ✅ 创建 prompt 汇总文档 (`docs/prompts-reference.md`)
- ✅ 记录每个 prompt 的用途和变量

### 阶段 3: 结论 ✅
- ✅ 所有 prompt 已统一存储在 `prompts.json` 中
- ✅ 无硬编码 prompt
- ✅ 创建了完整的参考文档

## 进度跟踪

| 阶段 | 状态 | 完成时间 |
|------|------|----------|
| 阶段1: 位置分析 | complete | 2025-01-23 |
| 阶段2: 文档化 | complete | 2025-01-23 |
| 阶段3: 结论 | complete | 2025-01-23 |

## 错误日志

(无错误)

## 产出文档

### 主文档
- **[docs/prompts-reference.md](../prompts-reference.md)** - Prompt 配置参考文档

### 分析文档
- **[findings.md](findings.md)** - 研究发现

## Prompt 列表摘要

| Key | 名称 | 用途 |
|-----|------|------|
| `account_overview` | 账号概况分析 | 分析账号名称、类型、主题等 |
| `monthly_trend` | 月度趋势分析 | 识别账号发展阶段 |
| `viral_analysis` | 爆款视频分析 | 按类型分组并提取规律 |
| `topic_outline_generation` | 选题大纲生成 | 生成30条选题大纲 |
| `topic_detail_generation` | 选题详情生成 | 生成口播稿、分镜、案例 |

## 后续修改建议

直接编辑 `src/config/prompts.json` 文件即可修改 prompt，参考 `docs/prompts-reference.md` 了解每个 prompt 的详细说明。
