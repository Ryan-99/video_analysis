# 技术设计文档

> **项目名称**: 抖音账号分析Web产品
> **文档版本**: v1.0
> **创建日期**: 2025-01-20
> **最后更新**: 2025-01-20

---

## 一、系统架构概览

### 1.1 整体架构

本项目采用前后端分离的架构设计，使用Next.js 14的App Router实现全栈开发。

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  上传页面    │  │  进度页面    │  │  报告页面    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 应用层                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              App Router + Serverless API             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↓                           ↓
┌──────────────────────┐  ┌──────────────────────────────────┐
│   Vercel 部署         │  │   Railway 部署                    │
│  - 前端/短时API      │  │  - Python图表服务                 │
│  - 文件上传/解析     │  │  - 长时任务处理                   │
│  - 任务状态查询      │  │                                   │
└──────────────────────┘  └──────────────────────────────────┘
         ↓                           ↓
┌──────────────────────┐  ┌──────────────────────────────────┐
│   Vercel Blob        │  │   AI服务 (Claude/OpenAI)         │
│  - 文件存储          │  │  - 智能分析                       │
│  - 报告文件          │  │                                   │
└──────────────────────┘  └──────────────────────────────────┘
```

### 1.2 技术栈清单

| 分类 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | Next.js | 14 | React全栈框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 样式 | TailwindCSS | 3.x | CSS框架 |
| UI组件 | shadcn/ui | latest | 可复用组件 |
| 后端 | Next.js API Routes | - | Serverless函数 |
| ORM | Prisma | 5.x | 数据库ORM |
| 数据库 | SQLite | 3.x | 本地文件数据库 |
| 文件存储 | Vercel Blob | - | 对象存储 |
| AI服务 | Claude/OpenAI SDK | latest | AI分析 |
| 图表生成 | Python + FastAPI + Matplotlib | - | PNG图表生成 |
| Word生成 | docx | latest | Word文档 |
| Excel生成 | exceljs | latest | Excel文件 |

---

## 二、核心模块设计

### 2.1 数据计算引擎

**文件位置**: `/src/lib/calculator/`

**功能职责**:
- 基础指标计算（互动总量、收藏率等）
- P90/MAD/阈值计算
- 月度统计聚合
- 爆款筛选

**核心算法**:

```typescript
// P90计算
export function calculateP90(values: number[]): number {
  const sorted = values.sort((a, b) => a - b);
  const p90Index = Math.floor(sorted.length * 0.9);
  return sorted[p90Index];
}

// MAD计算（中位数绝对偏差）
export function calculateMAD(values: number[]): number {
  const median = calculateMedian(values);
  const absoluteDeviations = values.map(v => Math.abs(v - median));
  return calculateMedian(absoluteDeviations);
}

// 阈值计算
export function calculateThreshold(values: number[]): number {
  const p90 = calculateP90(values);
  const median = calculateMedian(values);
  const mad = calculateMAD(values);
  return Math.max(p90, median + 3 * mad);
}
```

**依赖库**:
- `simple-statistics`: 统计计算

### 2.2 AI服务工厂

**文件位置**: `/src/lib/ai-service/`

**设计模式**: 工厂模式 + 策略模式

**接口定义**:

```typescript
interface AIService {
  analyzeAccount(data: VideoData[]): Promise<AccountAnalysis>;
  classifyVirals(virals: Video[]): Promise<ViralClassification>;
  abstractTopics(virals: ViralGroup[]): Promise<TopicAbstraction>;
  extractFormulas(samples: ViralSample[]): Promise<Formula>;
  generateTopics(formula: Formula, count: number): Promise<Topic[]>;
}

class ClaudeAIService implements AIService { }
class OpenAIService implements AIService { }

class AIServiceFactory {
  private static fallbackChain: AIService[] = [
    new ClaudeAIService(),
    new OpenAIService()
  ];

