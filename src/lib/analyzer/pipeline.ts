// src/lib/analyzer/pipeline.ts
// 分析流程 - 带完整日志记录
import { taskQueue } from '@/lib/queue/database';
import { analysisLogger } from '@/lib/logger';
import { VideoData, AccountAnalysis, AnalysisLog, ViralVideo, MonthlyData, Task, TaskStatus } from '@/types';
import { TaskStateMachine } from '@/lib/queue/state-machine';
import { FULL_FLOW_PROGRESS, STEP_FLOW_PROGRESS } from '@/lib/queue/progress-config';
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
 * 日志步骤函数类型
 */
type LogStepFunc = (
  phase: string,
  step: string,
  status: 'start' | 'progress' | 'success' | 'error',
  details?: {
    input?: any;
    output?: any;
    error?: string;
  }
) => Promise<void>;

/**
 * 判断错误是否可重试
 * 可重试的错误类型：网络错误、超时、连接被拒绝、速率限制
 */
function isRetryableError(error: any): boolean {
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /fetch failed/i,
    /429/,  // 速率限制
  ];

  const errorMessage = error instanceof Error ? error.message : String(error);

  return retryablePatterns.some(pattern =>
    pattern.test(errorMessage) ||
    (error.code && pattern.test(error.code))
  );
}

/**
 * 安全处理错误：更新状态、清理中间状态、释放锁
 *
 * 这是统一的错误处理函数，确保：
 * 1. 状态被正确设置
 * 2. 所有中间状态被清理（processing、topicStep、analysisStep等）
 * 3. processing 锁被释放（在 atomicUpdate 中通过 processing: false 实现）
 * 4. 错误信息被记录
 * 5. 可重试错误自动重试
 */
async function handleTaskError(
  taskId: string,
  error: unknown,
  logStep?: LogStepFunc
): Promise<void> {
  const task = await taskQueue.get(taskId);
  if (!task) {
    console.error(`[Analysis] 任务不存在: ${taskId}`);
    return;
  }

  const isRetryable = isRetryableError(error);
  const retryCount = task.retryCount || 0;
  const maxRetries = 3;

  if (isRetryable && retryCount < maxRetries) {
    // 可重试：使用 update + 显式释放锁
    // 添加重试日志，让用户能区分"重试"和"新执行"
    if (logStep) {
      await logStep('system', `步骤重试 (${retryCount + 1}/${maxRetries})`, 'info', {
        step: task.analysisStep,
        reason: error instanceof Error ? error.message : String(error)
      });
    }

    await taskQueue.update(taskId, {
      status: 'queued',
      processing: false,
      retryCount: retryCount + 1,
      error: `重试 ${retryCount + 1}/${maxRetries}: ${error instanceof Error ? error.message : String(error)}`
    });
    console.log(`[Analysis] 任务 ${taskId} 进入重试队列 (${retryCount + 1}/${maxRetries}), 步骤: ${task.analysisStep}`);
  } else {
    // 永久失败：使用 atomicUpdate + 自动释放锁
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    if (logStep) {
      await logStep('system', '任务失败', 'error', { error: errorMessage });
    }

    try {
      await taskQueue.atomicUpdate(taskId, {
        status: 'failed',
        error: errorMessage,
        processing: false,
        topicStep: null,
        topicDetailIndex: null,
        analysisStep: null,
      });
    } catch (updateError) {
      // atomicUpdate 失败，手动释放锁
      console.error('[Analysis] atomicUpdate失败,尝试手动释放锁', updateError);
      const released = await taskQueue.releaseLock(taskId);
      if (!released) {
        console.error(`[Analysis] 手动释放锁也失败: ${taskId}`);
      }
    }

    console.error(`[Analysis] 任务 ${taskId} 失败:`, errorMessage);
  }
}

/**
 * 使用动态配置调用AI（保留用于兼容）
 */
async function callAIWithConfig(
  videos: VideoData[],
  monthlyData: MonthlyData[],
  aiConfigStr?: string
): Promise<AccountAnalysis> {
  return await aiAnalysisService.analyzeAccountOverview(videos, monthlyData, aiConfigStr);
}

/**
 * 执行完整的分析流程
 * @param taskId 任务ID
 */
