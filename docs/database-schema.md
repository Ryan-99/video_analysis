# 数据库设计文档

> **项目名称**: 抖音账号分析Web产品
> **文档版本**: v1.0
> **创建日期**: 2025-01-20
> **最后更新**: 2025-01-20

---

## 一、数据库选型

### 1.1 选型说明

MVP阶段使用 **SQLite** 作为数据库：

**选择理由**:
- Vercel支持本地文件数据库
- 无需额外部署云数据库服务
- 满足MVP单用户/团队内部工具需求
- 零配置，开箱即用
- 后续可平滑迁移到PostgreSQL

### 1.2 ORM选择

使用 **Prisma** 作为ORM：

- 类型安全的数据库客户端
- 自动生成TypeScript类型
- 优秀的开发体验
- 支持数据库迁移

---

## 二、数据表设计

### 2.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 分析任务表
model AnalysisTask {
  id          String   @id @default(uuid())
  status      TaskStatus @default(queued)
  progress    Int      @default(0)
  currentStep String?
  error       String?

  // 文件信息
  fileId      String
  fileName    String
  fileSize    Int

  // 列映射
  columnMapping String // JSON格式存储

  // 配置
  aiProvider   String   @default("claude")
  generateTopics Boolean @default(true)

  // 结果数据（JSON格式存储）
  resultData   String?

  // 报告文件路径
  reportPath   String?
  excelPath    String?
  chartPaths   String? // JSON数组

  // 统计
  recordCount  Int?
  viralCount   Int?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  completedAt  DateTime?

  @@map("analysis_tasks")
}

enum TaskStatus {
  queued
  parsing
  calculating
  analyzing
  generating_charts
  completed
  failed
}
```

### 2.2 表结构说明

#### AnalysisTask（分析任务表）

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| id | UUID | 主键 | ✓ |
| status | Enum | 任务状态 | ✓ |
| progress | Int | 进度百分比(0-100) | ✓ |
| currentStep | String | 当前步骤描述 | ✗ |
| error | String | 错误信息 | ✗ |
| fileId | String | 上传文件ID | ✓ |
| fileName | String | 原始文件名 | ✓ |
| fileSize | Int | 文件大小(字节) | ✓ |
| columnMapping | JSON | 列映射配置 | ✓ |
| aiProvider | String | AI服务商 | ✓ |
| generateTopics | Boolean | 是否生成选题库 | ✓ |
| resultData | JSON | 分析结果数据 | ✗ |
| reportPath | String | Word报告路径 | ✗ |
| excelPath | String | Excel文件路径 | ✗ |
| chartPaths | JSON | 图表文件路径列表 | ✗ |
| recordCount | Int | 总记录数 | ✗ |
| viralCount | Int | 爆款数量 | ✗ |
| createdAt | DateTime | 创建时间 | ✓ |
| updatedAt | DateTime | 更新时间 | ✓ |
| completedAt | DateTime | 完成时间 | ✗ |

---

## 三、数据类型映射

### 3.1 SQLite到TypeScript映射

| SQLite | TypeScript | Prisma |
|--------|-----------|--------|
| TEXT | string | String |
| INTEGER | number | Int |
| REAL | number | Float |
| BLOB | Buffer / string | Bytes |
| DATETIME | Date | DateTime |

### 3.2 JSON字段说明

**columnMapping**:
```json
{
  "title": "标题",
  "likes": "点赞数",
  "comments": "评论数",
  "shares": "转发数",
  "saves": "收藏数",
  "publishTime": "发布时间"
}
```

**resultData**:
```json
{
  "account": { ... },
  "monthlyTrend": { ... },
  "virals": { ... },
  "topics": [ ... ]
}
```

**chartPaths**:
```json
[
  "blobs/charts/monthly-trend-xxx.png",
  "blobs/charts/daily-virals-xxx.png",
  "blobs/charts/viral-categories-xxx.png"
]
```

---

## 四、索引设计

### 4.1 索引策略

```prisma
model AnalysisTask {
  // ... 字段定义

  @@index([status])
  @@index([createdAt])
  @@index([completedAt])
  @@map("analysis_tasks")
}
```

### 4.2 索引说明

| 索引 | 字段 | 用途 |
|------|------|------|
| idx_status | status | 按状态查询任务 |
| idx_createdAt | createdAt | 按创建时间排序 |
| idx_completedAt | completedAt | 按完成时间查询 |

---

## 五、数据迁移

### 5.1 初始化数据库

```bash
# 生成Prisma客户端
npx prisma generate

