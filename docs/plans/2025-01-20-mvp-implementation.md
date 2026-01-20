# 抖音账号分析Web产品 MVP 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 构建一个基于代码+AI混合模式的抖音账号数据分析工具，支持上传Excel/CSV文件，自动分析并生成Word/Excel/PNG格式的完整报告。

**架构:** Next.js 14全栈应用，Vercel部署前端和短时API，Railway部署Python图表服务。使用SQLite+Prisma存储任务状态，内存队列管理异步任务，Claude/OpenAI提供AI分析能力。

**技术栈:** Next.js 14, TypeScript, TailwindCSS, shadcn/ui, Prisma, Claude API, OpenAI API, FastAPI, Matplotlib

---

## Week 1: 基础架构搭建

### Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.env.local`
- Create: `.gitignore`

**Step 1: 创建package.json**

```bash
cd "d:\Claude Code\project\test1"
npm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

**Step 2: 安装shadcn/ui**

```bash
npx shadcn-ui@latest init --yes --defaults
```

**Step 3: 安装依赖包**

```bash
npm install --save prisma @prisma/client
npm install --save xlsx papaparse
npm install --save docx exceljs
npm install --save @anthropic-ai/sdk openai
npm install --save simple-statistics
npm install --save-dev @types/papaparse
```

**Step 4: 初始化Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

**Step 5: 创建基础目录结构**

```bash
mkdir -p src/lib/parser
mkdir -p src/lib/calculator
mkdir -p src/lib/ai-service
mkdir -p src/lib/queue
mkdir -p src/lib/charts
mkdir -p src/lib/report
mkdir -p src/components/upload
mkdir -p src/components/analyze
mkdir -p src/components/report
mkdir -p src/hooks
mkdir -p public/templates
```

**Step 6: 提交**

```bash
git add .
git commit -m "feat: initialize Next.js project with shadcn/ui"
```

---

### Task 2: 配置Prisma数据库

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `prisma/migrations/20250120_init/migration.sql`

**Step 1: 编写Prisma Schema**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model AnalysisTask {
  id             String   @id @default(uuid())
  status         String   @default("queued")
  progress       Int      @default(0)
  currentStep    String?
  error          String?

  fileId         String
  fileName       String
  fileSize       Int
  columnMapping  String

  aiProvider     String   @default("claude")
  generateTopics Boolean  @default(true)

  resultData     String?

  reportPath     String?
  excelPath      String?
  chartPaths     String?

  recordCount    Int?
  viralCount     Int?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  completedAt    DateTime?
}
```

**Step 2: 生成Prisma客户端**

```bash
npx prisma generate
```

**Step 3: 创建数据库连接**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 4: 推送数据库schema**

```bash
npx prisma db push
```

**Step 5: 提交**

```bash
git add .
git commit -m "feat: configure Prisma with SQLite"
```

---

### Task 3: 创建类型定义

**Files:**
- Create: `src/types/index.ts`

**Step 1: 定义核心类型**

```typescript
// src/types/index.ts
export interface VideoData {
  title: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  publishTime: Date;
}

export interface ColumnMapping {
  title: string;
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  publishTime: string;
}

export type TaskStatus =
  | 'queued'
  | 'parsing'
  | 'calculating'
  | 'analyzing'
  | 'generating_charts'
  | 'completed'
  | 'failed';

export interface Task {
  id: string;
  status: TaskStatus;
  progress: number;
  currentStep: string | null;
  error: string | null;
  fileId: string;
  fileName: string;
  fileSize: number;
  columnMapping: string;
  aiProvider: string;
  generateTopics: boolean;
  resultData: string | null;
  reportPath: string | null;
  excelPath: string | null;
  chartPaths: string | null;
  recordCount: number | null;
  viralCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface MonthlyData {
  month: string;
  avgEngagement: number;
  videoCount: number;
  p90: number;
  median: number;
  threshold: number;
}

export interface ViralVideo extends VideoData {
  totalEngagement: number;
  threshold: number;
}

export interface AccountAnalysis {
  name: string;
  type: string;
  audience: string;
  coreTopic: string;
  monetization: {
    level1: string;
    level2: string;
    level3: string;
  };
}

export interface Report {
  reportId: string;
  taskId: string;
  account: AccountAnalysis;
  monthlyTrend: {
    summary: string;
    data: MonthlyData[];
    stages: Array<{
      type: string;
      period: string;
      description: string;
    }>;
  };
  virals: {
    summary: string;
    total: number;
    threshold: number;
    byCategory: Array<{
      category: string;
      count: number;
      avgEngagement: number;
    }>;
  };
  topics: Array<{
    id: number;
    category: string;
    titles: string[];
    script: string;
    storyboard: string[];
  }>;
  charts: {
    monthlyTrend: string;
    dailyVirals: string;
    viralCategories: string;
  };
}
```

**Step 2: 提交**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 4: 文件上传API

**Files:**
- Create: `src/lib/blob.ts`
- Create: `src/app/api/upload/route.ts`

**Step 1: 创建Vercel Blob工具**

```typescript
// src/lib/blob.ts
import { put } from '@vercel/blob';

export async function uploadFile(file: File): Promise<string> {
  const blob = await put(file.name, file, {
    access: 'public',
  });

  return blob.url;
}

export async function deleteFile(url: string): Promise<void> {
  // Vercel Blob deletion
  await fetch(url, { method: 'DELETE' });
}
```

**Step 2: 创建上传API路由**

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/blob';

