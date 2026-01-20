# 开发计划文档

> **项目名称**: 抖音账号分析Web产品
> **文档版本**: v1.0
> **创建日期**: 2025-01-20
> **最后更新**: 2025-01-20

---

## 一、项目里程碑

### 1.1 MVP阶段（3周）

| 里程碑 | 目标 | 交付物 |
|--------|------|--------|
| M1 | 基础架构完成 | 项目初始化、数据库配置、UI框架 |
| M2 | 核心功能完成 | 文件上传、数据计算、AI分析 |
| M3 | 报告生成完成 | 图表生成、Word/Excel导出 |
| M4 | 部署上线完成 | Vercel + Railway部署 |

### 1.2 时间线

```
Week 1: 基础架构 + 文件处理
Week 2: 核心计算 + AI分析
Week 3: 图表服务 + 报告生成 + 部署
```

---

## 二、详细开发计划

### Week 1: 基础架构（Day 1-7）

#### Day 1-2: 项目初始化

**任务**:
- [ ] 创建Next.js项目（TypeScript + TailwindCSS）
- [ ] 配置shadcn/ui
- [ ] 配置Prisma + SQLite
- [ ] 设置项目文件结构
- [ ] 配置ESLint + Prettier

**验收**:
- 项目可正常启动
- shadcn/ui组件可用
- Prisma连接成功

**文件**:
```
/src
  /app
    layout.tsx
    page.tsx
  /components
    /ui (shadcn组件)
  /lib
    db.ts
prisma/
  schema.prisma
```

---

#### Day 3-4: 文件上传功能

**任务**:
- [ ] 实现文件上传API (`/api/upload`)
- [ ] 集成Vercel Blob
- [ ] 创建文件上传组件
- [ ] 实现文件类型验证
- [ ] 实现文件大小限制

**验收**:
- 可以上传Excel/CSV文件
- 文件存储到Vercel Blob
- 返回fileId

**文件**:
```
/src/app/api/upload/route.ts
/src/components/upload/FileUploader.tsx
/src/lib/blob.ts
```

---

#### Day 5-6: 文件解析功能

**任务**:
- [ ] 实现Excel解析 (`xlsx`库)
- [ ] 实现CSV解析 (`papaparse`库)
- [ ] 实现列名智能识别
- [ ] 实现数据验证
- [ ] 创建预览组件

**验收**:
- 正确解析Excel/CSV
- 自动识别列名
- 显示数据预览

**文件**:
```
/src/app/api/parse/route.ts
/src/lib/parser/excel.ts
/src/lib/parser/csv.ts
/src/lib/parser/validator.ts
/src/components/upload/DataPreview.tsx
```

---

#### Day 7: 列映射组件

**任务**:
- [ ] 创建列映射UI
- [ ] 实现列映射保存
- [ ] 添加用户确认流程

**验收**:
- 用户可修正列映射
- 映射数据正确传递

**文件**:
```
/src/components/upload/ColumnMapper.tsx
```

---

### Week 2: 核心功能（Day 8-14）

#### Day 8-9: 数据计算引擎

**任务**:
- [ ] 实现基础指标计算
- [ ] 实现P90/MAD/阈值计算
- [ ] 实现月度统计聚合
- [ ] 实现爆款筛选
- [ ] 单元测试

**验收**:
- P90计算准确
- MAD计算准确
- 阈值计算准确
- 爆款筛选正确

**文件**:
```
/src/lib/calculator/
  metrics.ts
  p90-mad.ts
  monthly.ts
  index.ts
__tests__/
  calculator.test.ts
```

---

#### Day 10-11: AI服务集成

**任务**:
- [ ] 实现AI服务工厂
- [ ] 实现Claude适配器
- [ ] 实现OpenAI适配器
- [ ] 实现失败重试和切换
- [ ] 创建Prompt模板

**验收**:
- Claude API调用成功
- OpenAI备用切换正常
- 返回分析结果

**文件**:
```
/src/lib/ai-service/
  factory.ts
  claude.ts
  openai.ts
  prompts.ts
/src/lib/config/
  prompts/
    account-overview.txt
    stage-analysis.txt
    viral-classification.txt
    ...
```

---

#### Day 12-13: 异步任务系统

**任务**:
- [ ] 实现内存任务队列
- [ ] 实现任务状态管理
- [ ] 实现任务创建API
- [ ] 实现任务查询API
- [ ] 前端轮询Hook

**验收**:
- 任务创建成功
- 状态更新正确
- 前端轮询正常

**文件**:
```
/src/lib/queue/memory.ts
/src/app/api/analyze/route.ts
/src/app/api/tasks/[id]/route.ts
/src/hooks/usePolling.ts
```

---

#### Day 14: 分析流程整合

**任务**:
- [ ] 整合计算和AI流程
- [ ] 实现并行处理
- [ ] 实现进度更新
- [ ] 创建进度页面UI

**验收**:
- 完整分析流程可运行
- 进度正确显示
- 结果正确返回

**文件**:
```
/src/app/analyze/[taskId]/page.tsx
/src/components/analyze/ProgressBar.tsx
/src/lib/analyzer/pipeline.ts
```

---

### Week 3: 图表、报告与部署（Day 15-21）

#### Day 15-16: Python图表服务

