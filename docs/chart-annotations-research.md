# 图表标注功能实现方案研究

## 研究日期
2026-01-26

## 问题背景
当前 Word 报告中的图表图片没有包含标注信息，标注以文字形式显示在图表下方。用户希望将标注直接渲染到图表图片上。

## 技术方案对比

### 方案 1：QuickChart API 内置标注插件 ✅ 推荐

**优势：**
- QuickChart 已内置 `chartjs-plugin-annotation` 插件
- 无需额外依赖或服务
- 配置简单，直接在 chart config 中添加 annotations 配置即可
- 无需担心服务器资源消耗

**实现方式：**
```javascript
const config = {
  type: 'line',
  data: { ... },
  options: {
    plugins: {
      annotation: {
        annotations: {
          point1: {
            type: 'point',
            xValue: '2024-01',
            yValue: 1000,
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            radius: 6,
          },
          label1: {
            type: 'label',
            xValue: '2024-01',
            yValue: 1000,
            content: ['月度 Top1'],
            font: { size: 11 },
            color: '#fff',
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            yAdjust: -15,
          }
        }
      }
    }
  }
};

const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
```

**参考资源：**
- [QuickChart Chart.js Plugins Documentation](https://quickchart.io/documentation/reference/chartjs-plugins/)
- [chartjs-plugin-annotation Official Docs](https://www.chartjs.org/chartjs-plugin-annotation/latest/)

### 方案 2：node-canvas + Chart.js 服务端渲染

**优势：**
- 完全控制渲染过程
- 支持所有 Chart.js 功能和插件
- 可在本地服务器执行，无外部 API 依赖

**劣势：**
- 需要安装 `node-canvas` 和相关依赖
- 可能存在编译问题（某些原生模块）
- 需要额外的服务器资源
- Vercel Serverless 函数可能有限制

**实现方式：**
```javascript
import { createCanvas } from 'canvas';
import { Chart } from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(annotationPlugin);

const canvas = createCanvas(800, 400);
const chart = new Chart(canvas, {
  type: 'line',
  data: { ... },
  options: { ... }
});

const buffer = canvas.toBuffer('image/png');
```

**参考资源：**
- [Chart.js Official Node.js Documentation](https://www.chartjs.org/docs/latest/getting-started/using-from-node-js.html)
- [Generating Server Side Charts with Chart.js Node canvas](https://javascript.plainenglish.io/generating-server-side-charts-with-chartjs-node-canvas-and-express-9d63f5948ea9)
- [Automattic/node-canvas GitHub](https://github.com/Automattic/node-canvas)

### 方案 3：Puppeteer 截取前端图表

**优势：**
- 可以复用现有的前端交互式图表组件
- 确保标注样式与前端完全一致

**劣势：**
- 需要启动 headless browser，资源消耗大
- Serverless 环境中部署复杂
- 需要额外的服务器维护
- 渲染速度较慢

**实现方式：**
```javascript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/chart-preview');
const element = await page.$('#chart-container');
await element.screenshot({ path: 'chart.png' });
await browser.close();
```

**参考资源：**
- [Puppeteer with Chart.js - Stack Overflow](https://stackoverflow.com/questions/63692177/puppeteer-with-chart-js)
- [Guide :: ChartJS Image Exports Using Puppeteer & NodeJS](https://livefiredev.com/chartjs-image-exports-using-puppeteer-node/)

## 推荐方案

**选择方案 1：QuickChart API 内置标注插件**

**理由：**
1. ✅ QuickChart 已内置支持 annotations 插件
2. ✅ 无需额外依赖或复杂配置
3. ✅ 代码改动最小
4. ✅ 适合 Serverless 环境（Vercel）
5. ✅ 与现有代码架构完美集成

## 实施计划

1. 更新 `src/lib/charts/service.ts` 中的图表配置生成函数
2. 添加 annotations 配置到 chart config
3. 将 annotations 数据从 ReportViewer 传递到图表生成服务
4. 测试验证 Word 报告中的图片包含标注

## 代码改动点

### 1. service.ts - 生成带标注的图表配置
```typescript
export function generateDailyTop1Config(
  dailyTop1Data: Array<{ date: string; engagement: number; title: string }>,
  annotations?: Array<{ index: number; label: string }>
): ChartConfig {
  // ... 现有代码

  // 添加 annotations 配置
  const chartAnnotations: any = {};
  annotations?.forEach((anno, idx) => {
    const xValue = sortedEntries[anno.index].date;
    const yValue = sortedEntries[anno.index].engagement;

    chartAnnotations[`point${idx}`] = {
      type: 'point',
      xValue: xValue,
      yValue: yValue,
      backgroundColor: 'rgba(239, 68, 68, 0.8)',
      borderColor: 'rgba(239, 68, 68, 1)',
      borderWidth: 2,
      radius: 6,
    };

    chartAnnotations[`label${idx}`] = {
      type: 'label',
      xValue: xValue,
      yValue: yValue,
      content: [anno.label],
      font: { size: 11 },
      color: '#fff',
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
      borderRadius: 4,
      padding: { top: 4, bottom: 4, left: 6, right: 6 },
      yAdjust: -15,
    };
  });

  return {
    type: 'line',
    data: { ... },
    options: {
      // ... 现有 options
      plugins: {
        annotation: {
          annotations: chartAnnotations,
        },
      },
    },
  };
}
```

### 2. 修改 ChartConfig 类型定义
```typescript
export interface ChartConfig {
  type: 'line' | 'bar';
  data: { ... };
  options?: {
    // ... 现有字段
    plugins?: {
      title?: { ... };
      legend?: { ... };
      annotation?: {
        annotations: any;
      };
    };
  };
}
```

### 3. download/route.ts - 传递标注数据
```typescript
// 每日Top1爆点图表
if (resultData.dailyTop1 && resultData.dailyTop1.length > 0) {
  // 计算标注数据（与前端相同的逻辑）
  const sortedData = [...resultData.dailyTop1].sort((a, b) => a.date.localeCompare(b.date));
  const monthlyTop1 = new Map<string, { index: number; label: string }>();
  sortedData.forEach((item, idx) => {
    const month = item.date.substring(0, 7);
    if (!monthlyTop1.has(month)) {
      monthlyTop1.set(month, {
        index: idx,
        label: `${month} ${item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title}`,
      });
    }
  });

  const dailyTop1Config = generateDailyTop1Config(resultData.dailyTop1, Array.from(monthlyTop1.values()));
  // ... 生成图表
}
```

## 参考资源

### QuickChart 相关
- [QuickChart Chart.js Plugins Documentation](https://quickchart.io/documentation/reference/chartjs-plugins/)
- [chartjs-plugin-annotation Official Docs](https://www.chartjs.org/chartjs-plugin-annotation/latest/)

### node-canvas 方案
- [Chart.js Official Node.js Documentation](https://www.chartjs.org/docs/latest/getting-started/using-from-node-js.html)
- [Generating Server Side Charts with Chart.js Node canvas](https://javascript.plainenglish.io/generating-server-side-charts-with-chartjs-node-canvas-and-express-9d63f5948ea9)
- [Automattic/node-canvas GitHub](https://github.com/Automattic/node-canvas)

### Puppeteer 方案
- [Puppeteer with Chart.js - Stack Overflow](https://stackoverflow.com/questions/63692177/puppeteer-with-chart-js)
- [Guide :: ChartJS Image Exports Using Puppeteer & NodeJS](https://livefiredev.com/chartjs-image-exports-using-puppeteer-node/)