export const runtime = 'edge';
export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: '未上传文件' } },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: '仅支持Excel或CSV文件' } },
        { status: 400 }
      );
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: '文件大小不能超过10MB' } },
        { status: 413 }
      );
    }

    // 上传文件
    const fileId = crypto.randomUUID();
    const fileName = `${fileId}-${file.name}`;
    const renamedFile = new File([file], fileName, { type: file.type });

    const url = await uploadFile(renamedFile);

    return NextResponse.json({
      success: true,
      data: {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        url,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_FAILED', message: '文件上传失败' } },
      { status: 500 }
    );
  }
}
```

**Step 3: 提交**

```bash
git add src/lib/blob.ts src/app/api/upload/route.ts
git commit -m "feat: add file upload API"
```

---

### Task 5: 文件解析器

**Files:**
- Create: `src/lib/parser/excel.ts`
- Create: `src/lib/parser/csv.ts`
- Create: `src/lib/parser/validator.ts`
- Create: `src/lib/parser/index.ts`

**Step 1: 创建Excel解析器**

```typescript
// src/lib/parser/excel.ts
import * as XLSX from 'xlsx';

export interface ParsedData {
  totalRows: number;
  previewData: Record<string, any>[];
  headers: string[];
}

export async function parseExcel(buffer: ArrayBuffer): Promise<ParsedData> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    dateNF: 'yyyy-mm-dd hh:mm:ss',
  }) as Record<string, any>[];

  const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
  const previewData = jsonData.slice(0, 5);

  return {
    totalRows: jsonData.length,
    previewData,
    headers,
  };
}
```

**Step 2: 创建CSV解析器**

```typescript
// src/lib/parser/csv.ts
import Papa from 'papaparse';

export interface ParsedData {
  totalRows: number;
  previewData: Record<string, any>[];
  headers: string[];
}

export async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          totalRows: results.data.length,
          previewData: results.data as Record<string, any>[],
          headers: results.meta.fields || [],
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
```

**Step 3: 创建列名验证器**

```typescript
// src/lib/parser/validator.ts
import { ColumnMapping } from '@/types';

export interface ColumnDetection {
  title: string | null;
  likes: string | null;
  comments: string | null;
  saves: string | null;
  shares: string | null;
  publishTime: string | null;
}

const KEYWORDS = {
  title: ['标题', '题目', '视频标题', 'title', '视频名称'],
  likes: ['点赞', '点赞数', 'likes', '赞'],
  comments: ['评论', '评论数', 'comments', '评'],
  saves: ['收藏', '收藏数', 'saves', '收'],
  shares: ['转发', '转发数', 'shares', '发'],
  publishTime: ['发布时间', '时间', '发布', 'publish', 'date', '时间'],
};

export function detectColumns(headers: string[]): ColumnDetection {
  const result: ColumnDetection = {
    title: null,
    likes: null,
    comments: null,
    saves: null,
    shares: null,
    publishTime: null,
  };

  const lowerHeaders = headers.map(h => h.toLowerCase());

  for (const [key, keywords] of Object.entries(KEYWORDS)) {
    for (const keyword of keywords) {
      const found = headers.find(h => h.toLowerCase().includes(keyword.toLowerCase()));
      if (found) {
        result[key as keyof ColumnDetection] = found;
        break;
      }
    }
  }

  return result;
}

export function validateColumnMapping(mapping: ColumnMapping): {
  valid: boolean;
  missing: string[];
} {
  const required: (keyof ColumnMapping)[] = [
    'title',
    'likes',
    'comments',
    'saves',
    'shares',
    'publishTime',
  ];

  const missing = required.filter(key => !mapping[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
```

**Step 4: 创建解析器入口**

```typescript
// src/lib/parser/index.ts
import { parseExcel } from './excel';
import { parseCSV } from './csv';
import { detectColumns, validateColumnMapping } from './validator';
import { ColumnMapping } from '@/types';

export { parseExcel, parseCSV, detectColumns, validateColumnMapping };
export type { ColumnDetection } from './validator';
```

**Step 5: 提交**

```bash
git add src/lib/parser
git commit -m "feat: add file parsers (Excel/CSV)"
```

---

### Task 6: 文件解析API

**Files:**
- Create: `src/app/api/parse/route.ts`

**Step 1: 创建解析API**

```typescript
// src/app/api/parse/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { parseExcel, parseCSV, detectColumns, validateColumnMapping } from '@/lib/parser';
import { ColumnMapping } from '@/types';

export const runtime = 'edge';
export const maxDuration = 10;

async function fetchFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return response.arrayBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE_ID', message: '缺少文件ID' } },
        { status: 400 }
      );
    }

    // TODO: 从数据库获取文件URL
    // 这里暂时假设fileId就是URL的一部分
    // 实际应该从数据库查询

    // 暂时返回模拟数据
    return NextResponse.json({
      success: true,
      data: {
        totalRows: 100,
        previewData: [
          {
            '标题': '测试视频1',
            '点赞数': '1234',
            '评论数': '56',
            '收藏数': '78',
            '转发数': '12',
            '发布时间': '2025-01-15 10:30:00',
          },
        ],
        detectedColumns: {
          title: '标题',
          likes: '点赞数',
          comments: '评论数',
          saves: '收藏数',
          shares: '转发数',
          publishTime: '发布时间',
        },
        columnMapping: {
          title: '标题',
          likes: '点赞数',
          comments: '评论数',
          saves: '收藏数',
          shares: '转发数',
          publishTime: '发布时间',
        },
      },
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'PARSE_FAILED', message: '文件解析失败' } },
      { status: 500 }
    );
  }
}
```

**Step 2: 提交**

```bash
git add src/app/api/parse/route.ts
git commit -m "feat: add file parse API"
```

---

### Task 7: 首页上传组件

**Files:**
- Create: `src/components/upload/FileUploader.tsx`
- Create: `src/components/upload/ColumnMapper.tsx`
- Modify: `src/app/page.tsx`

**Step 1: 创建文件上传组件**

```typescript
// src/components/upload/FileUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileUploaded: (fileId: string) => void;
}