**任务**:
- [ ] 创建Python项目（FastAPI）
- [ ] 实现图表生成逻辑
- [ ] 创建REST API
- [ ] 部署到Railway
- [ ] Node.js客户端封装

**验收**:
- 图表生成正确
- API响应正常
- Railway部署成功

**文件**:
```
/python-service/
  main.py
  chart_generator.py
  requirements.txt
  Railway.toml
/src/lib/charts/client.ts
```

---

#### Day 17-18: 报告生成

**任务**:
- [ ] 实现Word文档生成
- [ ] 实现Excel文件生成
- [ ] 整合图表和文本
- [ ] 创建报告API
- [ ] 创建报告页面UI

**验收**:
- Word文档格式正确
- Excel多Sheet正确
- 图表嵌入正常

**文件**:
```
/src/lib/report/
  word.ts
  excel.ts
  index.ts
/src/app/api/report/[id]/route.ts
/src/app/api/report/[id]/download/route.ts
/src/app/report/[reportId]/page.tsx
/src/components/report/ReportViewer.tsx
```

---

#### Day 19: Vercel部署配置

**任务**:
- [ ] 配置Vercel项目
- [ ] 设置环境变量
- [ ] 配置Vercel Blob
- [ ] 配置自定义域名（可选）
- [ ] 部署前端和API

**验收**:
- Vercel部署成功
- 环境变量配置正确
- API可正常访问

---

#### Day 20: Railway部署配置

**任务**:
- [ ] 配置Railway项目
- [ ] 部署Python图表服务
- [ ] 获取服务URL
- [ ] 更新Vercel环境变量

**验收**:
- Railway部署成功
- Python服务可访问
- Vercel可调用图表服务

---

#### Day 21: 测试与修复

**任务**:
- [ ] 端到端测试
- [ ] 性能测试
- [ ] Bug修复
- [ ] 文档更新

**验收**:
- 完整流程测试通过
- 性能达标
- 无严重Bug

---

## 三、任务依赖关系

```
项目初始化
    ↓
文件上传
    ↓
文件解析
    ↓
列映射
    ↓
数据计算 ←─────┐
    ↓          │
AI服务 ─────────┤
    ↓          │
任务队列 ───────┘
    ↓
Python图表服务 ←─┐
    ↓            │
报告生成 ─────────┘
    ↓
部署
```

---

## 四、每日任务清单

### Week 1

| 日期 | 任务 | 预计工时 | 优先级 |
|------|------|----------|--------|
| Day 1 | 项目初始化 | 4h | P0 |
| Day 2 | UI框架配置 | 4h | P0 |
| Day 3 | 文件上传API | 6h | P0 |
| Day 4 | Blob集成 | 4h | P0 |
| Day 5 | Excel解析 | 6h | P0 |
| Day 6 | CSV解析 + 验证 | 6h | P0 |
| Day 7 | 列映射组件 | 6h | P0 |

### Week 2

| 日期 | 任务 | 预计工时 | 优先级 |
|------|------|----------|--------|
| Day 8 | 基础指标计算 | 4h | P0 |
| Day 9 | P90/MAD/阈值 | 6h | P0 |
| Day 10 | Claude集成 | 6h | P0 |
| Day 11 | OpenAI + 工厂 | 4h | P0 |
| Day 12 | 任务队列 | 6h | P0 |
| Day 13 | API + 轮询 | 6h | P0 |
| Day 14 | 流程整合 | 6h | P0 |

### Week 3

| 日期 | 任务 | 预计工时 | 优先级 |
|------|------|----------|--------|
| Day 15 | Python服务搭建 | 6h | P0 |
| Day 16 | 图表生成 | 6h | P0 |
| Day 17 | Word生成 | 6h | P0 |
| Day 18 | Excel生成 | 6h | P0 |
| Day 19 | Vercel部署 | 4h | P0 |
| Day 20 | Railway部署 | 4h | P0 |
| Day 21 | 测试修复 | 8h | P0 |

---

## 五、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| AI API不稳定 | 高 | 多供应商 + 重试机制 |
| Vercel超时限制 | 中 | 拆分长任务到Railway |
| 图表生成复杂 | 中 | 使用成熟Python库 |
| 时间紧张 | 高 | 优先核心功能 |

---

## 六、验收标准

### 6.1 功能验收

- [ ] 上传Excel/CSV文件
- [ ] 正确解析数据
- [ ] P90/MAD/阈值计算准确
- [ ] AI分析返回结果
- [ ] 生成PNG图表
- [ ] 生成Word报告
- [ ] 生成Excel文件
- [ ] 在线预览报告

### 6.2 性能验收

- [ ] 文件上传 < 10秒
- [ ] 数据解析 < 10秒
- [ ] 完整分析 < 3分钟
- [ ] API响应 < 1秒

### 6.3 部署验收

- [ ] Vercel可访问
- [ ] Railway服务可访问
- [ ] 环境变量配置正确
- [ ] 端到端流程可用

---

## 七、后续优化

### 7.1 功能扩展

- 用户认证系统
- 历史记录管理
- 多账号对比
- 实时进度推送（WebSocket）

### 7.2 性能优化

- Redis任务队列
- CDN加速
- 图片压缩
- AI结果缓存

### 7.3 体验优化

- 移动端适配
- 深色模式
- 骨架屏加载
- 错误边界

---

*开发过程中请及时更新本文档，记录实际进度和遇到的问题。*