  static async executeWithFallback<T>(
    fn: (service: AIService) => Promise<T>
  ): Promise<T> {
    for (const service of this.fallbackChain) {
      try {
        return await fn(service);
      } catch (error) {
        console.error(`AI服务失败: ${error}`);
        continue;
      }
    }
    throw new Error('所有AI服务均失败');
  }
}
```

**错误处理**:
- 自动重试3次
- 自动切换备用服务商
- 超时控制（60秒）

### 2.3 异步任务队列

**文件位置**: `/src/lib/queue/`

**MVP实现**: 内存队列

```typescript
type TaskStatus = 'queued' | 'parsing' | 'calculating' | 'analyzing' | 'generating_charts' | 'completed' | 'failed';

interface Task {
  id: string;
  status: TaskStatus;
  progress: number;
  currentStep: string;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

class MemoryTaskQueue {
  private tasks: Map<string, Task> = new Map();

  create(taskId: string): Task {
    const task: Task = {
      id: taskId,
      status: 'queued',
      progress: 0,
      currentStep: '任务已创建',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(taskId, task);
    return task;
  }

  update(taskId: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    Object.assign(task, updates, { updatedAt: new Date() });
    this.tasks.set(taskId, task);
    return task;
  }

  get(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  // 任务清理：7天后删除已完成任务
  cleanup() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const [id, task] of this.tasks) {
      if (task.updatedAt < sevenDaysAgo && task.status === 'completed') {
        this.tasks.delete(id);
      }
    }
  }
}
```

**后续优化**: 升级为Redis + BullMQ

### 2.4 图表生成服务

**技术栈**: Python + FastAPI + Matplotlib

**文件位置**: `/python-service/`

**API设计**:

```python
from fastapi import FastAPI
from pydantic import BaseModel
import matplotlib.pyplot as plt

app = FastAPI()

class ChartRequest(BaseModel):
    type: str  # 'line', 'bar', 'pie'
    data: dict
    config: dict

@app.post("/api/chart")
async def generate_chart(request: ChartRequest):
    """生成图表并返回PNG base64"""
    # 生成图表逻辑
    fig = create_chart(request.type, request.data, request.config)

    # 保存为PNG
    import io
    import base64
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    buf.seek(0)

