import { taskQueue } from '@/lib/queue/memory';
import { executeWithFallback } from '@/lib/ai-service/factory';
import { VideoData, AccountAnalysis } from '@/types';
import {
  calculateAllMetrics,
  groupByMonth,
  calculateMonthlyStats,
  getSortedMonthlyData,
  filterVirals,
  calculateThreshold,
} from '@/lib/calculator';

/**
 * 执行完整的分析流程
 * @param taskId 任务ID
 */
export async function executeAnalysis(taskId: string): Promise<void> {
  const task = taskQueue.get(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  try {
    // 步骤1: 解析数据
    taskQueue.update(taskId, {
      status: 'parsing',
      currentStep: '正在解析数据...',
      progress: 10,
    });
    const videos = await parseData(task.fileId, task.columnMapping);

    // 步骤2: 计算指标
    taskQueue.update(taskId, {
      status: 'calculating',
      currentStep: '正在计算指标...',
      progress: 30,
    });
    const metrics = calculateAllMetrics(videos);
    const videosWithMonth = groupByMonth(metrics);
    const monthlyStatsMap = calculateMonthlyStats(videosWithMonth);
    const monthlyData = getSortedMonthlyData(monthlyStatsMap);

    // 计算爆款阈值和筛选爆款视频
    const allEngagements = metrics.map(m => m.totalEngagement);
    const threshold = calculateThreshold(allEngagements);
    const virals = filterVirals(metrics, threshold);

    // 步骤3: AI分析
    taskQueue.update(taskId, {
      status: 'analyzing',
      currentStep: '正在进行AI分析...',
      progress: 50,
    });
    const accountAnalysis = await executeWithFallback<AccountAnalysis>(
      async (service) => await service.analyzeAccount(videos),
      'claude'
    );

    // 步骤4: 生成图表（TODO: 集成Python图表服务）
    taskQueue.update(taskId, {
      status: 'generating_charts',
      currentStep: '正在生成图表...',
      progress: 80,
    });
    // TODO: 调用Python图表服务生成图表

    // 步骤5: 汇总结果
    const resultData = JSON.stringify({
      account: accountAnalysis,
      monthlyTrend: {
        summary: `共分析了 ${videos.length} 条视频`,
        data: monthlyData,
        stages: [], // TODO: 分析内容阶段
      },
      virals: {
        summary: `发现 ${virals.length} 条爆款视频`,
        total: virals.length,
        threshold,
        byCategory: [], // TODO: 按分类统计爆款
      },
    });

    // 步骤6: 完成任务
    taskQueue.update(taskId, {
      status: 'completed',
      progress: 100,
      currentStep: '分析完成',
      resultData,
      recordCount: videos.length,
      viralCount: virals.length,
      completedAt: new Date(),
    });
  } catch (error) {
    // 处理错误
    taskQueue.update(taskId, {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
    });
    throw error;
  }
}

/**
 * 解析数据文件
 * @param fileId 文件ID
 * @param columnMappingStr 列映射JSON字符串
 * @returns 解析后的视频数据数组
 */
async function parseData(fileId: string, columnMappingStr: string): Promise<VideoData[]> {
  // TODO: 实现真实的Excel解析逻辑
  // 目前返回模拟数据用于测试

  const columnMapping = JSON.parse(columnMappingStr);

  // 模拟数据
  return [
    {
      title: '测试视频1',
      likes: 1234,
      comments: 56,
      saves: 78,
      shares: 12,
      publishTime: new Date('2025-01-15T10:30:00'),
    },
    {
      title: '测试视频2',
      likes: 5678,
      comments: 234,
      saves: 456,
      shares: 89,
      publishTime: new Date('2025-01-10T14:20:00'),
    },
    {
      title: '测试视频3',
      likes: 890,
      comments: 45,
      saves: 67,
      shares: 23,
      publishTime: new Date('2024-12-20T09:15:00'),
    },
  ];
}