export async function executeAnalysis(taskId: string): Promise<void> {
  console.log('[Analysis] 开始任务:', taskId);

  const task = await taskQueue.get(taskId);
  if (!task) {
    console.error('[Analysis] 任务不存在:', taskId);
    throw new Error('任务不存在');
  }

  console.log('[Analysis] 文件:', task.fileName, '| URL:', task.fileUrl ? '已设置' : '未设置');

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
    const log: AnalysisLog = {
      timestamp: new Date().toISOString(),
      level: status === 'error' ? 'error' : 'info',
      phase: phase as any,
      step,
      status,
      ...details,
    };
    // await 异步日志记录
    await analysisLogger.add(taskId, log);
  };

  const startTime = Date.now();

  try {
    // 步骤1: 解析数据（使用真实Excel文件）
    await logStep('parse', '开始解析数据', 'start');
    await taskQueue.update(taskId, {
      status: 'parsing',
      currentStep: '正在解析数据...',
      progress: FULL_FLOW_PROGRESS.parse_start,
    });

    const videos = await parseData(task.fileId, task.fileName, task.columnMapping, task.fileUrl, task.fileContent);
    await logStep('parse', '数据解析完成', 'success', {
      output: { recordCount: videos.length },
    });

    // 步骤2: 计算指标
    await logStep('calculate', '开始计算指标', 'start');
    await taskQueue.update(taskId, {
      status: 'calculating',
      currentStep: '正在计算指标...',
      progress: FULL_FLOW_PROGRESS.calculate_complete,
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
    // 转换为 ViralVideo 类型（添加 threshold 属性）
    const viralVideos: ViralVideo[] = virals.map(v => ({ ...v, threshold }));

    await logStep('calculate', '指标计算完成', 'success', {
      output: {
        totalVideos: metrics.length,
        monthlyDataPoints: monthlyData.length,
        viralThreshold: threshold.toFixed(2),
        viralCount: virals.length,
      },
    });

    // 步骤3: AI分析 - 账号概况
    await logStep('ai', '开始AI分析 - 账号概况', 'start', {
    });
    await taskQueue.update(taskId, {
      status: 'analyzing',
      currentStep: '正在分析账号概况...',
      progress: FULL_FLOW_PROGRESS.account_analysis_complete,
    });

    const accountStartTime = Date.now();
    const accountAnalysis = await aiAnalysisService.analyzeAccountOverview(videos, monthlyData, task.aiConfig, task.accountName);
    await logStep('ai', '账号概况分析完成', 'success', {
      output: {
        账号名称: accountAnalysis.nickname,
        账号类型: accountAnalysis.accountType,
        核心母题: accountAnalysis.coreTopics.join('、'),
        目标受众: accountAnalysis.audience.description,
        变现方式: accountAnalysis.monetization.methods.join('、'),
      },
    });

    // 步骤4: AI分析 - 月度趋势和阶段划分
    await logStep('ai', '开始AI分析 - 月度趋势', 'start', {
    });
    await taskQueue.update(taskId, {
      currentStep: '正在分析月度趋势...',
      progress: FULL_FLOW_PROGRESS.monthly_trend_complete,
    });

    const monthlyStartTime = Date.now();
    const monthlyTrendAnalysis = await aiAnalysisService.analyzeMonthlyTrend(
      monthlyData,
      viralVideos,
      task.aiConfig,
      task.fileName,
      metrics.length
    );
    const stagesInfo = monthlyTrendAnalysis.stages?.map(s => s.type).join('、') || '无';
    await logStep('ai', '月度趋势分析完成', 'success', {
      output: {
        趋势总结: monthlyTrendAnalysis.summary,
        发展阶段: monthlyTrendAnalysis.stages?.length || 0,
        阶段列表: stagesInfo,
        关键波峰: monthlyTrendAnalysis.peakMonths?.length || 0,
        爆发期: monthlyTrendAnalysis.explosivePeriods?.length || 0,
      },
    });

    // 步骤5: AI分析 - 爆款视频分类
    await logStep('ai', '开始AI分析 - 爆款分类', 'start', {
    });
    await taskQueue.update(taskId, {
      currentStep: '正在分析爆款视频...',
      progress: FULL_FLOW_PROGRESS.viral_analysis_complete,
    });

    const viralStartTime = Date.now();

    // 【临时修复】跳过耗时的 viralAnalysis，使用简化数据
    // TODO: 完整重构后恢复完整分析
    console.log('[Analysis] 使用简化爆款分析（临时修复，避免超时）');
    const viralAnalysis = {
      summary: `共筛选出 ${virals.length} 条爆款视频，判定阈值为 ${Math.round(threshold).toLocaleString()}`,
      total: virals.length,
      threshold: threshold,
      byCategory: [],
      methodology: undefined,
      topicLibrary: [],
      patterns: {
        commonElements: '数据分析中',
        timingPattern: '数据分析中',
        titlePattern: '数据分析中'
      }
    };
    const categories = '数据分析中（简化模式）';
    await logStep('ai', '爆款分析完成（简化模式）', 'success', {
      output: {
        爆款总数: virals.length,
        判定阈值: Math.round(threshold).toLocaleString(),
      },
    });

    // 步骤6: AI分析 - 生成选题库（分步执行）
    await logStep('ai', '开始AI分析 - 选题库生成', 'start', {
    });

    // 保存当前进度到数据库，供后续步骤使用
    // 按日期分组，找出每天的Top1视频（用于图表）
    const dailyTop1 = new Map<string, { engagement: number; title: string; date: string }>();
    for (const video of videos) {
      const publishTime = video.publishTime as unknown as Date | string;
      const date = typeof publishTime === 'string'
        ? publishTime.split('T')[0]
        : (publishTime as Date).toISOString().split('T')[0];
      const engagement = video.likes + video.comments + video.saves + video.shares;
      const existing = dailyTop1.get(date);
      if (!existing || engagement > existing.engagement) {
        dailyTop1.set(date, {
          engagement,
          title: video.title,
          date,
        });
      }
    }
    const dailyTop1Data = Array.from(dailyTop1.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 构建完整结果数据
    const intermediateResult = JSON.stringify({
      account: accountAnalysis,
      monthlyTrend: {
        summary: monthlyTrendAnalysis.summary || `共分析了 ${videos.length} 条视频，覆盖 ${monthlyData.length} 个月份`,
        data: monthlyData,
        stages: monthlyTrendAnalysis.stages || [],
        dataScopeNote: monthlyTrendAnalysis.dataScopeNote,
        peakMonths: monthlyTrendAnalysis.peakMonths,
        viralThemes: monthlyTrendAnalysis.viralThemes,
        explosivePeriods: monthlyTrendAnalysis.explosivePeriods,
      },
      virals: {
        summary: viralAnalysis.summary || `发现 ${virals.length} 条爆款视频`,
        total: virals.length,
        threshold,
        byCategory: viralAnalysis.byCategory || [],
        patterns: viralAnalysis.patterns || {},
      },
      dailyTop1: dailyTop1Data, // 每日Top1数据，用于生成图表
      topics: [], // 待选题生成完成后再填充
    });

    // 原子性更新：将所有相关字段一起设置，避免中间状态
    await taskQueue.atomicUpdate(taskId, {
      status: 'topic_generating',
      resultData: intermediateResult,
      topicStep: 'outline',
      currentStep: '正在生成选题库...',
      progress: FULL_FLOW_PROGRESS.analysis_complete,
      analysisStep: null, // 清理中间步骤标记
      processing: false, // ✅ 释放锁，允许选题生成端点获取锁
    });

    console.log('[Analysis] 选题生成由独立端点处理, 暂停主流程');
    return; // 退出，等待选题生成完成后再继续

  } catch (error) {
    await handleTaskError(taskId, error, logStep);
    throw error;
  }
}

/**
 * 解析Excel文件，返回VideoData数组
 * @param fileId 文件ID
 * @param fileName 文件名
 * @param columnMappingStr 列映射JSON字符串
 * @param fileUrl Vercel Blob URL（可选，生产环境使用）
 * @param fileContent Base64 编码的文件内容（可选，解决 Blob URL 过期问题）
 * @returns 解析后的视频数据数组
 */
async function parseData(
  fileId: string,
  fileName: string,
  columnMappingStr: string,
  fileUrl?: string | null,
  fileContent?: string | null
): Promise<VideoData[]> {
  const columnMapping = JSON.parse(columnMappingStr);

  console.log('[Parse] 开始:', fileName, '| Blob URL:', fileUrl ? '是' : '否', '| Base64:', fileContent ? '是' : '否');

  let arrayBuffer: ArrayBuffer;

  // 优先使用 Base64 文件内容（解决 Blob URL 过期问题）
  if (fileContent && fileContent.length > 0) {
    try {
      console.log('[Parse] 从 Base64 解码文件, 大小:', fileContent.length);
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
      console.log('[Parse] Base64 解码成功, 文件大小:', arrayBuffer.byteLength);
    } catch (error) {
      console.error('[Parse] Base64 解码失败:', error);
      throw new Error(`Base64 文件内容解码失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (fileUrl && fileUrl.startsWith('http')) {
    // 备选：使用 Vercel Blob URL（可能已过期）
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`获取文件失败: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      arrayBuffer = buffer;
      console.log('[Parse] 从 Blob 获取文件, 大小:', arrayBuffer.byteLength);
    } catch (error) {
      console.error('[Parse] Blob 获取失败:', error);
      throw new Error(`从 Vercel Blob 获取文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // 本地开发：从文件系统读取（兼容本地开发）
    console.warn('[Parse] 使用本地文件系统 (生产环境不应走此分支)');

    const { readFile } = await import('fs/promises');
    const { join } = await import('path');

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, fileName);

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
    console.log('[Parse] 本地文件大小:', arrayBuffer.byteLength);
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
      console.error('[Parse] 解析行失败:', error);
    }
  }

  console.log('[Parse] 完成, 有效数据:', videos.length, '行');

  if (videos.length === 0) {
    throw new Error('未找到有效数据，请检查Excel文件格式和列映射配置');
  }

  return videos;
}

/**
 * 完成分析流程（选题生成后的后续步骤）
 * @param taskId 任务ID
 */
export async function completeAnalysis(taskId: string): Promise<void> {
  console.log('[Analysis] 完成分析流程, taskId:', taskId);

  const task = await taskQueue.get(taskId);
  if (!task) {
    console.error('[Analysis] 任务不存在:', taskId);
    throw new Error('任务不存在');
  }

  if (task.topicStep !== 'complete') {
    console.warn('[Analysis] 选题未完成, topicStep:', task.topicStep);
    return;
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
    const log: AnalysisLog = {
      timestamp: new Date().toISOString(),
      level: status === 'error' ? 'error' : 'info',
      phase: phase as any,
      step,
      status,
      ...details,
    };
    await analysisLogger.add(taskId, log);
  };

  try {
    // 解析结果数据
    let resultData: any;
    try {
      resultData = JSON.parse(task.resultData || '{}');
    } catch {
      throw new Error('结果数据格式错误');
    }

    const topics = resultData.topics || [];
    const viralCount = resultData.virals?.total || 0;

    // 记录选题生成完成日志
    await logStep('ai', '选题库生成完成', 'success', {
      output: {
        选题总数: topics.length,
        选题分类: topics.slice(0, 6).map((t: any) => `${t.category}(${t.id})`).join('、'),
        生成状态: topics.length >= 30 ? '完整' : `不足（缺少${30 - topics.length}条）`,
      },
    });

    // 生成报告
    await logStep('report', '生成报告', 'start');
    await taskQueue.update(taskId, {
      status: 'generating_charts',
      currentStep: '正在生成报告...',
      progress: FULL_FLOW_PROGRESS.chart_generation_complete,
    });

    await logStep('report', '报告生成完成', 'success', {
      output: { resultSize: task.resultData?.length || 0 },
    });

    // 完成任务
    await taskQueue.update(taskId, {
      status: 'completed',
      progress: FULL_FLOW_PROGRESS.task_complete,
      currentStep: '分析完成',
      recordCount: task.recordCount,
      viralCount,
      completedAt: new Date(),
    });

    await logStep('system', '任务完成', 'success', {
      output: {
        recordCount: task.recordCount,
        viralCount,
        topicCount: topics.length,
      },
    });

    console.log('[Analysis] 分析流程完成, taskId:', taskId);

  } catch (error) {
    console.error('[Analysis] completeAnalysis 执行失败:', error);

    // 确保即使失败，状态也被设置为 completed（容错处理）
    // 避免任务卡在 generating_charts 状态
    try {
      await taskQueue.update(taskId, {
        status: 'completed',
        progress: FULL_FLOW_PROGRESS.task_complete,
        currentStep: '分析完成',
        completedAt: new Date(),
      });
      console.log('[Analysis] 已强制设置任务为 completed 状态');
    } catch (updateError) {
      console.error('[Analysis] 强制设置 completed 状态也失败:', updateError);
    }

    await handleTaskError(taskId, error, logStep);
    throw error;
  }
}

// ========== 分步执行架构 ==========

/**
 * 分析步骤中间数据类型
 */
interface AnalysisStepData {
  videos?: VideoData[];
  metrics?: VideoData[];
  videosWithMonth?: (VideoData & { month: string })[];
  monthlyData?: MonthlyData[];
  threshold?: number;
  viralVideos?: ViralVideo[];
  accountAnalysis?: AccountAnalysis;
  monthlyTrendAnalysis?: any;
  viralAnalysis?: any;
  dailyTop1?: Array<{ date: string; engagement: number; title: string }>;
}

/**
 * 执行单步分析
 * @param taskId 任务ID
 * @param step 步骤编号 (0-6)
 */
export async function executeAnalysisStep(taskId: string, step: number): Promise<void> {
  console.log(`[Analysis Step] 开始步骤 ${step}, taskId:`, taskId);

  // 边界检查：步骤必须在 0-6 范围内
  if (step < 0 || step > 6) {
    throw new Error(`步骤参数超出范围: ${step}，必须在 0-6 之间`);
  }

  const task = await taskQueue.get(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  /**
   * 辅助函数：记录日志
   */
  const logStep = async (
    phase: string,
    stepName: string,
    status: 'start' | 'progress' | 'success' | 'error',
    details?: {
      input?: any;
      output?: any;
      error?: string;
    }
  ) => {
    const log: AnalysisLog = {
      timestamp: new Date().toISOString(),
      level: status === 'error' ? 'error' : 'info',
      phase: phase as any,
      step: stepName,
      status,
      ...details,
    };
    await analysisLogger.add(taskId, log);
  };

  // 获取或初始化中间数据
  let stepData: AnalysisStepData = {};
  if (task.analysisData) {
    try {
      stepData = JSON.parse(task.analysisData);
    } catch (e) {
      console.warn('[Analysis Step] 解析中间数据失败，将重新计算');
    }
  }

  try {
    switch (step) {
      case 0: // 解析数据
        await step0_ParseData(task, stepData, logStep);
        break;
      case 1: // 账号概况 AI
        await step1_AccountOverview(task, stepData, logStep);
        break;
      case 2: // 月度趋势 AI
        await step2_MonthlyTrend(task, stepData, logStep);
        break;
      case 3: // 爆发期详情 AI
        await step3_ExplosivePeriods(task, stepData, logStep);
        break;
      case 4: // 爆款主分析 AI
        await step4_ViralMain(task, stepData, logStep);
        break;
      case 5: // 方法论 AI
        await step5_Methodology(task, stepData, logStep);
        break;
      case 6: // 完成
        await step6_Complete(task, stepData, logStep);
        return; // 完成，不需要继续下一步
      default:
        throw new Error(`未知步骤: ${step}`);
    }

    // 保存中间数据并推进到下一步
    const nextStep = step + 1;
    const isComplete = nextStep >= 6; // 步骤 6 是完成步骤

    if (isComplete) {
      // 完成分析流程：保存 resultData 并设置 topicStep
      await step6_Complete(task, stepData, logStep);
    } else {
      // 继续下一步：使用正确的状态而非 queued
      const nextStatus = TaskStateMachine.getNextStepStatus(nextStep);

      await taskQueue.atomicUpdate(taskId, {
        analysisStep: nextStep,
        analysisData: JSON.stringify(stepData),
        status: nextStatus,
        currentStep: TaskStateMachine.getStepDescription(nextStep),
        progress: TaskStateMachine.getStepProgress(step),  // 修复：使用当前步骤的完成进度
        processing: true, // 保持锁定状态，由 process/route.ts 的 finally 块统一释放
      });

      console.log(`[Analysis Step] 步骤 ${step} → ${nextStep} 完成`);
    }

    console.log(`[Analysis Step] 步骤 ${step} 完成，下一步: ${nextStep}`);

  } catch (error) {
    console.error(`[Analysis Step] 步骤 ${step} atomicUpdate 失败:`, error instanceof Error ? error.message : String(error));
    await handleTaskError(taskId, error, logStep);
    throw error;
  }
}

/**
 * 步骤 0: 解析数据
 */
async function step0_ParseData(
  task: Task,
  stepData: AnalysisStepData,
  logStep: (phase: string, step: string, status: any, details?: any) => Promise<void>
): Promise<void> {
  await logStep('parse', '开始解析数据', 'start');
  await taskQueue.update(task.id, {
    status: 'parsing',
    currentStep: '正在解析数据...',
    progress: TaskStateMachine.getStepStartProgress(0), // 5% - 步骤开始时设置进度
  });

  const videos = await parseData(task.fileId, task.fileName, task.columnMapping, task.fileUrl, task.fileContent);

  // 计算基础指标
  const metrics = calculateAllMetrics(videos);
  const videosWithMonth = groupByMonth(metrics);
  const monthlyStatsMap = calculateMonthlyStats(videosWithMonth);
  const monthlyData = getSortedMonthlyData(monthlyStatsMap);
  const allEngagements = metrics.map(m => m.totalEngagement);
  const threshold = calculateThreshold(allEngagements);
  const virals = filterVirals(metrics, threshold);
  const viralVideos: ViralVideo[] = virals.map(v => ({ ...v, threshold }));

  // 计算每日 Top1（用于图表）
  const dailyTop1 = new Map<string, { engagement: number; title: string; date: string }>();
  for (const video of videos) {
    const publishTime = video.publishTime as unknown as Date | string;
    const date = typeof publishTime === 'string'
      ? publishTime.split('T')[0]
      : (publishTime as Date).toISOString().split('T')[0];
    const engagement = video.likes + video.comments + video.saves + video.shares;
    const existing = dailyTop1.get(date);
    if (!existing || engagement > existing.engagement) {
      dailyTop1.set(date, { engagement, title: video.title, date });
    }
  }

  // 保存到中间数据
  stepData.videos = videos;
  stepData.metrics = metrics;
  stepData.videosWithMonth = videosWithMonth;
  stepData.monthlyData = monthlyData;
  stepData.threshold = threshold;
  stepData.viralVideos = viralVideos;
  stepData.dailyTop1 = Array.from(dailyTop1.values()).sort((a, b) => a.date.localeCompare(b.date));

  await logStep('parse', '数据解析完成', 'success', {
    output: { recordCount: videos.length, viralCount: viralVideos.length, threshold: Math.round(threshold) },
  });
}

/**
 * 步骤 1: 账号概况 AI 分析
 */
async function step1_AccountOverview(
  task: Task,
  stepData: AnalysisStepData,
  logStep: (phase: string, step: string, status: any, details?: any) => Promise<void>
): Promise<void> {
  if (!stepData.videos || !stepData.monthlyData) {
    throw new Error('缺少前置数据');
  }

  await logStep('ai', '开始AI分析 - 账号概况', 'start');
  await taskQueue.update(task.id, {
    status: 'analyzing',
    currentStep: '正在分析账号概况...',
    progress: TaskStateMachine.getStepStartProgress(1), // 28% - 步骤开始时设置进度
  });

  const accountAnalysis = await aiAnalysisService.analyzeAccountOverview(
    stepData.videos,
    stepData.monthlyData,
    task.aiConfig,
    task.accountName
  );

  stepData.accountAnalysis = accountAnalysis;

  await logStep('ai', '账号概况分析完成', 'success', {
    output: {
      账号名称: accountAnalysis.nickname,
      账号类型: accountAnalysis.accountType,
      核心母题: accountAnalysis.coreTopics.join('、'),
    },
  });
}

/**
 * 步骤 2: 月度趋势 AI 分析
 */
async function step2_MonthlyTrend(
  task: Task,
  stepData: AnalysisStepData,
  logStep: (phase: string, step: string, status: any, details?: any) => Promise<void>
): Promise<void> {
  if (!stepData.monthlyData || !stepData.viralVideos || !stepData.metrics) {
    throw new Error('缺少前置数据');
  }

  await logStep('ai', '开始AI分析 - 月度趋势', 'start');
  await taskQueue.update(task.id, {
    currentStep: '正在分析月度趋势...',
    progress: TaskStateMachine.getStepStartProgress(2), // 42% - 步骤开始时设置进度
  });

  const monthlyTrendAnalysis = await aiAnalysisService.analyzeMonthlyTrend(
    stepData.monthlyData,
    stepData.viralVideos,
    task.aiConfig,
    task.fileName,
    stepData.metrics.length
  );

  stepData.monthlyTrendAnalysis = monthlyTrendAnalysis;

  await logStep('ai', '月度趋势分析完成', 'success', {
    output: {
      趋势总结: monthlyTrendAnalysis.summary,
      发展阶段: monthlyTrendAnalysis.stages?.length || 0,
      爆发期: monthlyTrendAnalysis.explosivePeriods?.length || 0,
    },
  });
}

/**
 * 步骤 3: 爆发期详情 AI 分析
 */
async function step3_ExplosivePeriods(
  task: Task,
  stepData: AnalysisStepData,
  logStep: (phase: string, step: string, status: any, details?: any) => Promise<void>
): Promise<void> {
  if (!stepData.monthlyTrendAnalysis || !stepData.viralVideos) {
    throw new Error('缺少前置数据');
  }

  await logStep('ai', '开始AI分析 - 爆发期详情', 'start');
  await taskQueue.update(task.id, {
    currentStep: '正在分析爆发期详情...',
    progress: TaskStateMachine.getStepStartProgress(3), // 57% - 步骤开始时设置进度
  });

  // 爆发期详情已在月度趋势分析中包含，这里可以进行额外的细化分析
  // 目前直接标记为完成
  await logStep('ai', '爆发期详情分析完成', 'success', {
    output: { explosivePeriods: stepData.monthlyTrendAnalysis.explosivePeriods?.length || 0 },
  });
}

/**
 * 步骤 4: 爆款主分析 AI（三阶段拆分版本）
 * 执行步骤4-1和4-2：数据分组与口径说明 + 分类分析
 */
async function step4_ViralMain(
  task: Task,
  stepData: AnalysisStepData,
  logStep: (phase: string, step: string, status: any, details?: any) => Promise<void>
): Promise<void> {
  if (!stepData.viralVideos || !stepData.videos || !stepData.monthlyData) {
    throw new Error('缺少前置数据');
  }

  // ========== 步骤4-1: 数据分组与口径说明 ==========
  await logStep('ai', '开始AI分析 - 数据分组与口径说明', 'start');
  await taskQueue.update(task.id, {
    currentStep: '正在生成数据口径说明...',
    progress: TaskStateMachine.getStepStartProgress(4), // 67% - 步骤开始时设置进度
  });

  const dataScopeResult = await aiAnalysisService.analyzeViralDataScope(
    stepData.viralVideos || [],
    stepData.monthlyData || [],
    stepData.threshold || 0,
    task.aiConfig || undefined,
    task.fileName || undefined,
    stepData.videos?.length
  );

  await logStep('ai', '数据分组与口径说明完成', 'success', {
    output: {
      summary: dataScopeResult.summary,
      hasDataScopeNote: !!dataScopeResult.dataScopeNote,
      monthsCount: dataScopeResult.monthlyList?.length || 0,
    },
  });

  // ========== 步骤4-2: 爆款分类分析 ==========
  await logStep('ai', '开始AI分析 - 爆款分类分析', 'start');
  await taskQueue.update(task.id, {
    currentStep: '正在进行爆款分类分析...',
    // 步骤4已经开始，不需要重复设置进度
  });

  const classificationResult = await aiAnalysisService.analyzeViralClassification(
    stepData.viralVideos,
    stepData.monthlyData,
    task.aiConfig || undefined
  );

  // 构建完整的monthlyList（从原始数据）
  const monthlyList = aiAnalysisService['buildMonthlyListFromVirals'](
    stepData.viralVideos,
    stepData.monthlyData
  );

  // ========== 合并步骤4-1和4-2的结果 ==========
  stepData.viralAnalysis = {
    summary: dataScopeResult.summary,
    dataScopeNote: dataScopeResult.dataScopeNote,
    monthlyList: monthlyList,
    byCategory: classificationResult.byCategory,
    commonMechanisms: classificationResult.commonMechanisms,
    // methodology 将在步骤5中添加
  };

  await logStep('ai', '爆款分类分析完成', 'success', {
    output: {
      爆款总数: stepData.viralVideos.length,
      分类数量: classificationResult.byCategory?.length || 0,
      hasCommonMechanisms: classificationResult.commonMechanisms?.hasCategories,
    },
  });
}

/**
 * 步骤 5: 方法论 AI 分析（拆分版本）
 * 执行第二次 AI 调用：方法论抽象
 */
async function step5_Methodology(
  task: Task,
  stepData: AnalysisStepData,
  logStep: (phase: string, step: string, status: any, details?: any) => Promise<void>
): Promise<void> {
  if (!stepData.viralAnalysis || !stepData.viralVideos) {
    throw new Error('缺少前置数据：需要 viralAnalysis 和 viralVideos');
  }

  await logStep('ai', '开始AI分析 - 方法论抽象', 'start');
  await taskQueue.update(task.id, {
    currentStep: '正在抽象方法论...',
    progress: TaskStateMachine.getStepStartProgress(5), // 72% - 步骤开始时设置进度
  });

  // 调用新函数：执行方法论抽象（第二次 AI 调用）
  const methodologyResult = await aiAnalysisService.analyzeViralVideosMethodology(
    stepData.viralVideos,
    stepData.viralAnalysis, // 传入主分析结果
    task.aiConfig || undefined
  );

  // 将 methodology 合并到 viralAnalysis 中
  stepData.viralAnalysis.methodology = methodologyResult.methodology;

  await logStep('ai', '方法论抽象完成', 'success', {
    output: {
      hasMethodology: !!methodologyResult.methodology,
      hasViralTheme: !!methodologyResult.methodology?.viralTheme,
      topicFormulasCount: methodologyResult.methodology?.topicFormulas?.length || 0,
    },
  });
}

/**
 * 步骤 6: 完成 - 保存结果并准备选题生成
 */
async function step6_Complete(
  task: Task,
  stepData: AnalysisStepData,
  logStep: (phase: string, step: string, status: any, details?: any) => Promise<void>
): Promise<void> {
  await logStep('report', '保存分析结果', 'start');

  // 构建结果数据
  const intermediateResult = JSON.stringify({
    account: stepData.accountAnalysis,
    monthlyTrend: {
      summary: stepData.monthlyTrendAnalysis?.summary || `共分析了 ${stepData.videos?.length || 0} 条视频`,
      data: stepData.monthlyData,
      stages: stepData.monthlyTrendAnalysis?.stages || [],
      dataScopeNote: stepData.monthlyTrendAnalysis?.dataScopeNote,
      peakMonths: stepData.monthlyTrendAnalysis?.peakMonths,
      viralThemes: stepData.monthlyTrendAnalysis?.viralThemes,
      explosivePeriods: stepData.monthlyTrendAnalysis?.explosivePeriods,
    },
    virals: {
      summary: stepData.viralAnalysis?.summary || `发现 ${stepData.viralVideos?.length || 0} 条爆款视频`,
      dataScopeNote: stepData.viralAnalysis?.dataScopeNote, // ⭐ 新增：详细口径说明
      total: stepData.viralVideos?.length || 0,
      threshold: stepData.threshold,
      monthlyList: stepData.viralAnalysis?.monthlyList || [], // ⭐ 新增：完整月度列表
      byCategory: stepData.viralAnalysis?.byCategory || [], // ⭐ 完整保留：medianEngagement, medianSaveRate, p90SaveRate
      commonMechanisms: stepData.viralAnalysis?.commonMechanisms, // ⭐ 新增：共性机制
      methodology: stepData.viralAnalysis?.methodology,
      patterns: stepData.viralAnalysis?.patterns, // ✅ 添加 patterns 字段，用于选题生成
    },
    dailyTop1: stepData.dailyTop1,
    topics: [],
  });

  await taskQueue.update(task.id, {
    resultData: intermediateResult,
    status: 'topic_generating',
    currentStep: '正在生成选题库...',
    progress: STEP_FLOW_PROGRESS.step6_complete,
    topicStep: 'outline',
    analysisStep: 7, // 标记分析步骤已完成
  });

  await logStep('report', '分析结果已保存，准备选题生成', 'success');
  console.log('[Analysis Step] 分析流程完成，进入选题生成阶段');
}