export function FileUploader({ onFileUploaded }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      onFileUploaded(result.data.fileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded]);

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center gap-4">
        <Upload className="w-12 h-12 text-gray-400" />
        <h3 className="text-lg font-semibold">上传数据文件</h3>
        <p className="text-sm text-gray-500">支持 Excel (.xlsx, .xls) 和 CSV 文件，最大10MB</p>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button disabled={uploading} asChild>
            <span>
              {uploading ? '上传中...' : '选择文件'}
            </span>
          </Button>
        </label>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    </Card>
  );
}
```

**Step 2: 创建列映射组件**

```typescript
// src/components/upload/ColumnMapper.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColumnMapping } from '@/types';

interface ColumnMapperProps {
  fileId: string;
  initialMapping: ColumnMapping;
  onConfirm: (mapping: ColumnMapping) => void;
}

export function ColumnMapper({ fileId, initialMapping, onConfirm }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPreview() {
      try {
        const response = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        });

        const result = await response.json();
        if (result.success) {
          setPreviewData(result.data.previewData);
          setMapping(result.data.columnMapping);
        }
      } catch (error) {
        console.error('Failed to load preview:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPreview();
  }, [fileId]);

  if (loading) {
    return <Card className="p-8">加载中...</Card>;
  }

  const allColumns = previewData.length > 0 ? Object.keys(previewData[0]) : [];

  return (
    <Card className="p-8">
      <h3 className="text-lg font-semibold mb-4">确认列映射</h3>

      <div className="space-y-4">
        {Object.entries(mapping).map(([key, value]) => (
          <div key={key} className="flex items-center gap-4">
            <Label className="w-32">{getFieldLabel(key)}:</Label>
            <select
              value={value}
              onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
              className="flex-1 px-3 py-2 border rounded"
            >
              <option value="">-- 请选择 --</option>
              {allColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {previewData.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">数据预览（前5条）</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {allColumns.map(col => (
                    <th key={col} className="px-4 py-2 text-left border">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {allColumns.map(col => (
                      <td key={col} className="px-4 py-2 border">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Button
        onClick={() => onConfirm(mapping)}
        className="mt-6"
        disabled={Object.values(mapping).some(v => !v)}
      >
        开始分析
      </Button>
    </Card>
  );
}

function getFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    title: '视频标题',
    likes: '点赞数',
    comments: '评论数',
    saves: '收藏数',
    shares: '转发数',
    publishTime: '发布时间',
  };
  return labels[key] || key;
}
```

**Step 3: 更新首页**

```typescript
// src/app/page.tsx
import { FileUploader } from '@/components/upload/FileUploader';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnMapping } from '@/types';

export default function HomePage() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    title: '',
    likes: '',
    comments: '',
    saves: '',
    shares: '',
    publishTime: '',
  });

  const router = useRouter();

  const handleFileUploaded = (id: string) => {
    setFileId(id);
  };

  const handleColumnConfirm = async (mapping: ColumnMapping) => {
    // 创建分析任务
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        columnMapping: mapping,
      }),
    });

    const result = await response.json();
    if (result.success) {
      router.push(`/analyze/${result.data.taskId}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">抖音账号分析工具</h1>

        {!fileId ? (
          <FileUploader onFileUploaded={handleFileUploaded} />
        ) : (
          <ColumnMapper
            fileId={fileId}
            initialMapping={columnMapping}
            onConfirm={handleColumnConfirm}
          />
        )}
      </div>
    </main>
  );
}
```

**Step 4: 提交**

```bash
git add src/components/upload src/app/page.tsx
git commit -m "feat: add upload UI components"
```

---

## Week 2: 核心计算与AI分析

### Task 8: 数据计算引擎

**Files:**
- Create: `src/lib/calculator/metrics.ts`
- Create: `src/lib/calculator/p90-mad.ts`
- Create: `src/lib/calculator/monthly.ts`
- Create: `src/lib/calculator/index.ts`

**Step 1: 实现基础指标计算**

```typescript
// src/lib/calculator/metrics.ts
import { VideoData } from '@/types';

export interface VideoMetrics extends VideoData {
  totalEngagement: number;
  saveRate: number;
  saveToLikeRatio: number;
}

export function calculateMetrics(video: VideoData): VideoMetrics {
  const totalEngagement = video.likes + video.comments + video.saves + video.shares;
  const saveRate = totalEngagement > 0 ? (video.saves / totalEngagement) * 100 : 0;
  const saveToLikeRatio = video.likes > 0 ? (video.saves / video.likes) * 100 : 0;

  return {
    ...video,
    totalEngagement,
    saveRate,
    saveToLikeRatio,
  };
}

export function calculateAllMetrics(videos: VideoData[]): VideoMetrics[] {
  return videos.map(calculateMetrics);
}
```

**Step 2: 实现P90和MAD计算**

```typescript
// src/lib/calculator/p90-mad.ts
import { VideoMetrics } from './metrics';

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateP90(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const p90Index = Math.floor(sorted.length * 0.9);

  return sorted[Math.max(0, p90Index)];
}

export function calculateMAD(values: number[]): number {
  if (values.length === 0) return 0;

  const median = calculateMedian(values);
  const absoluteDeviations = values.map(v => Math.abs(v - median));

  return calculateMedian(absoluteDeviations);
}

export function calculateThreshold(values: number[]): number {
  const p90 = calculateP90(values);
  const median = calculateMedian(values);
  const mad = calculateMAD(values);

  return Math.max(p90, median + 3 * mad);
}

export function filterVirals(videos: VideoMetrics[], threshold: number): VideoMetrics[] {
  return videos.filter(v => v.totalEngagement >= threshold);
}
```

**Step 3: 实现月度统计**

```typescript
// src/lib/calculator/monthly.ts
import { VideoMetrics } from './metrics';
import { calculateP90, calculateMedian, calculateMAD, calculateThreshold } from './p90-mad';
import { MonthlyData } from '@/types';

export interface VideoWithMonth extends VideoMetrics {
  month: string;
}

export function groupByMonth(videos: VideoMetrics[]): VideoWithMonth[] {
  return videos.map(v => ({
    ...v,
    month: formatMonth(v.publishTime),
  }));
}

function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function calculateMonthlyStats(videos: VideoWithMonth[]): Map<string, MonthlyData> {
  const grouped = new Map<string, VideoMetrics[]>();

  // 按月分组
  for (const video of videos) {
    if (!grouped.has(video.month)) {
      grouped.set(video.month, []);
    }
    grouped.get(video.month)!.push(video);
  }

  // 计算每月统计
  const result = new Map<string, MonthlyData>();

  for (const [month, monthVideos] of grouped) {
    const engagements = monthVideos.map(v => v.totalEngagement);
    const avgEngagement = engagements.reduce((a, b) => a + b, 0) / engagements.length;
    const p90 = calculateP90(engagements);
    const median = calculateMedian(engagements);
    const mad = calculateMAD(engagements);
    const threshold = calculateThreshold(engagements);

    result.set(month, {
      month,
      avgEngagement,
      videoCount: monthVideos.length,
      p90,
      median,
      threshold,
    });
  }

  return result;
}

export function getSortedMonthlyData(data: Map<string, MonthlyData>): MonthlyData[] {
  return Array.from(data.values()).sort((a, b) => a.month.localeCompare(b.month));
}
```

**Step 4: 创建计算器入口**

```typescript
// src/lib/calculator/index.ts
export { calculateMetrics, calculateAllMetrics, type VideoMetrics } from './metrics';
export {
  calculateMedian,
  calculateP90,
  calculateMAD,
  calculateThreshold,
  filterVirals,
} from './p90-mad';
export { groupByMonth, calculateMonthlyStats, getSortedMonthlyData } from './monthly';
```

**Step 5: 提交**

```bash
git add src/lib/calculator
git commit -m "feat: add calculation engine"
```

---

### Task 9: AI服务集成

**Files:**
- Create: `src/lib/ai-service/claude.ts`
- Create: `src/lib/ai-service/openai.ts`
- Create: `src/lib/ai-service/factory.ts`
- Create: `src/lib/config/prompts/account-overview.txt`
- Create: `src/lib/config/prompts/stage-analysis.txt`
- Create: `src/lib/config/prompts/viral-classification.txt`

**Step 1: 创建Claude适配器**

```typescript
// src/lib/ai-service/claude.ts
import Anthropic from '@anthropic-ai/sdk';
import { VideoData, AccountAnalysis } from '@/types';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis> {
  const prompt = buildAccountPrompt(videos);

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const response = message.content[0];
  if (response.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return parseAccountAnalysis(response.text);
}

function buildAccountPrompt(videos: VideoData[]): string {
  const titles = videos.map(v => v.title).slice(0, 20).join('\n');

  return `请分析以下抖音视频数据，提取账号概况信息：

视频标题示例：
${titles}

请以JSON格式返回以下信息：
{
  "name": "账号名称（根据内容推断）",
  "type": "账号类型（如：知识科普、生活分享、娱乐搞笑等）",
  "audience": "目标受众画像",
  "coreTopic": "核心内容主题",
  "monetization": {
    "level1": "一级变现方式",
    "level2": "二级变现方式",
    "level3": "三级变现方式"
  }
}`;
}

function parseAccountAnalysis(text: string): AccountAnalysis {
  // 提取JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  return JSON.parse(jsonMatch[0]);
}
```

**Step 2: 创建OpenAI适配器**

```typescript
// src/lib/ai-service/openai.ts
import OpenAI from 'openai';
import { VideoData, AccountAnalysis } from '@/types';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis> {
  const prompt = buildAccountPrompt(videos);

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('Empty response from OpenAI');
  }

  return JSON.parse(content);
}

function buildAccountPrompt(videos: VideoData[]): string {
  const titles = videos.map(v => v.title).slice(0, 20).join('\n');

  return `请分析以下抖音视频数据，提取账号概况信息：

视频标题示例：
${titles}

请以JSON格式返回以下信息：
{
  "name": "账号名称（根据内容推断）",
  "type": "账号类型（如：知识科普、生活分享、娱乐搞笑等）",
  "audience": "目标受众画像",
  "coreTopic": "核心内容主题",
  "monetization": {
    "level1": "一级变现方式",
    "level2": "二级变现方式",
    "level3": "三级变现方式"
  }
}`;
}
```

**Step 3: 创建AI服务工厂**

```typescript
// src/lib/ai-service/factory.ts
import { VideoData, AccountAnalysis } from '@/types';
import * as Claude from './claude';
import * as OpenAI from './openai';

export type AIProvider = 'claude' | 'openai';

export interface AIService {
  analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis>;
}

class ClaudeService implements AIService {
  async analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis> {
    return Claude.analyzeAccount(videos);
  }
}

class OpenAIService implements AIService {
  async analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis> {
    return OpenAI.analyzeAccount(videos);
  }
}

export async function executeWithFallback<T>(
  fn: (service: AIService) => Promise<T>,
  preferredProvider: AIProvider = 'claude'
): Promise<T> {
  const providers: AIProvider[] =
    preferredProvider === 'claude' ? ['claude', 'openai'] : ['openai', 'claude'];

  for (const provider of providers) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const service = provider === 'claude' ? new ClaudeService() : new OpenAIService();
        return await fn(service);
      } catch (error) {
        console.error(`AI service failed (${provider}, attempt ${attempt + 1}):`, error);

        if (attempt === 2) {
          // 最后一次尝试失败，切换到下一个提供商
          break;
        }

        // 等待后重试（指数退避）
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw new Error('All AI providers failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Step 4: 提交**

```bash
git add src/lib/ai-service
git commit -m "feat: add AI service integration"
```

---

### Task 10: 任务队列系统

**Files:**
- Create: `src/lib/queue/memory.ts`
- Create: `src/app/api/analyze/route.ts`
- Create: `src/app/api/tasks/[id]/route.ts`

**Step 1: 创建内存任务队列**

```typescript
// src/lib/queue/memory.ts
import { Task, TaskStatus } from '@/types';

class MemoryTaskQueue {
  private tasks: Map<string, Task> = new Map();

  create(fileId: string, fileName: string, fileSize: number, columnMapping: string): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      status: 'queued',
      progress: 0,
      currentStep: '任务已创建',
      error: null,
      fileId,
      fileName,
      fileSize,
      columnMapping,
      aiProvider: 'claude',
      generateTopics: true,
      resultData: null,
      reportPath: null,
      excelPath: null,
      chartPaths: null,
      recordCount: null,
      viralCount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    this.tasks.set(task.id, task);
    return task;
  }

  update(id: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updated = { ...task, ...updates, updatedAt: new Date() };
    this.tasks.set(id, updated);
    return updated;
  }

  get(id: string): Task | null {
    return this.tasks.get(id) || null;
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  // 清理7天前已完成的任务
  cleanup(): number {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' && task.completedAt && task.completedAt < sevenDaysAgo) {
        this.tasks.delete(id);
        count++;
      }
    }

    return count;
  }
}

