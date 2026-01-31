# 研究发现：JSON引号解析问题

**创建时间：** 2026-01-31

---

## 问题分析

### 原始AI响应片段
```json
"dataScopeNote": "【数据分析口径说明】\n判定为爆款的标准:单条视频互动总量 ≥ 当月设定的互动量阈值。\n当月阈值计算方式为:当月阈值 = max(当月P90, 当月中位数 + 3×MAD)。\n- P90:指这个月所有发布视频的互动量(如点赞、评论、分享之和)从高到低排序后,位于第90百分位数的数值。通俗讲,如果这个月发了100条视频,互动量排在第10名的那条视频的数据,就是P90,代表本月头部10%的视频水平。\n- MAD:即中位数绝对偏差,是比平均数更能抵抗极端值影响的稳定性指标,尤其适合抖音这种经常出现个别超级爆款(离群点)的数据分布。计算分三步:1. 找出本月所有视频互动量的中位数;2. 计算每个数据与中位数的绝对差值;3. 找出这些差值的中位数,即为MAD。\n计算小例子:假设某月7条视频互动量为:[10, 12, 13, 14, 15, 18, 100]。\n第一步:中位数 = 14。\n第二步:计算每个数据与中位数的绝对差值,即[|10-14|, |12-14|, |13-14|, |14-14|, |15-14|, |18-14|, |100-14|],得到[4, 2, 1, 0, 1, 4, 86]。\n第三步:对差值数组再求中位数,得到MAD = 2。\n✅ 相比标准差,MAD对极端值不敏感。比如[10, 12, 13, 14, 15, 18, 100]这个例子中,如果把100改成10000,标准差会从约29变成约3771,但MAD基本不变,还是2左右,能更稳健地反映数据的正常波动范围。\n这个方法的优势在于:\n1. 统计上更稳健:即使有一条数据"爆到天上",对MAD值的影响也有限..."
```

### 问题点
AI返回的文本中包含：`即使有一条数据"爆到天上"`

- 位置728的 `"` → 被正确识别为内部引号，转义
- 位置733的 `"` → 被错误识别为强结束标记（因为后跟逗号），未转义

### 根本原因

原代码的引号识别逻辑缺陷（`service.ts` 第268-276行）：

```typescript
// 规则1：强结束标记（最高优先级）
const isStrongEndMarker =
  nextChar === ',' || nextChar === '}' || nextChar === ']' ||
  nextChar === '' || nextChar === ':';

if (isStrongEndMarker) {
  inString = false;
  result.push(c);
  continue; // ❌ 直接返回，未做进一步验证
}
```

**问题**：当引号后紧跟逗号时，代码假设这是字符串结束。但在中文文本中，引号常用于引用，后面可以跟逗号。

---

## 修复方案

### 新算法：平衡检测

核心思想：当发现引号后是结束标记时，继续向后检查，确保引号是成对的。

```typescript
// 辅助函数：检查从当前位置到下一个结束标记之间，引号是否平衡
const checkQuoteBalanceToEnd = (str: string, startPos: number): boolean => {
  let balance = 0;
  for (let i = startPos; i < str.length; i++) {
    const c = str[i];
    if (c === '\' && i + 1 < str.length) {
      i++; // 跳过转义字符
      continue;
    }
    if (c === '"') {
      balance++;
      const next = findNextNonWhitespace(str, i + 1);
      if (next.char === ',' || next.char === '}' || next.char === ']' || next.char === '' || next.char === ':') {
        if (balance % 2 === 0) {
          return true;
        }
      }
    }
  }
  return balance % 2 === 0;
};
```

### 修复后的逻辑

```typescript
if (c === '"') {
  if (!inString) {
    inString = true;
    result.push(c);
  } else {
    const next = findNextNonWhitespace(preprocessed, i + 1);
    const nextChar = next.char;

    // ✅ 使用平衡检测判断是否为内部引号
    const isInternalQuote = !checkQuoteBalanceToEnd(preprocessed, i + 1);

    const isStrongEndMarker =
      nextChar === ',' || nextChar === '}' || nextChar === ']' ||
      nextChar === '' || nextChar === ':';

    if (isStrongEndMarker && !isInternalQuote) {
      // 确认是字符串结束
      inString = false;
      result.push(c);
    } else {
      // 内部引号，需要转义
      result.push('\\"');
      fixCount++;
    }
  }
  continue;
}
```

---

## 相关文件

- [src/lib/ai-analysis/service.ts](src/lib/ai-analysis/service.ts) - 主要修复文件
  - `safeParseJSON` 函数中的 `fixUnescapedQuotes` 逻辑（第174-290行）

---

## Word文档表格缺失和图表标注问题

**创建时间：** 2026-01-31

### 问题1：Word文档表格缺失

**问题描述**：生成的Word文档中所有表格都不显示

**根本原因**：`docx`库的`Table`被错误地包裹在`Paragraph`中

在`docx`库中，`Table`和`Paragraph`是同级的文档元素，`Table`**不能**作为`Paragraph`的子元素（children）。

**错误代码**：
```typescript
return [new Paragraph({ children: [table] })]; // ❌
```

**正确代码**：
```typescript
return [table]; // ✅
```

**修复位置**：
- `src/lib/report/word.ts` - `generateMonthlyTable()` 第408行
- `src/lib/report/word.ts` - `generateViralCategoriesTableExtended()` 第677行
- `src/lib/report/word.ts` - `generateTopicLibraryTable()` 第738行

### 问题2：图表显示错误占位符

**问题描述**：Word文档中每日Top1爆点趋势图表显示错误占位符

**根本原因**：QuickChart API不支持`chartjs-plugin-annotation`插件

原代码使用annotation插件标注每月Top1爆点，但QuickChart服务端无法识别annotation配置。

**修复方案**：使用QuickChart原生支持的点样式数组
```typescript
const pointRadiusArray = sortedEntries.map((_, idx) =>
  monthlyTop1Indices.has(idx) ? 8 : 2
);
```

**修复位置**：
- `src/lib/charts/service.ts` - `generateDailyTop1Config()` 函数
- `src/lib/charts/service.ts` - `ChartConfig` 接口（移除annotation类型）

---

*最后更新：2026-01-31*
