# Aceternity UI 集成计划

> **目标**: 完整集成 Aceternity UI，优化所有页面的前端设计，保持极简 SaaS 风格一致性
>
> **项目路径**: d:\Claude Code\project\test1
>
> **创建日期**: 2025-01-22

---

## 设计规范

### 视觉风格
- **参考**: Linear、Vercel、Stripe
- **主题**: 深色极简 SaaS
- **背景色**: `#09090b`
- **主色调**: 仅在 CTA 按钮使用
  - 蓝色: `#6366f1`
  - 黄色: `#facc15`
  - 绿色: `#22c55e`

### 文字层级（透明度）
| 层级 | 颜色 | 用途 |
|------|------|------|
| 主要 | `text-white` | 标题、重要信息 |
| 次要 | `text-white/60` | 正文、描述 |
| 辅助 | `text-white/40` | 标签、次要信息 |
| 弱化 | `text-white/30` | 占位符、提示 |
| 最弱 | `text-white/20` | 装饰性文字 |

### 组件样式
- **边框**: `border-white/10` (默认) / `border-white/5` (弱化)
- **卡片背景**: `bg-white/5` 或 `bg-white/[0.02]`
- **圆角**: `rounded-xl` (大) / `rounded-lg` (中)
- **内边距**: `p-6` (卡片) / `p-4` (紧凑)

---

## 实施阶段

### 阶段 1: 研究与规划 ✅
- [x] 分析现有代码结构
- [x] 确定设计规范
- [x] 创建计划文档

**状态**: 完成

---

### 阶段 2: Aceternity UI 组件准备
**目标**: 创建/更新所有需要的 UI 基础组件

#### 2.1 已有组件检查
- [x] `card.tsx` - 已存在
- [x] `button.tsx` - 已更新为极简风格
- [x] `label.tsx` - 已更新为极简风格
- [x] `tabs.tsx` - 已创建
- [x] `input.tsx` - 已创建
- [x] `progress.tsx` - 已存在

#### 2.2 需要创建的 Aceternity UI 组件
- [ ] `aurora-background.tsx` - 极光背景效果
- [ ] `meteor-effect.tsx` - 流星动画
- [ ] `shimmer-button.tsx` - 闪光按钮
- [ ] `grid-pattern.tsx` - 网格图案
- [ ] `dot-pattern.tsx` - 点阵图案
- [ ] `moving-border.tsx` - 动态边框
- [ ] `text-reveal.tsx` - 文字揭示动画
- [ ] `sparkles.tsx` - 闪烁效果

#### 2.3 创建工具组件
- [ ] `animated-beam.tsx` - 连线动画
- [ ] `hover-border-gradient.tsx` - 悬停渐变边框

**状态**: 待开始

---

### 阶段 3: 首页优化 (src/app/page.tsx)
**目标**: 使用 Aceternity UI 增强首页视觉体验

#### 3.1 Hero 区域增强
- [ ] 添加 `aurora-background` 微妙背景
- [ ] 标题使用 `text-reveal` 动画
- [ ] CTA 按钮使用 `shimmer-button`

#### 3.2 上传区域优化
- [ ] 使用 `dot-pattern` 背景
- [ ] 添加 `meteor-effect` 装饰
- [ ] 拖拽状态使用 `moving-border`

#### 3.3 特性卡片增强
- [ ] 卡片使用 `hover-border-gradient`
- [ ] 图标添加 `sparkles` 效果

#### 3.4 流程步骤优化
- [ ] 使用 `animated-beam` 连接步骤

**状态**: 待开始

---

### 阶段 4: 分析页面优化 (src/app/analyze/[taskId]/page.tsx)
**目标**: 增强分析页面的交互体验

#### 4.1 进度展示区域
- [ ] 进度条使用自定义动画
- [ ] 当前步骤高亮使用 `shimmer-button` 风格

#### 4.2 日志查看器
- [ ] 已优化为极简风格
- [ ] 可选：添加微妙的光效

**状态**: 待开始

---

### 阶段 5: 设置弹窗优化 (src/components/SettingsDialog.tsx)
**目标**: 增强设置界面的用户体验

#### 5.1 对话框增强
- [ ] 添加背景模糊效果
- [ ] 标签页使用已有 `tabs` 组件
- [ ] 输入框添加焦点动画

#### 5.2 主题选择
- [ ] 主题卡片使用 `hover-border-gradient`
- [ ] 选中状态使用 `moving-border`

**状态**: 待开始

---

### 阶段 6: 组件优化
**目标**: 优化各个子组件

#### 6.1 FileUploader 组件
- [x] 已更新为极简风格
- [ ] 添加上传进度动画
- [ ] 拖拽状态使用 `meteor-effect`

#### 6.2 ProgressBar 组件
- [x] 已更新为极简风格
- [ ] 进度条添加流光效果

#### 6.3 LogViewer 组件
- [x] 已更新为极简风格

**状态**: 部分完成

---

### 阶段 7: 测试与验证
**目标**: 确保所有页面风格统一且无错误

#### 7.1 类型检查
- [ ] 运行 `npx tsc --noEmit`
- [ ] 修复所有类型错误

#### 7.2 构建验证
- [ ] 运行 `npm run build`
- [ ] 修复构建错误

#### 7.3 视觉一致性检查
- [ ] 检查所有页面配色一致性
- [ ] 检查所有组件间距一致性
- [ ] 检查所有动画流畅度

**状态**: 待开始

---

## 已完成的工作

### UI 组件创建
- [x] `input.tsx` - 输入框组件
- [x] `tabs.tsx` - 标签页组件
- [x] 更新 `button.tsx` - 按钮组件
- [x] 更新 `label.tsx` - 标签组件

### 页面组件优化
- [x] `ProgressBar.tsx` - 极简风格更新
- [x] `LogViewer.tsx` - 极简风格更新
- [x] `FileUploader.tsx` - 极简风格更新
- [x] `SettingsDialog.tsx` - 添加日志查看器标签

---

## 错误日志

### 错误 1: Module not found - @/components/ui/input
**日期**: 2025-01-22
**错误**: `Module not found: Can't resolve '@/components/ui/input'`
**原因**: 缺少 input.tsx 组件
**解决方案**: 创建了 input.tsx 组件
**状态**: ✅ 已解决

---

## 决策记录

### 决策 1: 极简设计方向
**日期**: 2025-01-22
**决策**: 移除所有装饰性元素（渐变、图案），使用纯色+透明度
**原因**: 用户要求极简 SaaS 风格
**影响**: 所有组件需要重新设计

---

## 下一步行动

1. **立即开始**: 创建 Aceternity UI 特效组件
2. **优先级**: 首页 Hero 区域 > 上传区域 > 设置弹窗
3. **测试**: 每个阶段完成后运行构建验证
