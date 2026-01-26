/**
 * 文本格式化工具函数
 */

/**
 * 将包含编号列表的文本转换为多行数组
 * 识别格式：1、2、3、 或 (1) (2) (3) 或 ①②③ 等
 * @param text 原始文本
 * @returns 格式化后的文本数组，如果没有编号则返回包含原文本的数组
 */
export function formatListText(text: string): string[] {
  if (!text) return [''];

  // 正则表达式匹配各种编号格式
  // 1、2、3、 或 1. 2. 3. 或 (1) (2) (3) 或 ①②③ 等
  const listPattern = /(?:^|\n)\s*[(\[【]?\d+[.\)、\]】\s]|(?:^|\n)\s*[①②③④⑤⑥⑦⑧⑨⑩]/g;

  // 查找所有匹配的位置
  const matches = Array.from(text.matchAll(listPattern));

  if (matches.length === 0) {
    // 没有找到编号列表，返回原文本
    return [text];
  }

  // 按编号位置分割文本
  const result: string[] = [];
  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (match.index === undefined) continue;

    // 提取上一段内容
    if (match.index > lastIndex) {
      const prevText = text.substring(lastIndex, match.index).trim();
      if (prevText) {
        result.push(prevText);
      }
    }

    // 找到下一个编号的开始位置（或文本结尾）
    const nextIndex = i + 1 < matches.length && matches[i + 1].index !== undefined
      ? matches[i + 1].index
      : text.length;

    // 提取当前编号项的内容
    const itemText = text.substring(match.index, nextIndex).trim();
    if (itemText) {
      result.push(itemText);
    }

    lastIndex = nextIndex;
  }

  // 处理最后一段内容
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex).trim();
    if (remainingText) {
      result.push(remainingText);
    }
  }

  return result;
}

/**
 * 将文本中的编号列表转换为带换行符的字符串
 * @param text 原始文本
 * @returns 格式化后的字符串，编号项之间用换行符分隔
 */
export function formatListTextWithLineBreaks(text: string): string {
  const lines = formatListText(text);
  return lines.join('\n');
}

/**
 * 检查文本是否包含编号列表
 * @param text 文本内容
 * @returns 是否包含编号列表
 */
export function hasListFormat(text: string): boolean {
  if (!text) return false;
  const listPattern = /(?:^|\n)\s*[(\[【]?\d+[.\)、\]】\s]|(?:^|\n)\s*[①②③④⑤⑥⑦⑧⑨⑩]/;
  return listPattern.test(text);
}
