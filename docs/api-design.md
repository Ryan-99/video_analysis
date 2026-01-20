# API设计文档

> **项目名称**: 抖音账号分析Web产品
> **文档版本**: v1.0
> **创建日期**: 2025-01-20
> **最后更新**: 2025-01-20

---

## 一、API概览

### 1.1 设计原则

- RESTful风格
- 统一响应格式
- 错误处理规范化
- 版本化管理（路径预留 `/api/v1/`）

### 1.2 基础URL

```
生产环境: https://your-domain.vercel.app/api
开发环境: http://localhost:3000/api
```

### 1.3 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "data": {
    // 业务数据
  },
  "meta": {
    "timestamp": "2025-01-20T10:30:00Z",
    "requestId": "uuid"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      // 详细错误信息
    }
  }
}
```

---

## 二、核心端点

### 2.1 文件上传

**端点**: `POST /api/upload`

**描述**: 上传Excel/CSV文件到Vercel Blob

**请求**:
```typescript
// Content-Type: multipart/form-data
{
  file: File // Excel或CSV文件
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "fileId": "uuid",
    "fileName": "data.xlsx",
    "fileSize": 1024000,
    "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "uploadedAt": "2025-01-20T10:30:00Z"
  }
}
```

**错误码**:
- `FILE_TOO_LARGE`: 文件超过10MB
- `INVALID_FILE_TYPE`: 不支持的文件类型
- `UPLOAD_FAILED`: 上传失败

**超时**: 10秒

---

### 2.2 文件解析

**端点**: `POST /api/parse`

**描述**: 解析上传的文件，返回数据预览和列映射

**请求**:
```json
{
  "fileId": "uuid"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "totalRows": 500,
    "previewData": [
      {
        "标题": "测试视频标题",
        "点赞数": 1234,
        "评论数": 56,
        "收藏数": 78,
        "转发数": 12,
        "发布时间": "2025-01-15 10:30:00"
      }
      // ... 前5条数据
    ],
    "detectedColumns": {
      "title": "标题",
      "likes": "点赞数",
      "comments": "评论数",
      "shares": "转发数",
      "saves": "收藏数",
      "publishTime": "发布时间"
    },
    "columnMapping": {
      "title": "标题",
      "likes": "点赞数",
      "comments": "评论数",
      "shares": "转发数",
      "saves": "收藏数",
      "publishTime": "发布时间"
    },
    "warnings": [
      // 可选：数据警告
    ]
  }
}
```

**错误码**:
- `FILE_NOT_FOUND`: 文件不存在
- `PARSE_FAILED`: 解析失败
- `MISSING_REQUIRED_COLUMNS`: 缺少必要列

**超时**: 10秒

---

### 2.3 创建分析任务

**端点**: `POST /api/analyze`

**描述**: 创建数据分析任务

**请求**:
```json
{
  "fileId": "uuid",
  "columnMapping": {
    "title": "标题",
    "likes": "点赞数",
    "comments": "评论数",
    "shares": "转发数",
    "saves": "收藏数",
    "publishTime": "发布时间"
  },
  "options": {
    "aiProvider": "claude", // 可选: 'claude' | 'openai'
    "generateTopics": true  // 是否生成选题库
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "status": "queued",
    "estimatedTime": 180 // 预计秒数
  }
}
```

**错误码**:
- `INVALID_COLUMN_MAPPING`: 列映射无效
- `FILE_PARSE_FAILED`: 文件解析失败
- `TASK_CREATE_FAILED`: 任务创建失败

**超时**: 5秒（立即返回taskId）

---

### 2.4 查询任务状态

**端点**: `GET /api/tasks/:id`

**描述**: 查询分析任务状态和进度

**响应**:
```json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "status": "analyzing", // queued | parsing | calculating | analyzing | generating_charts | completed | failed
    "progress": 65, // 0-100
    "currentStep": "正在进行AI分析...",
    "result": null, // 完成后包含报告数据
    "error": null, // 失败时包含错误信息
    "createdAt": "2025-01-20T10:30:00Z",
    "updatedAt": "2025-01-20T10:32:30Z"
  }
}
```

**错误码**:
- `TASK_NOT_FOUND`: 任务不存在

**超时**: 1秒

---

### 2.5 获取报告数据

**端点**: `GET /api/report/:id`

**描述**: 获取已完成的报告数据

**响应**:
```json
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "taskId": "uuid",
    "account": {
      "name": "测试账号",
      "type": "知识科普",
      "audience": "25-35岁都市白领",
      "coreTopic": "职场干货分享",
      "monetization": {
        "level1": "广告变现",
        "level2": "知识付费",
        "level3": "企业培训"
      }
    },
    "monthlyTrend": {
      "summary": "账号经历了三个阶段...",
      "data": [
        {
          "month": "2024-01",
          "avgEngagement": 5000,
          "videoCount": 30
        }
      ],
      "stages": [
        {
          "type": "起号期",
          "period": "2024-01 - 2024-03",
          "description": "..."
        }
      ]
    },
    "virals": {
      "summary": "共发现50条爆款视频...",
      "total": 50,
      "threshold": 15000,
      "byCategory": [
        {
          "category": "职场干货",
          "count": 20,
          "avgEngagement": 25000
        }
      ]
    },
    "topics": [
      {
        "id": 1,
        "category": "职场干货",
        "titles": [
          "标题1",
          "标题2",
          "标题3"
        ],
        "script": "60秒口播稿...",
        "storyboard": [
          "镜头1: ...",
          "镜头2: ..."
        ]
      }
    ],
    "charts": {
      "monthlyTrend": "base64...",
      "dailyVirals": "base64...",
      "viralCategories": "base64..."
    }
  }
}
```

**错误码**:
- `REPORT_NOT_FOUND`: 报告不存在
- `TASK_NOT_COMPLETED`: 任务未完成

**超时**: 1秒

---

### 2.6 下载报告文件

**端点**: `GET /api/report/:id/download`

**描述**: 下载Word或Excel报告文件

**参数**:
- `format`: `word` | `excel`

**响应**: 文件流

**错误码**:
- `REPORT_NOT_FOUND`: 报告不存在
- `FILE_NOT_FOUND`: 文件不存在

**超时**: 30秒

---

## 三、数据模型

### 3.1 列映射模型

```typescript
interface ColumnMapping {
  title: string;        // 标题列
  likes: string;        // 点赞列
  comments: string;     // 评论列
  saves: string;        // 收藏列
  shares: string;       // 转发列
  publishTime: string;  // 发布时间列
}
```

### 3.2 任务状态模型

```typescript
type TaskStatus =
  | 'queued'           // 排队中
  | 'parsing'          // 解析数据中
  | 'calculating'      // 计算指标中
  | 'analyzing'        // AI分析中
  | 'generating_charts' // 生成图表中
  | 'completed'        // 完成
  | 'failed';          // 失败