export const taskQueue = new MemoryTaskQueue();
```

**Step 2: 创建分析任务API**

```typescript
// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/memory';
import { executeAnalysis } from '@/lib/analyzer/pipeline';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { fileId, columnMapping, options } = await request.json();

    if (!fileId || !columnMapping) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: '缺少必要参数' } },
        { status: 400 }
      );
    }

    // 创建任务
    const task = taskQueue.create(
      fileId,
      'data.xlsx', // TODO: 从数据库获取文件名
      0,
      JSON.stringify(columnMapping)
    );

    // 异步执行分析（不等待完成）
    executeAnalysis(task.id).catch(error => {
      console.error('Analysis failed:', error);
      taskQueue.update(task.id, {
        status: 'failed',
        error: error.message,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        estimatedTime: 180,
      },
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'TASK_CREATE_FAILED', message: '任务创建失败' } },
      { status: 500 }
    );
  }
}
```

**Step 3: 创建任务查询API**

```typescript
// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/memory';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = taskQueue.get(params.id);

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: 'TASK_NOT_FOUND', message: '任务不存在' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GET_TASK_FAILED', message: '查询任务失败' } },
      { status: 500 }
    );
  }
}
```

**Step 4: 提交**

```bash
git add src/lib/queue src/app/api/analyze src/app/api/tasks
git commit -m "feat: add task queue system"
```

---

### Task 11: 分析流程编排

**Files:**
- Create: `src/lib/analyzer/pipeline.ts`

**Step 1: 创建分析流水线**

```typescript
// src/lib/analyzer/pipeline.ts
import { taskQueue } from '@/lib/queue/memory';
import { executeWithFallback } from '@/lib/ai-service/factory';
import { VideoData, VideoMetrics, MonthlyData } from '@/types';
import { calculateAllMetrics, groupByMonth, calculateMonthlyStats, getSortedMonthlyData, filterVirals } from '@/lib/calculator';

