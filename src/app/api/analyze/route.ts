import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/memory';
import { executeAnalysis } from '@/lib/analyzer/pipeline';
import { validateColumnMapping } from '@/lib/parser';

export const runtime = 'nodejs';

/**
 * POST /api/analyze
 * 创建新的分析任务
 */
export async function POST(request: NextRequest) {
  try {
    const { fileId, fileUrl, columnMapping } = await request.json();

    // 验证必要参数
    if (!fileId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '缺少文件ID',
          },
        },
        { status: 400 }
      );
    }

    // 如果没有提供列映射，则自动检测
    let finalMapping = columnMapping;
    if (!finalMapping) {
      // 如果没有提供 fileUrl，返回错误
      if (!fileUrl) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_REQUEST',
              message: '缺少文件URL',
            },
          },
          { status: 400 }
        );
      }

      // 调用 parse API 获取列信息
      const parseResponse = await fetch(new URL('/api/parse', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileUrl }),
      });
      const parseResult = await parseResponse.json();

      if (parseResult.success) {
        finalMapping = parseResult.data.columnMapping;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PARSE_FAILED',
              message: '文件解析失败',
              details: parseResult.error,
            },
          },
          { status: 400 }
        );
      }
    }

    // 验证映射完整性
    const validation = validateColumnMapping(finalMapping);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INCOMPLETE_MAPPING',
            message: '字段映射不完整',
            missing: validation.missing,
          }
        },
        { status: 400 }
      );
    }

    // 创建任务
    const task = taskQueue.create(
      fileId,
      'data.xlsx', // TODO: 从文件系统获取真实文件名
      0, // TODO: 从文件系统获取真实文件大小
      JSON.stringify(finalMapping)
    );

    // 异步执行分析
    executeAnalysis(task.id).catch((error) => {
      console.error('分析执行失败:', error);
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
        estimatedTime: 180, // 预计耗时3分钟
      },
    });
  } catch (error) {
    console.error('创建任务错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TASK_CREATE_FAILED',
          message: '任务创建失败',
        },
      },
      { status: 500 }
    );
  }
}
