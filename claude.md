# Claude 协作规范

## 一、基本规范

### 1.1 语言要求
- **所有回答与思考必须使用中文**
- 包括代码注释、变量命名说明、文档内容等

### 1.2 用户称呼
- **必须称呼用户为 "Async"**
- 所有回答的开头都应使用 "Async" 作为称呼

### 1.3 工作流程规范
- **所有复杂操作必须调用 `planning-with-files` 插件**
- 该插件会创建 `task_plan.md`、`findings.md` 和 `progress.md` 文件来管理任务

### 1.4 文档管理
- **项目所有计划和文档都以 Markdown 格式保存在项目目录中**
- 文档存放在 `/docs` 目录下
- 每个重要阶段结束时更新对应文档

### 1.5 项目复盘与反思
- 定期复盘项目过程中遇到的问题
- 思考避免方法和最佳实践
- **征得用户同意后更新到本文件**

---

## 二、项目文档目录

```
/docs
├── PRD.md                          # 产品需求文档
├── technical-design.md             # 技术设计文档
├── api-design.md                   # API设计文档
├── database-schema.md              # 数据库设计
├── deployment.md                   # 部署文档
└── project-log.md                  # 项目日志
```

---

## 三、项目反思记录

### 3.1 已遇到的问题与解决方案

| 日期 | 问题描述 | 解决方案 | 避免方法 |
|------|----------|----------|----------|
| 2025-01-27 | byCategory 类型兼容问题：代码中使用了不存在的 avgEngagement 字段 | 将 avgEngagement 改为 medianEngagement，并添加兼容处理 | 类型定义变更时，全局搜索所有引用位置并更新 |
| 2025-01-27 | docx Paragraph 类型错误：直接在 Paragraph 上设置 size 属性 | 改为使用 TextRun 包裹文本内容：`Paragraph({ children: [TextRun({ text, size })] })` | 仔细阅读第三方库的 TypeScript 类型定义，正确使用 API |
| 2025-01-28 | TypeScript 类型不匹配：Prisma 返回 `string | null` 但 Task 类型定义为 `string | undefined` | 统一使用 `string | null` 类型匹配 Prisma schema | 定义类型时明确区分 `null` 和 `undefined`，确保与数据库 schema 一致 |
| 2025-01-28 | 状态机类型不一致：删除 calculating 状态但未同步更新 TaskStatus 类型 | 同步修改类型定义和状态转换规则 | **类型修改时必须同步更新所有相关定义**（见 3.2） |
| 2025-01-28 | 类型定义与 Prisma Schema 不同步：calculating 状态在代码中使用但 TypeScript 类型缺失 | 在 TaskStatus 类型中添加 'calculating'，并在 STATE_TRANSITIONS 中添加转换规则 | **Prisma Schema 与 TypeScript 类型必须保持一致**（见 3.2） |
| 2025-01-28 | 状态转换规则与代码流程不匹配：分步分析中 parsing → analyzing 被拒绝 | 修改 STATE_TRANSITIONS，允许 parsing 可以转到 calculating 或 analyzing | **状态转换规则必须匹配实际代码流程**（见 3.2） |
| 2025-01-28 | 分步分析进度卡住：atomicUpdate 后未释放 processing 锁 | 在 atomicUpdate 调用时显式添加 processing: false | **使用原子更新时必须显式释放锁**（见 3.2） |
| 2025-01-28 | 状态转换验证过严：analyzing -> analyzing 被拒绝 | 修改 atomicUpdate，状态相同时跳过验证 | **状态转换验证应允许状态保持不变**（见 3.2） |

### 3.2 最佳实践

| 实践 | 描述 | 应用场景 |
|------|------|----------|
| **类型系统映射规则** | Prisma 中 `String?` 生成 `string \| null`，TypeScript 可选字段 `fieldName?: string` 表示 `string \| undefined`。与数据库交互时，应使用 `string \| null` 而非 `string \| undefined` | 定义与数据库模型对应的 TypeScript 接口时 |
| **类型定义同步原则** | 修改类型时，必须同时更新：1) 类型定义（如 TaskStatus）；2) 运行时常量/配置（如 STATE_TRANSITIONS）；3) 所有使用该类型的地方。**任何遗漏都会导致编译错误** | 所有类型相关的修改 |
| **Prisma Schema 一致性** | Prisma Schema 中的 enum 定义必须与 TypeScript 类型定义**完全一致**。修改 Prisma enum 时必须同步修改 TypeScript 类型，反之亦然 | 修改数据库 schema、添加/删除状态值 |
| **状态转换规则设计** | 状态转换规则必须考虑所有代码路径：1) 完整流程；2) 分步流程；3) 异常情况。**不要过度限制状态转换**，要允许合理的多种转换路径 | 设计状态机、修改状态转换规则 |
| **状态转换验证灵活性** | 状态验证应允许**状态保持不变**（如 `analyzing -> analyzing`）。多个步骤可能对应同一状态，只在状态真的改变时才验证转换规则 | 实现状态验证逻辑、处理多步骤同一状态场景 |
| **原子操作锁管理** | 使用 `atomicUpdate` 等原子操作更新任务状态后，**必须显式设置** `processing: false` 释放锁。**只有 `handleTaskError` 等清理函数会自动释放锁**，其他场景需要手动释放 | 使用 `atomicUpdate`、`update` 等数据库操作 |
| **系统化调试流程** | 遇到类型错误时：1) 仔细阅读错误信息定位字段；2) 对比类型定义和实际值；3) 找出所有相似问题；4) 统一修复；5) 验证构建 | 修复编译错误、类型不匹配问题 |
| **null vs undefined** | `null` 表示"值为空"，`undefined` 表示"值不存在"。数据库可空字段用 `null`，未定义的属性用 `undefined`。类型定义时要明确区分 | 类型定义、API 设计、数据处理 |

---

## 四、工作流程

### 4.1 需求变更流程
1. 用户提出变更需求
2. 更新相关文档（PRD/技术设计）
3. 评估影响范围和工作量
4. 征得用户同意后实施

### 4.2 文档更新流程
1. 任何架构或需求变更
2. 同步更新对应文档
3. 在文档顶部注明更新日期和变更内容

---

## 五、协作约定

### 5.1 代码规范
- 使用 TypeScript
- 遵循 ESLint 配置
- 组件使用函数式写法
- 关键逻辑添加中文注释

### 5.2 Git 提交规范
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- refactor: 重构
- test: 测试
- chore: 构建/工具变动

---

*最后更新：2025-01-28*