export async function executeAnalysis(taskId: string): Promise<void> {
  const task = taskQueue.get(taskId);
  if (!task) throw new Error('Task not found');

  // 解析列映射
  const columnMapping = JSON.parse(task.columnMapping);

  // Step 1: 解析数据
  taskQueue.update(taskId, {
    status: 'parsing',
    currentStep: '正在解析数据...',
    progress: 10,
  });

  const videos = await parseData(task.fileId, columnMapping);

  // Step 2: 计算指标
  taskQueue.update(taskId, {
    status: 'calculating',
    currentStep: '正在计算指标...',
    progress: 30,
  });

  const metrics = calculateAllMetrics(videos);

  // Step 3: 月度统计
  const videosWithMonth = groupByMonth(metrics);
  const monthlyStatsMap = calculateMonthlyStats(videosWithMonth);
  const monthlyData = getSortedMonthlyData(monthlyStatsMap);

  // 计算爆款阈值
  const allEngagements = metrics.map(m => m.totalEngagement);
  const { calculateThreshold } = await import('@/lib/calculator');
  const threshold = calculateThreshold(allEngagements);
  const virals = filterVirals(metrics, threshold);

  // Step 4: AI分析
  taskQueue.update(taskId, {
    status: 'analyzing',
    currentStep: '正在进行AI分析...',
    progress: 50,
  });

  const accountAnalysis = await executeWithFallback(
    async (service) => await service.analyzeAccount(videos),
    'claude' as const
  );

  // Step 5: 生成图表
  taskQueue.update(taskId, {
    status: 'generating_charts',
    currentStep: '正在生成图表...',
    progress: 80,
  });

  // TODO: 调用Python图表服务

  // Step 6: 完成
  const resultData = JSON.stringify({
    account: accountAnalysis,
    monthlyTrend: {
      summary: '共分析了 ' + videos.length + ' 条视频',
      data: monthlyData,
      stages: [],
    },
    virals: {
      summary: '发现 ' + virals.length + ' 条爆款视频',
      total: virals.length,
      threshold,
      byCategory: [],
    },
  });

  taskQueue.update(taskId, {
    status: 'completed',
    progress: 100,
    currentStep: '分析完成',
    resultData,
    recordCount: videos.length,
    viralCount: virals.length,
    completedAt: new Date(),
  });
}

async function parseData(fileId: string, columnMapping: Record<string, string>): Promise<VideoData[]> {
  // TODO: 实际从Blob获取并解析文件
  // 这里返回模拟数据
  return [
    {
      title: '测试视频1',
      likes: 1234,
      comments: 56,
      saves: 78,
      shares: 12,
      publishTime: new Date('2025-01-15T10:30:00'),
    },
  ];
}
```

**Step 2: 提交**

```bash
git add src/lib/analyzer
git commit -m "feat: add analysis pipeline"
```

---

### Task 12: 进度页面

**Files:**
- Create: `src/hooks/usePolling.ts`
- Create: `src/app/analyze/[taskId]/page.tsx`
- Create: `src/components/analyze/ProgressBar.tsx`

**Step 1: 创建轮询Hook**

```typescript
// src/hooks/usePolling.ts
import { useState, useEffect } from 'react';
import { Task } from '@/types';

