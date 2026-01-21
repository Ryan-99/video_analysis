// src/app/api/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 配置文件路径
 */
const CONFIG_PATH = path.join(process.cwd(), 'src', 'config', 'ai-configs.json');

/**
 * GET /api/config
 * 获取所有AI配置
 */
export async function GET() {
  try {
    const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '读取配置失败',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/config
 * 更新AI配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必要字段
    if (!body.version || !body.configs || !Array.isArray(body.configs)) {
      return NextResponse.json(
        {
          success: false,
          error: '配置格式无效',
        },
        { status: 400 }
      );
    }

    // 验证每个配置
    for (const config of body.configs) {
      if (!config.id || !config.baseUrl || !config.apiKey || !config.model) {
        return NextResponse.json(
          {
            success: false,
            error: '配置项缺少必要字段 (id, baseUrl, apiKey, model)',
          },
          { status: 400 }
        );
      }
    }

    // 写入文件
    await fs.writeFile(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      data: body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '保存配置失败',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config
 * 添加新的AI配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newConfig = body.config;

    if (!newConfig) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少配置数据',
        },
        { status: 400 }
      );
    }

    // 验证必要字段
    if (!newConfig.id || !newConfig.baseUrl || !newConfig.apiKey || !newConfig.model) {
      return NextResponse.json(
        {
          success: false,
          error: '配置项缺少必要字段 (id, baseUrl, apiKey, model)',
        },
        { status: 400 }
      );
    }

    // 读取现有配置
    const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);

    // 检查ID是否已存在
    if (config.configs.find((c: any) => c.id === newConfig.id)) {
      return NextResponse.json(
        {
          success: false,
          error: `配置ID "${newConfig.id}" 已存在`,
        },
        { status: 400 }
      );
    }

    // 添加新配置
    config.configs.push(newConfig);

    // 写入文件
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '添加配置失败',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/config
 * 删除AI配置
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('id');

    if (!configId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少配置ID',
        },
        { status: 400 }
      );
    }

    // 读取现有配置
    const configData = await fs.readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(configData);

    // 检查是否为默认配置
    if (config.defaultConfigId === configId) {
      return NextResponse.json(
        {
          success: false,
          error: '无法删除默认配置',
        },
        { status: 400 }
      );
    }

    // 过滤掉要删除的配置
    const filteredConfigs = config.configs.filter((c: any) => c.id !== configId);

    if (filteredConfigs.length === config.configs.length) {
      return NextResponse.json(
        {
          success: false,
          error: `配置ID "${configId}" 不存在`,
        },
        { status: 404 }
      );
    }

    config.configs = filteredConfigs;

    // 写入文件
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除配置失败',
      },
      { status: 500 }
    );
  }
}
