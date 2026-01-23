// src/lib/analyzer/pipeline.ts
// 分析流程 - 带完整日志记录
import { taskQueue } from '@/lib/queue/memory';
import { analysisLogger } from '@/lib/logger';
import { VideoData, AccountAnalysis } from '@/types';
import {
  calculateAllMetrics,
  groupByMonth,
  calculateMonthlyStats,
  getSortedMonthlyData,
  filterVirals,
  calculateThreshold,
} from '@/lib/calculator';
import { aiAnalysisService } from '@/lib/ai-analysis/service';
import * as XLSX from 'xlsx';

/**
 * 使用动态配置调用AI（保留用于兼容）
 */
async function callAIWithConfig(
  videos: VideoData[],
  aiConfigStr?: string
): Promise<AccountAnalysis> {
  return await aiAnalysisService.analyzeAccountOverview(videos, aiConfigStr);
}

/**
 * 执行完整的分析流程
 * @param taskId 任务ID
 */
export async function executeAnalysis(taskId: string): Promise<void> {
  const task = taskQueue.get(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  /**
   * 辅助函数：记录日志
   */
  const logStep = async (
    phase: string,
    step: string,
    status: 'start' | 'progress' | 'success' | 'error',
    details?: {
      input?: any;
      output?: any;
      error?: string;
    }
  ) => {
    const log = {
      timestamp: new Date().toISOString(),
      level: status === 'error' ? 'error' : 'info',
      phase,
      step,
      status,
      ...details,
    };
    analysisLogger.add(taskId, log);
  };

  const startTime = Date.now();

  try {
    // 步骤1: 解析数据（使用真实Excel文件）
    await logStep('parse', '开始解析数据', 'start');
    taskQueue.update(taskId, {
      status: 'parsing',
      currentStep: '正在解析数据...',
      progress: 5,
    });

    const videos = await parseData(task.fileId, task.fileName, task.columnMapping, task.fileUrl);
    await logStep('parse', '数据解析完成', 'success', {
      output: { recordCount: videos.length },
      duration: Date.now() - startTime,
    });

    // 步骤2: 计算指标
    await logStep('calculate', '开始计算指标', 'start');
    taskQueue.update(taskId, {
      status: 'calculating',
      currentStep: '正在计算指标...',
      progress: 15,
    });

    const calcStartTime = Date.now();
    const metrics = calculateAllMetrics(videos);
    const videosWithMonth = groupByMonth(metrics);
    const monthlyStatsMap = calculateMonthlyStats(videosWithMonth);
    const monthlyData = getSortedMonthlyData(monthlyStatsMap);

    // 计算爆款阈值和筛选爆款视频
    const allEngagements = metrics.map(m => m.totalEngagement);
    const threshold = calculateThreshold(allEngagements);
    const virals = filterVirals(metrics, threshold);

    await logStep('calculate', '指标计算完成', 'success', {
      output: {
        totalVideos: metrics.length,
        monthlyDataPoints: monthlyData.length,
        viralThreshold: threshold.toFixed(2),
        viralCount: virals.length,
      },
      duration: Date.now() - calcStartTime,
    });

    // 步骤3: AI分析 - 账号概况
    await logStep('ai', '开始AI分析 - 账号概况', 'start', {
      message: `分析 ${videos.length} 条视频的账号概况...`,
    });
    taskQueue.update(taskId, {
      status: 'analyzing',
      currentStep: '正在分析账号概况...',
      progress: 25,
    });

    const accountStartTime = Date.now();
    const accountAnalysis = await aiAnalysisService.analyzeAccountOverview(videos, task.aiConfig);
    await logStep('ai', '账号概况分析完成', 'success', {
      message: `账号名称：${accountAnalysis.name} | 类型：${accountAnalysis.type} | 核心主题：${accountAnalysis.coreTopic}`,
      details: {
        账号名称: accountAnalysis.name,
        账号类型: accountAnalysis.type,
        核心主题: accountAnalysis.coreTopic,
        目标受众: accountAnalysis.audience,
        初级变现: accountAnalysis.monetization.level1,
      },
      duration: Date.now() - accountStartTime,
    });

    // 步骤4: AI分析 - 月度趋势和阶段划分
    await logStep('ai', '开始AI分析 - 月度趋势', 'start', {
      message: `分析 ${monthlyData.length} 个月的数据趋势...`,
    });
    taskQueue.update(taskId, {
      currentStep: '正在分析月度趋势...',
      progress: 40,
    });

    const monthlyStartTime = Date.now();
    const monthlyTrendAnalysis = await aiAnalysisService.analyzeMonthlyTrend(
      monthlyData,
      virals,
      task.aiConfig
    );
    const stagesInfo = monthlyTrendAnalysis.stages?.map(s => s.type).join('、') || '无';
    await logStep('ai', '月度趋势分析完成', 'success', {
      message: `发现 ${monthlyTrendAnalysis.stages?.length || 0} 个发展阶段：${stagesInfo}`,
      details: {
        趋势总结: monthlyTrendAnalysis.summary,
        发展阶段: monthlyTrendAnalysis.stages?.length || 0,
        阶段列表: stagesInfo,
      },
      duration: Date.now() - monthlyStartTime,
    });

    // 步骤5: AI分析 - 爆款视频分类
    await logStep('ai', '开始AI分析 - 爆款分类', 'start', {
      message: `分析 ${virals.length} 条爆款视频（阈值：${Math.round(threshold).toLocaleString()}）...`,
    });
    taskQueue.update(taskId, {
      currentStep: '正在分析爆款视频...',
      progress: 55,
    });

    const viralStartTime = Date.now();
    const viralAnalysis = await aiAnalysisService.analyzeViralVideos(
      virals,
      threshold,
      task.aiConfig
    );
    const categories = viralAnalysis.byCategory?.map(c => c.category).join('、') || '无';
    await logStep('ai', '爆款分析完成', 'success', {
      message: `识别出 ${viralAnalysis.byCategory?.length || 0} 类爆款内容：${categories}`,
      details: {
        爆款总结: viralAnalysis.summary,
        爆款总数: virals.length,
        判定阈值: Math.round(threshold).toLocaleString(),
        分类数量: viralAnalysis.byCategory?.length || 0,
        分类列表: categories,
        共同元素: viralAnalysis.patterns?.commonElements || '暂无',
      },
      duration: Date.now() - viralStartTime,
    });

    // 步骤6: AI分析 - 生成选题库
    await logStep('ai', '开始AI分析 - 选题库生成', 'start', {
      message: '基于账号概况和爆款分析，生成30条爆款选题库...',
    });
    taskQueue.update(taskId, {
      currentStep: '正在生成选题库...',
      progress: 70,
    });

    const topicsStartTime = Date.now();
    const topics = await aiAnalysisService.generateTopics(
      accountAnalysis,
      viralAnalysis,
      task.aiConfig
    );
    const topicCategories = topics.map(t => t.category).slice(0, 6).join('、');
    await logStep('ai', '选题库生成完成', 'success', {
      message: `生成 ${topics.length} 条爆款选题（6大类）：${topicCategories}${topics.length > 6 ? '...' : ''}`,
      details: {
        选题总数: topics.length,
        选题分类: topics.map(t => `${t.category}(${t.id})`).join('、'),
        生成状态: topics.length >= 30 ? '完整' : `不足（缺少${30 - topics.length}条）`,
      },
      duration: Date.now() - topicsStartTime,
    });

    // 步骤7: 汇总结果
    await logStep('report', '生成报告', 'start');
    taskQueue.update(taskId, {
      status: 'generating_charts',
      currentStep: '正在生成报告...',
      progress: 90,
    });

    const resultData = JSON.stringify({
      account: accountAnalysis,
      monthlyTrend: {
        summary: monthlyTrendAnalysis.summary || `共分析了 ${videos.length} 条视频，覆盖 ${monthlyData.length} 个月份`,
        data: monthlyData,
        stages: monthlyTrendAnalysis.stages || [],
      },
      virals: {
        summary: viralAnalysis.summary || `发现 ${virals.length} 条爆款视频`,
        total: virals.length,
        threshold,
        byCategory: viralAnalysis.byCategory || [],
        patterns: viralAnalysis.patterns || {},
      },
      topics,
    });

    await logStep('report', '报告生成完成', 'success', {
      output: { resultSize: resultData.length },
    });

    // 步骤8: 完成任务
    taskQueue.update(taskId, {
      status: 'completed',
      progress: 100,
      currentStep: '分析完成',
      resultData,
      recordCount: videos.length,
      viralCount: virals.length,
      completedAt: new Date(),
    });

    await logStep('system', '任务完成', 'success', {
      output: {
        totalDuration: Date.now() - startTime,
        recordCount: videos.length,
        viralCount: virals.length,
      },
    });

  } catch (error) {
    // 记录错误日志
    await logStep('system', '任务失败', 'error', {
      error: error instanceof Error ? error.message : '未知错误',
    });

    // 更新任务状态
    taskQueue.update(taskId, {
      status: 'failed',
      error: error instanceof Error ? error.message : '未知错误',
    });
    throw error;
  }
}

/**
 * 解析Excel文件，返回VideoData数组
 * @param fileId 文件ID
 * @param fileName 文件名
 * @param columnMappingStr 列映射JSON字符串
 * @param fileUrl Vercel Blob URL（可选，生产环境使用）
 * @returns 解析后的视频数据数组
 */
async function parseData(
  fileId: string,
  fileName: string,
  columnMappingStr: string,
  fileUrl?: string | null
): Promise<VideoData[]> {
  const columnMapping = JSON.parse(columnMappingStr);

  console.log('[parseData] 开始解析文件');
  console.log('[parseData] 文件ID:', fileId);
  console.log('[parseData] 文件名:', fileName);
  console.log('[parseData] 文件URL:', fileUrl || '本地文件系统');

  let arrayBuffer: ArrayBuffer;

  // 优先使用 Vercel Blob URL（生产环境）
  if (fileUrl && fileUrl.startsWith('http')) {
    console.log('[parseData] 从 Vercel Blob 获取文件');
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`获取文件失败: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      arrayBuffer = buffer;
      console.log('[parseData] Vercel Blob 文件大小:', arrayBuffer.byteLength);
    } catch (error) {
      console.error('[parseData] Vercel Blob 获取失败:', error);
      throw new Error(`从 Vercel Blob 获取文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // 本地开发：从文件系统读取（兼容本地开发）
    console.log('[parseData] 从本地文件系统获取文件');
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, fileName);

    console.log('[parseData] 本地文件路径:', filePath);

    const buffer = await readFile(filePath);

    // 将Buffer转换为ArrayBuffer
    if (Buffer.isBuffer(buffer)) {
      arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    } else {
      arrayBuffer = buffer;
    }
    console.log('[parseData] 本地文件大小:', arrayBuffer.byteLength);
  }

  // 读取工作簿
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // 获取第一个工作表
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 转换为JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    dateNF: 'yyyy-mm-dd hh:mm:ss',
  }) as Record<string, any>[];

  console.log('[parseData] 读取到数据行数:', jsonData.length);

  // 映射到VideoData结构
  const videos: VideoData[] = [];

  for (const row of jsonData) {
    try {
      // 获取各列的值
      const title = String(row[columnMapping.title] || row['标题'] || '');
      const likes = Number(row[columnMapping.likes] || row['点赞'] || 0);
      const comments = Number(row[columnMapping.comments] || row['评论'] || 0);
      const saves = Number(row[columnMapping.saves] || row['收藏'] || 0);
      const shares = Number(row[columnMapping.shares] || row['转发'] || 0);

      // 处理发布时间
      let publishTime: Date;
      const timeValue = row[columnMapping.publishTime] || row['发布时间'];

      if (typeof timeValue === 'number') {
        // Excel日期序列号
        publishTime = new Date((timeValue - 25569) * 86400 * 1000);
      } else if (typeof timeValue === 'string') {
        // 字符串日期
        publishTime = new Date(timeValue);
      } else {
        publishTime = new Date();
      }

      // 验证数据有效性
      if (title && (likes > 0 || comments > 0 || saves > 0 || shares > 0)) {
        videos.push({
          title,
          likes,
          comments,
          saves,
          shares,
          publishTime,
        });
      }
    } catch (error) {
      console.error('[parseData] 解析行数据失败:', row, error);
    }
  }

  console.log('[parseData] 有效数据行数:', videos.length);

  if (videos.length === 0) {
    throw new Error('未找到有效数据，请检查Excel文件格式和列映射配置');
  }

  return videos;
}
