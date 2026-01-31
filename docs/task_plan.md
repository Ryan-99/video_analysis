# 任务计划：修复AI响应JSON解析问题

**创建时间：** 2026-02-01

---

## 阶段规划

### 阶段1：问题诊断与代码分析 ✅
- [x] 阅读 `src/lib/ai-analysis/service.ts` 中的 `safeParseJSON` 函数
- [x] 分析所有7个JSON解析尝试的逻辑
- [x] 识别为什么中文符号导致解析失败
- [x] 记录发现到 `findings.md`

### 阶段2：修复JSON解析逻辑 [IN_PROGRESS]
- [ ] 增强 `fixUnescapedQuotes` 函数处理中文符号
- [ ] 添加针对 `()`、`【】` 等符号的特殊处理
- [ ] 实现多层检测规则
- [ ] 更新 `docs/findings.md` 记录修复方案

### 阶段3：优化Prompt模板
- [x] 检查 `src/config/prompts.json` 中所有prompt
- [x] 验证JSON格式约束是否完整
- [ ] 测试修复效果

### 阶段4：测试验证
- [ ] 运行构建检查编译错误
- [ ] 验证修复效果
- [ ] 更新 `docs/project-log.md`

---

## 问题分析

### 错误详情
**位置：** 2584
**上下文：** `"具/步骤/方法)"`
**错误：** `Expected ',' or '}' after property value in JSON`

### 根本原因

当前代码的 `fixUnescapedQuotes` 函数存在以下问题：

1. **状态机检测不完整**：当前代码只检查引号后的下一个字符是否为结束标记（`,`、`}`、`]`），但没有考虑中文文本中使用引号引用内容后紧跟标点符号的情况。

2. **中文符号上下文识别不足**：中文文本中的 `()` 和 `【】` 是合法的内容符号，但当前代码无法区分它们是JSON结构符号还是字符串值内部的中文符号。

3. **平衡检测缺失**：当引号后出现 `)` 时，代码无法判断这是：
   - 字符串值内部的中文右括号（如 `步骤/方法)`）
   - 还是JSON数组/函数调用的结束标记

---

## 修复策略

### 修复1：增强引号平衡检测

在 `fixUnescapedQuotes` 中添加更智能的平衡检测：

```typescript
// 辅助函数：检查引号是否应该转义
const shouldEscapeQuote = (str: string, pos: number): boolean => {
  // 向前查找匹配的开引号
  let quoteDepth = 1; // 当前引号
  for (let i = pos - 1; i >= 0; i--) {
    const c = str[i];
    if (c === '\\' && i > 0 && str[i - 1] !== '\\') {
      i--; // 跳过转义字符
      continue;
    }
    if (c === '"') {
      quoteDepth--;
      if (quoteDepth === 0) {
        // 找到开引号
        // 检查开引号前是否是对象键的开始（: 或 { 或 ,）
        let prev = i - 1;
        while (prev >= 0 && /\s/.test(str[prev])) prev--;
        if (prev >= 0 && (str[prev] === ':' || str[prev] === '{' || str[prev] === ',')) {
          // 这是字符串值的开始，当前引号可能是结束
          return false;
        }
        return true; // 内部引号，需要转义
      }
    }
  }
  return true; // 没找到开引号，需要转义
};
```

### 修复2：添加中文符号上下文识别

在 `cleanAIResponse` 中添加中文括号转换：

```typescript
// 在步骤5中添加：
.replace(/【/g, '[').replace(/】/g, ']')
```

### 修复3：改进引号检测逻辑

结合平衡检测和上下文识别：

```typescript
if (c === '"') {
  if (!inString) {
    inString = true;
    result.push(c);
  } else {
    const next = findNextNonWhitespace(s, i + 1);
    const nextChar = next.char;

    // 检查是否为内部引号
    const isInternalQuote = shouldEscapeQuote(s, i);

    const isStrongEndMarker = nextChar === '}' || nextChar === ']' || nextChar === ',' || nextChar === '';

    if (isStrongEndMarker && !isInternalQuote) {
      inString = false;
      result.push(c);
    } else {
      result.push('\\"');
      fixCount++;
    }
  }
  continue;
}
```

---

## 相关文件

| 文件 | 修改内容 |
|------|----------|
| `src/lib/ai-analysis/service.ts` | 增强 `fixUnescapedQuotes` 函数的引号检测逻辑 |
| `src/config/prompts.json` | 已有JSON格式约束，无需修改 |

---

*最后更新：2026-02-01*
