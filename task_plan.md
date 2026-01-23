# 任务计划：报告显示与图片下载功能

**创建时间**: 2025-01-22
**目标**: 修复报告结果不显示问题，实现图片下载功能

---

## 阶段进度

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段1: 调查现有代码 | completed | 已了解报告显示流程和缺失功能 |
| 阶段2: 修复报告显示 | completed | ReportViewer已添加图表展示和数据详情 |
| 阶段3: 实现图表生成 | completed | 创建MonthlyTrendChart和ViralCategoriesChart组件 |
| 阶段4: 添加图片下载 | completed | 使用html2canvas实现PNG导出功能 |
| 阶段5: 测试验证 | pending | 需要用户测试完整流程 |

---

## 问题根因分析

### 问题1：报告结果显示不完整
**现象**: ReportViewer只显示基础文本，缺少图表和数据可视化
**根因**:
- 报告API正常工作
- 但ReportViewer组件没有展示monthlyTrend.data和virals数据
- 缺少图表可视化组件

### 问题2：图片下载功能缺失
**根因**:
1. pipeline.ts中图表生成是模拟的（TODO）
2. Report.charts字段始终为空
3. ReportViewer没有图表展示和图片下载UI

---

## 解决方案

### 采用方案：前端图表库 + PNG导出
**技术选型**: Recharts（已广泛使用，TypeScript支持好）
**实施步骤**:
1. 安装 recharts
2. 创建图表组件（月度趋势折线图、爆点图、分类统计图）
3. 在ReportViewer中集成图表显示
4. 使用 html2canvas 导出图表为PNG

---

## 错误记录

| 尝试 | 错误 | 解决方案 |
|------|------|----------|
| - | - | - |

## 关键文件

- `src/app/report/[reportId]/page.tsx` - 报告页面
- `src/components/report/ReportViewer.tsx` - 报告查看器
- `src/lib/analyzer/pipeline.ts` - 分析流程
- `src/app/api/report/[reportId]/route.ts` - 报告API (需要检查是否存在)
- `docs/PRD.md` - 产品需求文档
- `CLAUDE.md` - 协作规范（提到图片下载要求）