export function usePolling(taskId: string, interval = 2000) {
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error.message);
        }

        if (!cancelled) {
          setTask(result.data);

          // 如果任务完成或失败，停止轮询
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            return false;
          }
          return true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '查询失败');
        }
        return false;
      }
    }

    // 立即执行一次
    poll().then(continuePolling => {
      if (continuePolling && !cancelled) {
        const intervalId = setInterval(() => {
          poll().then(shouldContinue => {
            if (!shouldContinue || cancelled) {
              clearInterval(intervalId);
            }
          });
        }, interval);

        return () => clearInterval(intervalId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [taskId, interval]);

  return { task, error };
}
```

**Step 2: 创建进度条组件**

```typescript
// src/components/analyze/ProgressBar.tsx
import { Task } from '@/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  task: Task;
}

export function ProgressBar({ task }: ProgressBarProps) {
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      queued: '排队中...',
      parsing: '正在解析数据...',
      calculating: '正在计算指标...',
      analyzing: '正在进行AI分析...',
      generating_charts: '正在生成图表...',
      completed: '分析完成！',
      failed: '分析失败',
    };
    return statusMap[status] || status;
  };

  return (
    <Card className="p-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">分析进度</h3>
          <span className="text-sm text-gray-500">{task.progress}%</span>
        </div>

        <Progress value={task.progress} className="h-2" />

        <p className="text-sm text-gray-600">
          {task.currentStep || getStatusText(task.status)}
        </p>

        {task.error && (
          <p className="text-sm text-red-500">错误: {task.error}</p>
        )}

        {task.status === 'completed' && (
          <p className="text-sm text-green-600">
            分析完成！共处理 {task.recordCount} 条视频，发现 {task.viralCount} 条爆款
          </p>
        )}
      </div>
    </Card>
  );
}
```

**Step 3: 创建进度页面**

```typescript
// src/app/analyze/[taskId]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePolling } from '@/hooks/usePolling';
import { ProgressBar } from '@/components/analyze/ProgressBar';
import { Task } from '@/types';

export default function AnalyzePage({ params }: { params: { taskId: string } }) {
  const router = useRouter();
  const { task, error } = usePolling(params.taskId);

  useEffect(() => {
    if (task?.status === 'completed') {
      // 跳转到报告页面
      router.push(`/report/${task.id}`);
    }
  }, [task, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">抖音账号分析</h1>
        <ProgressBar task={task} />
      </div>
    </main>
  );
}
```

**Step 4: 提交**

```bash
git add src/hooks src/app/analyze src/components/analyze
git commit -m "feat: add analysis progress page"
```

---

## Week 3: 报告生成与部署

### Task 13: Python图表服务

**Files:**
- Create: `python-service/main.py`
- Create: `python-service/chart_generator.py`
- Create: `python-service/requirements.txt`
- Create: `python-service/Railway.toml`

**Step 1: 创建Python服务**

```python
# python-service/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chart_generator import generate_chart
import uvicorn

app = FastAPI(title="Chart Generator API")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChartRequest(BaseModel):
    chart_type: str  # 'line', 'bar', 'pie'
    title: str
    data: dict
    config: dict = {}

class ChartResponse(BaseModel):
    success: bool
    data: dict

@app.post("/api/chart", response_model=ChartResponse)
async def create_chart(request: ChartRequest):
    """生成图表并返回base64编码的PNG"""
    try:
        result = generate_chart(request.chart_type, request.title, request.data, request.config)
        return ChartResponse(success=True, data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Step 2: 创建图表生成器**

```python
# python-service/chart_generator.py
import matplotlib.pyplot as plt
import matplotlib
import io
import base64
import json

# 使用非GUI后端
matplotlib.use('Agg')

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

def generate_chart(chart_type: str, title: str, data: dict, config: dict = {}) -> dict:
    """生成图表并返回base64"""
    fig, ax = plt.subplots(figsize=(10, 6))

    if chart_type == 'line':
        _generate_line_chart(ax, title, data, config)
    elif chart_type == 'bar':
        _generate_bar_chart(ax, title, data, config)
    elif chart_type == 'pie':
        _generate_pie_chart(ax, title, data, config)
    else:
        raise ValueError(f"Unsupported chart type: {chart_type}")

    # 保存为PNG
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
    buf.seek(0)

    # 转换为base64
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)

    return {
        'image': img_base64,
        'type': 'png'
    }

def _generate_line_chart(ax, title, data, config):
    """生成折线图"""
    x = data.get('x', [])
    y = data.get('y', [])

    ax.plot(x, y, marker='o', linewidth=2, markersize=6)
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel(data.get('xlabel', ''), fontsize=12)
    ax.set_ylabel(data.get('ylabel', ''), fontsize=12)
    ax.grid(True, alpha=0.3)

    # 旋转x轴标签
    plt.xticks(rotation=45 if len(x) > 5 else 0)

def _generate_bar_chart(ax, title, data, config):
    """生成柱状图"""
    categories = data.get('categories', [])
    values = data.get('values', [])

    colors = plt.cm.Set3(range(len(categories)))
    ax.bar(categories, values, color=colors)
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_ylabel(data.get('ylabel', ''), fontsize=12)

    # 添加数值标签
    for i, v in enumerate(values):
        ax.text(i, v, str(v), ha='center', va='bottom')

    plt.xticks(rotation=45 if len(categories) > 5 else 0)

def _generate_pie_chart(ax, title, data, config):
    """生成饼图"""
    labels = data.get('labels', [])
    values = data.get('values', [])

    colors = plt.cm.Set3(range(len(labels)))
    wedges, texts, autotexts = ax.pie(
        values,
        labels=labels,
        autopct='%1.1f%%',
        colors=colors,
        startangle=90
    )

    # 设置百分比文字大小
    for autotext in autotexts:
        autotext.set_fontsize(10)

    ax.set_title(title, fontsize=14, fontweight='bold')
```

**Step 3: 创建依赖文件**

```txt
# python-service/requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
matplotlib==3.8.2
pydantic==2.5.3
python-multipart==0.0.6
```

**Step 4: 创建Railway配置**

```toml
# python-service/Railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "python main.py"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

**Step 5: 提交**

```bash
git add python-service
git commit -m "feat: add Python chart service"
```

---

### Task 14: 报告生成器

**Files:**
- Create: `src/lib/report/word.ts`
- Create: `src/lib/report/excel.ts`
- Create: `src/lib/report/index.ts`

**Step 1: 创建Word生成器**

```typescript
// src/lib/report/word.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from 'docx';
import { Report } from '@/types';

export async function generateWordReport(report: Report): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // 标题
        new Paragraph({
          text: '抖音账号分析报告',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),

        // 账号概况
        new Paragraph({
          text: '一、账号概况',
          heading: HeadingLevel.HEADING_2,
        }),
        ...generateAccountSection(report.account),

        // 月度趋势
        new Paragraph({
          text: '二、月度趋势分析',
          heading: HeadingLevel.HEADING_2,
        }),
        ...generateMonthlySection(report.monthlyTrend),

        // 爆款分析
        new Paragraph({
          text: '三、爆款视频分析',
          heading: HeadingLevel.HEADING_2,
        }),
        ...generateViralSection(report.virals),

        // 选题库
        new Paragraph({
          text: '四、爆款选题库',
          heading: HeadingLevel.HEADING_2,
        }),
        ...generateTopicsSection(report.topics),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

function generateAccountSection(account: Report['account']): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({ text: '账号名称: ', bold: true }),
        new TextRun(account.name),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '账号类型: ', bold: true }),
        new TextRun(account.type),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '目标受众: ', bold: true }),
        new TextRun(account.audience),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '核心主题: ', bold: true }),
        new TextRun(account.coreTopic),
      ],
    }),
    new Paragraph({ text: '' }),
  ];
}