# 创建数据库（SQLite自动创建）
npx prisma db push

# 或使用迁移（推荐生产环境）
npx prisma migrate dev --name init
```

### 5.2 数据库URL配置

**开发环境**:
```bash
# .env
DATABASE_URL="file:./dev.db"
```

**Vercel生产环境**:
```bash
# Vercel环境变量
DATABASE_URL="file:./prod.db"
```

### 5.3 迁移到PostgreSQL（未来）

```prisma
// 修改schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
# 创建迁移
npx prisma migrate dev --name migrate-to-postgresql

# 应用到生产
npx prisma migrate deploy
```

---

## 六、数据操作示例

### 6.1 创建任务

```typescript
import { prisma } from '@/lib/db';

const task = await prisma.analysisTask.create({
  data: {
    fileId: 'xxx',
    fileName: 'data.xlsx',
    fileSize: 1024000,
    columnMapping: JSON.stringify({
      title: '标题',
      likes: '点赞数',
      // ...
    }),
    status: 'queued'
  }
});
```

### 6.2 更新任务状态

```typescript
await prisma.analysisTask.update({
  where: { id: taskId },
  data: {
    status: 'analyzing',
    progress: 50,
    currentStep: '正在进行AI分析...'
  }
});
```

### 6.3 查询任务

```typescript
const task = await prisma.analysisTask.findUnique({
  where: { id: taskId }
});

// 查询多个任务
const tasks = await prisma.analysisTask.findMany({
  where: { status: 'completed' },
  orderBy: { createdAt: 'desc' },
  take: 10
});
```

### 6.4 删除过期任务

```typescript
// 删除7天前已完成的任务
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

await prisma.analysisTask.deleteMany({
  where: {
    status: 'completed',
    completedAt: {
      lt: sevenDaysAgo
    }
  }
});
```

---

## 七、数据清理策略

### 7.1 自动清理

**建议**:
- 已完成任务保留7天
- 失败任务保留3天
- 定期清理Vercel Blob中的过期文件

### 7.2 清理脚本

```typescript
// scripts/cleanup.ts
import { prisma } from '@/lib/db';

async function cleanup() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // 清理已完成任务
  const completedTasks = await prisma.analysisTask.deleteMany({
    where: {
      status: 'completed',
      completedAt: { lt: sevenDaysAgo }
    }
  });

  // 清理失败任务
  const failedTasks = await prisma.analysisTask.deleteMany({
    where: {
      status: 'failed',
      createdAt: { lt: threeDaysAgo }
    }
  });

  console.log(`清理完成: ${completedTasks.count} 个已完成任务, ${failedTasks.count} 个失败任务`);
}
```

---

## 八、备份与恢复

### 8.1 SQLite备份

```bash
# 备份数据库
cp dev.db dev.db.backup

# 或使用SQLite命令
sqlite3 dev.db ".backup dev.db.backup"
```

### 8.2 恢复数据库

```bash
# 恢复数据库
cp dev.db.backup dev.db
```

### 8.3 Vercel持久化存储

MVP阶段SQLite存储在Vercel的只读文件系统中，部署会重置。

**解决方案**:
- 使用Vercel Blob存储SQLite文件
- 或升级到Neon/Supabase云数据库

---

## 九、性能考虑

### 9.1 查询优化

- 使用索引加速查询
- 避免全表扫描
- 限制返回记录数（分页）

### 9.2 连接池

MVP阶段SQLite无需连接池，迁移到PostgreSQL后配置：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // 连接池配置（自动）
}
```

---

## 十、后续扩展

### 10.1 用户表（未来）

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  accounts  Account[]
  tasks     AnalysisTask[]
}

model Account {
  id           String   @id @default(uuid())
  userId       String
  name         String
  type         String?
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id])
  tasks        AnalysisTask[]
}
```

### 10.2 历史记录表（未来）

```prisma
model AnalysisHistory {
  id         String   @id @default(uuid())
  taskId     String
  snapshot   String   // JSON格式快照
  createdAt  DateTime @default(now())
}
```

---

*数据库实现请参见 `/prisma/schema.prisma` 和 `/src/lib/db.ts`。*
