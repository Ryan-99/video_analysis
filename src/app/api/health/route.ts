import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * 健康检查 - 验证数据库连接
 */
export async function GET() {
  try {
    // 测试数据库连接
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      success: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Health Check] 数据库连接失败:', error);
    return NextResponse.json(
      {
        success: false,
        database: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