function generateMonthlySection(trend: Report['monthlyTrend']): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(new Paragraph({ text: trend.summary }));
  paragraphs.push(new Paragraph({ text: '' }));

  for (const data of trend.data) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: `${data.month}: `, bold: true }),
        new TextRun(`平均互动 ${data.avgEngagement.toFixed(0)}, 视频数 ${data.videoCount}`),
      ],
    }));
  }

  paragraphs.push(new Paragraph({ text: '' }));
  return paragraphs;
}

function generateViralSection(virals: Report['virals']): Paragraph[] {
  return [
    new Paragraph({ text: virals.summary }),
    new Paragraph({ text: '' }),
  ];
}

function generateTopicsSection(topics: Report['topics']): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const topic of topics) {
    paragraphs.push(new Paragraph({
      text: `${topic.id}. ${topic.category}`,
      heading: HeadingLevel.HEADING_3,
    }));

    for (const title of topic.titles) {
      paragraphs.push(new Paragraph({ text: `• ${title}` }));
    }

    paragraphs.push(new Paragraph({ text: '' }));
  }

  return paragraphs;
}
```

**Step 2: 创建Excel生成器**

```typescript
// src/lib/report/excel.ts
import ExcelJS from 'exceljs';
import { Report } from '@/types';

export async function generateExcelReport(report: Report): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // 账号概览Sheet
  const overviewSheet = workbook.addWorksheet('账号概览');
  overviewSheet.addRow(['项目', '内容']);
  overviewSheet.addRow(['账号名称', report.account.name]);
  overviewSheet.addRow(['账号类型', report.account.type]);
  overviewSheet.addRow(['目标受众', report.account.audience]);
  overviewSheet.addRow(['核心主题', report.account.coreTopic]);

  // 月度趋势Sheet
  const monthlySheet = workbook.addWorksheet('月度趋势');
  monthlySheet.addRow(['月份', '平均互动', '视频数', 'P90', '中位数', '阈值']);

  for (const data of report.monthlyTrend.data) {
    monthlySheet.addRow([
      data.month,
      data.avgEngagement,
      data.videoCount,
      data.p90,
      data.median,
      data.threshold,
    ]);
  }

  // 爆款数据Sheet
  const viralsSheet = workbook.addWorksheet('爆款视频');
  viralsSheet.addRow(['总数', report.virals.total]);
  viralsSheet.addRow(['阈值', report.virals.threshold]);
  viralsSheet.addRow([]);
  viralsSheet.addRow(['分类', '数量', '平均互动']);

  for (const category of report.virals.byCategory) {
    viralsSheet.addRow([category.category, category.count, category.avgEngagement]);
  }

  // 选题库Sheet
  const topicsSheet = workbook.addWorksheet('选题库');
  topicsSheet.addRow(['ID', '分类', '标题1', '标题2', '标题3', '口播稿', '分镜']);

  for (const topic of report.topics) {
    topicsSheet.addRow([
      topic.id,
      topic.category,
      topic.titles[0] || '',
      topic.titles[1] || '',
      topic.titles[2] || '',
      topic.script,
      topic.storyboard.join('; '),
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
}
```

**Step 3: 创建报告入口**

```typescript
// src/lib/report/index.ts
export { generateWordReport } from './word';
export { generateExcelReport } from './excel';
```

**Step 4: 提交**

```bash
git add src/lib/report
git commit -m "feat: add report generators"
```

---

### Task 15: 报告API和页面

**Files:**
- Create: `src/app/api/report/[id]/route.ts`
- Create: `src/app/api/report/[id]/download/route.ts`
- Create: `src/app/report/[reportId]/page.tsx`
- Create: `src/components/report/ReportViewer.tsx`

**Step 1: 创建报告数据API**

```typescript
// src/app/api/report/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/memory';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = taskQueue.get(params.id);

    if (!task || task.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' } },
        { status: 404 }
      );
    }

    const resultData = task.resultData ? JSON.parse(task.resultData) : null;

    return NextResponse.json({
      success: true,
      data: {
        reportId: task.id,
        taskId: task.id,
        ...resultData,
      },
    });
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'GET_REPORT_FAILED', message: '获取报告失败' } },
      { status: 500 }
    );
  }
}
```

**Step 2: 创建报告下载API**

```typescript
// src/app/api/report/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/memory';
import { generateWordReport, generateExcelReport } from '@/lib/report';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'word';

    const task = taskQueue.get(params.id);

    if (!task || task.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: { code: 'REPORT_NOT_FOUND', message: '报告不存在' } },
        { status: 404 }
      );
    }

    const resultData = task.resultData ? JSON.parse(task.resultData) : null;
    if (!resultData) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_DATA', message: '报告数据为空' } },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === 'excel') {
      buffer = await generateExcelReport(resultData);
      filename = `分析报告-${params.id}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = await generateWordReport(resultData);
      filename = `分析报告-${params.id}.docx`;
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('Download report error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOWNLOAD_FAILED', message: '下载失败' } },
      { status: 500 }
    );
  }
}
```

