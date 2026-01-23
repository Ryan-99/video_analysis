import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { validateColumnMapping } from '@/lib/parser';

// 配置运行时为 Node.js
export const runtime = 'nodejs';
// 设置最大执行时间为 5 分钟（AI 分析需要较长时间）
export const maxDuration = 300;

/**
 * POST /api/analyze
 * 创建新的分析任务
 */
export async function POST(request: NextRequest) {
  try {
    const { fileId, fileUrl, columnMapping, aiConfig, accountName } = await request.json();

    // 获取AI配置（从前端传递或使用环境变量）
    let finalAiConfig = aiConfig;
    if (!finalAiConfig) {
      // 如果前端没有传递配置，尝试使用环境变量
      const envConfig = {
        id: 'default',
        name: '默认配置',
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY || '',
        apiFormat: 'openai' as const,
      };
      finalAiConfig = JSON.stringify(envConfig);
    }

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

    // 验证 AI 配置
    if (!finalAiConfig) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_AI_CONFIG',
            message: 'AI配置未设置，请在设置中配置AI服务',
          },
        },
        { status: 400 }
      );
    }

    // 验证 AI 配置是否包含有效的 API Key
    try {
      const parsedConfig = JSON.parse(finalAiConfig);
      const apiKey = parsedConfig.apiKey || '';

      // 检查 API Key 是否为空或是占位符
      if (!apiKey ||
          apiKey === '' ||
          apiKey.includes('your_') ||
          apiKey.includes('YOUR_') ||
          apiKey.startsWith('{{')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_API_KEY',
              message: 'API密钥未配置或无效，请在设置中配置有效的API密钥',
            },
          },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_AI_CONFIG',
            message: 'AI配置格式无效',
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

    // 从 fileUrl 提取真实文件名
    let fileName = 'data.xlsx'; // 默认值
    if (fileUrl) {
      try {
        const urlPath = new URL(fileUrl, 'http://localhost').pathname;
        let fullFileName = urlPath.split('/').pop() || '';
        // URL 解码文件名（处理中文文件名）
        fullFileName = decodeURIComponent(fullFileName);
        fileName = fullFileName;
        console.log('[Analyze API] 从URL提取文件名:', fileName);
      } catch (e) {
        console.error('[Analyze API] 解析文件名失败:', e);
      }
    }

    // 创建任务
    console.log('[Analyze API] 准备创建任务...');
    console.log('[Analyze API] 账号名称:', accountName || '未指定');
    const task = await taskQueue.create(
      fileId,
      fileName, // 使用真实文件名
      0, // TODO: 从文件系统获取真实文件大小
      JSON.stringify(finalMapping),
      finalAiConfig,
      accountName || null, // 传递账号名称
      fileUrl || null // 传递文件URL
    );
    console.log('[Analyze API] 任务已创建:', task.id);
    console.log('[Analyze API] 文件名:', task.fileName);
    console.log('[Analyze API] 文件URL:', fileUrl || '无');
    const allTasks = await taskQueue.getAll();
    console.log('[Analyze API] 当前队列任务数:', allTasks.length);

    // 验证任务可以被立即获取
    const verifyTask = await taskQueue.get(task.id);
    console.log('[Analyze API] 验证获取任务:', verifyTask ? '成功' : '失败');

    // 注意：不在这里直接调用 executeAnalysis
    // 因为 Vercel Serverless 在 HTTP 响应后会冻结执行环境
    // 需要通过 /api/jobs/process 端点来处理队列中的任务
    console.log('[Analyze API] 任务已创建，等待后台处理');
    console.log('[Analyze API] 请通过 /api/jobs/process 触发任务执行');

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
