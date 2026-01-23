# 研究发现

**创建时间**: 2025-01-22

---

## 发现：报告显示流程（已完成调查）

### 现有组件分析

1. **报告页面** (`src/app/report/[reportId]/page.tsx`)
   - 已修复 Next.js 15+ 参数访问问题
   - 使用 `use()` hook 解包 params
   - 传递 reportId 给 ReportViewer

2. **报告API** (`src/app/api/report/[id]/route.ts`)
   - ✓ 存在且正常工作
   - 从任务队列获取 resultData
   - 返回报告数据

3. **报告下载API** (`src/app/api/report/[id]/download/route.ts`)
   - ✓ 存在且正常工作
   - 支持 Word 和 Excel 格式
   - 调用 `@/lib/report` 生成器

4. **报告生成器** (`src/lib/report/`)
   - word.ts - 使用 docx 库生成Word文档
   - excel.ts - 使用 exceljs 生成Excel文件
   - ✓ 功能完整

5. **报告查看器** (`src/components/report/ReportViewer.tsx`)
   - 从 `/api/report/${reportId}` 获取数据
   - 仅显示：账号概况、月度趋势摘要、爆款摘要
   - **问题**: 没有显示 monthlyTrend.data 详细数据
   - **问题**: 没有显示 virals.byCategory 分类数据
   - **问题**: 没有图表可视化
   - **问题**: 没有图片下载功能

6. **分析流程** (`src/lib/analyzer/pipeline.ts`)
   - 步骤319-327: 图表生成阶段是模拟的（TODO）
   - resultData 包含 account, monthlyTrend, virals
   - charts 字段为空（未实现）

### Report类型定义（完整）

```typescript
interface Report {
  account: AccountAnalysis;
  monthlyTrend: {
    summary: string;
    data: MonthlyData[];  // 包含 month, avgEngagement, videoCount, p90, median, threshold
    stages: Array<...>;
  };
  virals: {
    summary: string;
    total: number;
    threshold: number;
    byCategory: Array<{category, count, avgEngagement}>;  // 未被显示
  };
  topics: Array<...>;
  charts: {  // 始终为空
    monthlyTrend: string;
    dailyVirals: string;
    viralCategories: string;
  };
}
```

---

## PRD需求确认

### 报告章节结构（PRD第2.2节）
```
二、月度平均综合表现趋势拆解
- 月度趋势折线图  ← 缺失
- 数据分析口径说明
- 阶段划分
- 关键波峰分析  ← 数据存在但未展示

三、全周期每日爆款视频拆解
- 全周期每日爆点折线图  ← 缺失
- 爆款分类统计  ← 数据存在但未展示
- 爆款发布时间分布  ← 缺失

PNG图片单独下载  ← 缺失
```

---

## 数据流（完整）

```
pipeline.ts 执行分析
  ↓
resultData = {
  account: {...},
  monthlyTrend: { summary, data: [...] },
  virals: { summary, total, threshold, byCategory: [...] },
  topics: [],
  charts: { monthlyTrend: "", dailyVirals: "", viralCategories: "" }
}
  ↓
taskQueue.update(taskId, { resultData })
  ↓
/api/report/[reportId] 返回 reportData
  ↓
ReportViewer 显示结果  ← 目前只显示 summary
```

---

## 解决方案设计

### 方案：前端图表库 + PNG导出

**优势**:
- 无需部署Python服务
- 响应快速，用户体验好
- 图表可交互

**技术选型**:
- Recharts - 图表库
- html2canvas - PNG导出

**实施步骤**:
1. 安装 recharts 和 html2canvas
2. 创建图表组件：
   - MonthlyTrendChart - 月度趋势折线图
   - ViralCategoriesChart - 爆款分类统计图
3. 更新 ReportViewer 显示：
   - 月度数据表格
   - 爆款分类数据
   - 图表可视化
4. 添加图片下载功能