interface Task {
  id: string;
  status: TaskStatus;
  progress: number;    // 0-100
  currentStep: string;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 报告数据模型

```typescript
interface Report {
  reportId: string;
  taskId: string;

  // 账号概况
  account: {
    name: string;
    type: string;
    audience: string;
    coreTopic: string;
    monetization: MonetizationInfo;
  };

  // 月度趋势
  monthlyTrend: {
    summary: string;
    data: MonthlyData[];
    stages: Stage[];
  };

  // 爆款分析
  virals: {
    summary: string;
    total: number;
    threshold: number;
    byCategory: ViralCategory[];
  };

  // 选题库
  topics: Topic[];

  // 图表
  charts: {
    monthlyTrend: string; // base64
    dailyVirals: string;  // base64
    viralCategories: string; // base64
  };
}
```

---

## 四、错误处理

### 4.1 错误码列表

| 错误码 | HTTP状态码 | 描述 |
|--------|-----------|------|
| `FILE_TOO_LARGE` | 413 | 文件超过10MB |
| `INVALID_FILE_TYPE` | 400 | 不支持的文件类型 |
| `UPLOAD_FAILED` | 500 | 上传失败 |
| `FILE_NOT_FOUND` | 404 | 文件不存在 |
| `PARSE_FAILED` | 422 | 解析失败 |
| `MISSING_REQUIRED_COLUMNS` | 422 | 缺少必要列 |
| `INVALID_COLUMN_MAPPING` | 422 | 列映射无效 |
| `TASK_NOT_FOUND` | 404 | 任务不存在 |
| `TASK_CREATE_FAILED` | 500 | 任务创建失败 |
| `REPORT_NOT_FOUND` | 404 | 报告不存在 |
| `AI_SERVICE_ERROR` | 500 | AI服务错误 |
| `CHART_SERVICE_ERROR` | 500 | 图表服务错误 |

### 4.2 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "PARSE_FAILED",
    "message": "文件解析失败",
    "details": {
      "reason": "第5行数据格式错误",
      "row": 5,
      "column": "点赞数",
      "value": "N/A"
    }
  }
}
```

---

## 五、速率限制

### 5.1 限制规则

| 端点 | 限制 | 时间窗口 |
|------|------|----------|
| `POST /api/upload` | 10次 | 1分钟 |
| `POST /api/analyze` | 5次 | 1小时 |
| `GET /api/tasks/:id` | 60次 | 1分钟 |

### 5.2 响应头

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

### 5.3 超限响应

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642694400
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求过于频繁，请稍后再试"
  }
}
```

---

## 六、认证与授权

**MVP阶段**: 无需认证

**后续版本**:
- Bearer Token认证
- API Key认证
- 用户权限控制

---

## 七、CORS配置

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ];
  },
};
```

---

*API实现请参见 `/src/app/api/` 目录下的路由文件。*