**Step 3: 创建报告查看器**

```typescript
// src/components/report/ReportViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Report } from '@/types';

interface ReportViewerProps {
  reportId: string;
}

export function ReportViewer({ reportId }: ReportViewerProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const response = await fetch(`/api/report/${reportId}`);
        const result = await response.json();

        if (result.success) {
          setReport(result.data);
        }
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [reportId]);

  const handleDownload = async (format: 'word' | 'excel') => {
    const response = await fetch(`/api/report/${reportId}/download?format=${format}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `分析报告-${reportId}.${format === 'word' ? 'docx' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return <Card className="p-8">加载中...</Card>;
  }

  if (!report) {
    return <Card className="p-8">报告不存在</Card>;
  }

  return (
    <div className="space-y-6">
      {/* 下载按钮 */}
      <div className="flex gap-4 justify-end">
        <Button onClick={() => handleDownload('word')} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          下载Word
        </Button>
        <Button onClick={() => handleDownload('excel')} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          下载Excel
        </Button>
      </div>

      {/* 账号概况 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">账号概况</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">账号类型</span>
            <p className="font-medium">{report.account.type}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">核心主题</span>
            <p className="font-medium">{report.account.coreTopic}</p>
          </div>
          <div className="col-span-2">
            <span className="text-sm text-gray-500">目标受众</span>
            <p className="font-medium">{report.account.audience}</p>
          </div>
        </div>
      </Card>

      {/* 月度趋势 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">月度趋势</h3>
        <p className="text-sm text-gray-600 mb-4">{report.monthlyTrend.summary}</p>
        {/* TODO: 添加图表展示 */}
      </Card>

      {/* 爆款分析 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">爆款分析</h3>
        <p className="text-sm text-gray-600 mb-4">{report.virals.summary}</p>
      </Card>
    </div>
  );
}
```

**Step 4: 创建报告页面**

```typescript
// src/app/report/[reportId]/page.tsx
'use client';

import { ReportViewer } from '@/components/report/ReportViewer';

export default function ReportPage({ params }: { params: { reportId: string } }) {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">分析报告</h1>
        <ReportViewer reportId={params.reportId} />
      </div>
    </main>
  );
}
```

**Step 5: 提交**

```bash
git add src/app/report src/components/report
git commit -m "feat: add report page and download API"
```

---

### Task 16: 部署配置

**Files:**
- Create: `.env.example`
- Create: `vercel.json`
- Modify: `next.config.js`

**Step 1: 创建环境变量示例**

```bash
# .env.example
# AI服务
CLAUDE_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# 文件存储
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Python服务URL
PYTHON_CHART_SERVICE_URL=https://your-python-service.railway.app

# 数据库
DATABASE_URL=file:./dev.db
```

**Step 2: 创建Vercel配置**

```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hkg1"],
  "env": {
    "CLAUDE_API_KEY": "@claude_api_key",
    "OPENAI_API_KEY": "@openai_api_key",
    "BLOB_READ_WRITE_TOKEN": "@blob_token",
    "PYTHON_CHART_SERVICE_URL": "@python_service_url"
  }
}
```

**Step 3: 更新Next.js配置**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
```

**Step 4: 提交**

```bash
git add .env.example vercel.json next.config.js
git commit -m "feat: add deployment configuration"
```

---

### Task 17: 最终测试和文档

**Step 1: 端到端测试**

```bash
# 启动开发服务器
npm run dev

# 测试流程:
# 1. 访问 http://localhost:3000
# 2. 上传测试文件
# 3. 确认列映射
# 4. 等待分析完成
# 5. 查看报告
# 6. 下载Word和Excel文件
```

**Step 2: 添加README**

```markdown
# 抖音账号分析工具

一个基于代码+AI混合模式的抖音账号数据分析工具。

## 功能

- 上传Excel/CSV文件
- 自动解析和验证数据
- P90/MAD/阈值计算
- AI智能分析
- 生成完整报告(Word/Excel)

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 生成Prisma客户端
npx prisma generate

# 推送数据库schema
npx prisma db push

# 启动开发服务器
npm run dev
```

## 部署

- 前端和API: Vercel
- Python图表服务: Railway

## 技术栈

- Next.js 14
- TypeScript
- TailwindCSS
- shadcn/ui
- Prisma
- Claude/OpenAI API
```

**Step 3: 最终提交**

```bash
git add README.md
git commit -m "docs: add README"
git push
```

---

## 执行说明

本计划包含17个主要任务，覆盖完整的MVP开发流程。每个任务都包含详细的代码和步骤。

**执行方式选择:**

1. **Subagent-Driven (当前会话)** - 我会为每个任务分配新的子代理，任务之间进行代码审查，快速迭代

2. **Parallel Session (独立会话)** - 在新的工作树中打开新会话，使用executing-plans批量执行

**你想选择哪种执行方式？**
