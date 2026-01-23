// 测试数据库连接
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('1. 测试数据库连接...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✓ 数据库连接成功');

    console.log('\n2. 检查 analysis_tasks 表...');
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    console.log('   数据库中的表:', tables.map(t => t.table_name));

    const hasTable = tables.some(t => t.table_name === 'analysis_tasks');
    if (hasTable) {
      console.log('   ✓ analysis_tasks 表已存在');

      console.log('\n3. 查询任务数量...');
      const count = await prisma.analysisTask.count();
      console.log(`   ✓ 当前任务数量: ${count}`);
    } else {
      console.log('   ✗ analysis_tasks 表不存在，需要运行 prisma db push');
    }

  } catch (error) {
    console.error('   ✗ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