    # 返回base64
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    return {"image": img_base64}
```

**部署方式**: Railway独立部署

---

## 三、数据流设计

### 3.1 完整分析流程

```
┌──────────────────────────────────────────────────────────────┐
│ 1. 用户上传文件                                               │
│    - 前端验证文件类型和大小                                   │
│    - 调用 /api/upload 上传到Vercel Blob                       │
│    - 返回 fileId                                             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. 解析文件                                                   │
│    - 调用 /api/parse                                         │
│    - 解析Excel/CSV                                           │
│    - 智能识别列名                                             │
│    - 返回预览数据和列映射                                     │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. 用户确认列映射                                             │
│    - 用户手动确认或修正列映射                                 │
│    - 点击"开始分析"按钮                                       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. 创建分析任务                                               │
│    - 调用 /api/analyze                                       │
│    - 创建任务，返回taskId                                     │
│    - 前端跳转到进度页面 /analyze/[taskId]                     │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. 异步执行分析（并行）                                       │
│    ├─ 代码计算流                                              │
│    │  - 基础指标计算                                          │
│    │  - 月度统计聚合                                          │
│    │  - P90/MAD/阈值计算                                      │
│    │  - 爆款筛选                                              │
│    │                                                         │
│    └─ AI分析流                                                │
│       - 账号概况分析                                          │
│       - 阶段划分分析                                          │
│       - 爆款分类统计                                          │
│       - 母题抽象                                              │
│       - 方法论提取                                            │
│       - 选题库生成                                            │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. 生成图表                                                   │
│    - 调用Python图表服务                                       │
│    - 生成月度趋势图                                           │
│    - 生成爆点图                                               │
│    - 生成爆款分类统计图                                       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 7. 生成报告                                                   │
│    - 整合所有数据                                             │
│    - 生成Word文档                                             │
│    - 生成Excel源文件                                          │
│    - 上传到Vercel Blob                                        │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│ 8. 任务完成                                                   │
│    - 更新任务状态为completed                                  │
│    - 前端轮询检测到完成                                       │
│    - 跳转到报告页面 /report/[reportId]                        │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 前端轮询机制

```typescript
// 轮询Hook
export function useTaskPolling(taskId: string) {
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    const poll = async () => {
      const response = await fetch(`/api/tasks/${taskId}`);
      const data = await response.json();
      setTask(data);

      // 如果任务完成或失败，停止轮询
      if (data.status === 'completed' || data.status === 'failed') {
        return false;
      }
      return true;
    };

    let continuePolling = true;
    const interval = setInterval(async () => {
      continuePolling = await poll();
      if (!continuePolling) {
        clearInterval(interval);
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(interval);
  }, [taskId]);

  return task;
}
```

---

## 四、错误处理策略

### 4.1 错误分类

| 错误类型 | 处理策略 |
|----------|----------|
| 文件格式错误 | 立即返回友好错误提示 |
| 文件解析错误 | 返回详细错误信息（行号、列名） |
| 数据验证错误 | 列出缺失字段和异常值 |
| AI服务错误 | 自动重试3次 + 切换服务商 |
| 图表生成错误 | 使用默认图表模板 |
| 报告生成错误 | 记录日志，返回部分报告 |

### 4.2 错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      row?: number;
      column?: string;
      value?: any;
    };
  };
}
```

### 4.3 重试机制

```typescript
export async function retryWithFallback<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 指数退避
    }
  }
  throw new Error('重试失败');
}
```

---

## 五、性能优化方案

### 5.1 前端优化

| 优化项 | 方案 |
|--------|------|
| 代码分割 | Next.js动态导入 |
| 图片优化 | Vercel Blob + CDN |
| 缓存策略 | React Query缓存 |
| 加载状态 | 骨架屏 + 进度条 |

### 5.2 后端优化

| 优化项 | 方案 |
|--------|------|
| 计算优化 | 使用WASM加速统计计算 |
| AI缓存 | 缓存相似分析结果 |
| 并行处理 | 代码计算与AI分析并行 |
| 流式响应 | AI分析流式返回 |

### 5.3 存储优化

| 优化项 | 方案 |
|--------|------|
| 文件清理 | 7天后自动删除 |
| 数据压缩 | Gzip压缩 |
| CDN加速 | Vercel Edge Network |

---

## 六、安全考虑

### 6.1 输入验证

- 文件类型白名单验证
- 文件大小限制（10MB）
- 列名注入防护
- SQL注入防护（Prisma参数化查询）

### 6.2 数据安全

- HTTPS传输加密
- API密钥环境变量存储
- 文件访问权限控制
- 敏感信息脱敏

### 6.3 速率限制

- 单IP每分钟最多10次上传
- 单用户每天最多100次分析
- AI调用频率限制

---

## 七、测试策略

### 7.1 单元测试

```typescript
// 示例：P90计算测试
describe('calculateP90', () => {
  it('should return correct P90 value', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(calculateP90(values)).toBe(9);
  });
});
```

### 7.2 集成测试

- 文件上传流程测试
- API端点测试
- AI服务调用测试

### 7.3 E2E测试

- 完整分析流程测试
- 报告生成和下载测试

---

## 八、监控与日志

### 8.1 监控指标

- API响应时间
- 任务成功率
- AI调用成功率
- 错误率统计

### 8.2 日志记录

```typescript
logger.info('任务创建', { taskId, fileName });
logger.error('AI分析失败', { taskId, error, retryCount });
```

---

*详细技术实现请参见对应的代码文件和API文档。*
