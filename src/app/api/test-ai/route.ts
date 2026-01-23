import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/test-ai
 * 测试 AI API 配置是否正确
 */
export async function POST(request: NextRequest) {
  try {
    const { aiConfig } = await request.json();

    if (!aiConfig) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '缺少 AI 配置',
          },
        },
        { status: 400 }
      );
    }

    const providerConfig = JSON.parse(aiConfig);

    // 解析API密钥（支持环境变量）
    const apiKey = providerConfig.apiKey.startsWith('{{')
      ? process.env[providerConfig.apiKey.slice(2, -2)] || providerConfig.apiKey
      : providerConfig.apiKey;

    if (!apiKey || apiKey === '' || apiKey.includes('your_')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'API密钥未配置',
          },
        },
        { status: 400 }
      );
    }

    // 构建API URL
    let url = providerConfig.apiUrl;
    if (!url.includes('/chat/completions') && providerConfig.apiFormat === 'openai') {
      const baseUrl = url.replace(/\/$/, '');
      url = `${baseUrl}/chat/completions`;
    } else if (!url.includes('/v1/messages') && providerConfig.apiFormat === 'claude') {
      const baseUrl = url.replace(/\/$/, '');
      url = `${baseUrl}/v1/messages`;
    }

    console.log(`[AI Test] 测试API: ${url}, 模型: ${providerConfig.model}`);

    // 发送测试请求
    const testPrompt = '请回复"测试成功"';
    const startTime = Date.now();

    let response;
    if (providerConfig.apiFormat === 'claude') {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: providerConfig.model,
          max_tokens: 100,
          messages: [{ role: 'user', content: testPrompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });
    } else {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          messages: [{ role: 'user', content: testPrompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });
    }

    const duration = Date.now() - startTime;

    // 检查响应类型
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_API_URL',
              message: 'API地址配置错误',
              details: `返回了HTML页面而不是JSON响应。请检查API地址是否正确。\n当前配置: ${providerConfig.apiUrl}`,
            },
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'API返回了非JSON响应',
            details: `Content-Type: ${contentType}`,
          },
        },
        { status: 400 }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_ERROR',
            message: `API错误 (${response.status})`,
            details: errorData.error?.message || errorData.error || response.statusText,
          },
        },
        { status: 400 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        message: 'API连接成功',
        url: url.replace(apiKey, '***'), // 隐藏密钥
        model: providerConfig.model,
        responseTime: `${duration}ms`,
        responsePreview: JSON.stringify(data).substring(0, 200),
      },
    });
  } catch (error) {
    console.error('AI测试失败:', error);

    // 检查是否是超时错误
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: '请求超时',
            details: 'API响应时间过长。可能原因：\n1. 模型正在处理复杂请求\n2. 网络连接不稳定\n3. API服务负载过高',
          },
        },
        { status: 408 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TEST_FAILED',
          message: error instanceof Error ? error.message : '测试失败',
        },
      },
      { status: 500 }
    );
  }
}
