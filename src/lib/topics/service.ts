// src/lib/topics/service.ts
// 选题生成服务 - 可被内部直接调用
import { taskQueue } from '@/lib/queue/database';
import { aiAnalysisService } from '@/lib/ai-analysis/service';
import { analysisLogger } from '@/lib/logger';
import { FULL_FLOW_PROGRESS, calculateTopicDetailsProgress } from '@/lib/queue/progress-config';
import type { AnalysisLog } from '@/types';
import type { TopicOutline, FullTopic } from '@/lib/ai-analysis/service';

// 选题详情生成结果
type TopicDetailsResult =
  | { completed: true; totalTopics: number; message: string }
  | { completed: false; currentBatch: number; totalBatches: number; totalTopics: number; message: string };

/**
 * 生成选题大纲（带锁保护）
 */
export async function generateTopicOutline(taskId: string): Promise<void> {
  console.log('[Topics] 开始生成大纲, taskId:', taskId);

  const task = await taskQueue.get(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  // 获取锁
  const lockResult = await taskQueue.acquireLockWithTimeout(taskId);
  if (!lockResult.success) {
    if (lockResult.timeoutExpired) {
      throw new Error('任务锁超时,请稍后重试');
    } else if (lockResult.wasLocked) {
      throw new Error('任务正在处理中,请稍后再试');
    } else {
      throw new Error('获取任务锁失败');
    }
  }

  try {
    // 检查任务状态
    if (task.status !== 'analyzing' && task.status !== 'topic_generating') {
      throw new Error(`任务状态不正确: ${task.status}`);
    }

    // 解析结果数据获取账号和爆款分析
    let resultData: any;
    try {
      resultData = JSON.parse(task.resultData || '{}');
    } catch {
      throw new Error('没有找到分析结果数据');
    }

    const accountAnalysis = resultData.account;
    const viralAnalysis = resultData.virals;

    if (!accountAnalysis || !viralAnalysis) {
      throw new Error('分析数据不完整');
    }

    // 记录开始日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: '生成选题大纲',
      status: 'start',
    } as AnalysisLog);

    // 更新任务状态
    await taskQueue.update(taskId, {
      status: 'topic_generating',
      currentStep: '正在生成选题大纲...',
      progress: FULL_FLOW_PROGRESS.topic_outline_start, // 72
      topicStep: 'outline',
    });

    // 生成选题大纲
    const outlines = await aiAnalysisService.generateTopicOutline(
      accountAnalysis,
      viralAnalysis,
      task.aiConfig || undefined
    );

    if (outlines.length === 0) {
      throw new Error('选题大纲生成失败：没有返回任何数据');
    }

    // 保存大纲数据到数据库
    await taskQueue.update(taskId, {
      topicOutlineData: JSON.stringify(outlines),
      topicStep: 'details',
      topicDetailIndex: 0,
      currentStep: `选题大纲完成（${outlines.length}条），准备生成详情...`,
      progress: FULL_FLOW_PROGRESS.topic_outline_complete, // 75
    });

    // 记录完成日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: '生成选题大纲',
      status: 'success',
      output: {
        选题数量: outlines.length,
        选题列表: outlines.map(t => `${t.id}.${t.category}`).join('、'),
      },
    } as AnalysisLog);

    console.log('[Topics] 大纲生成完成, 数量:', outlines.length);

  } finally {
    const released = await taskQueue.releaseLock(taskId);
    if (!released) {
      console.error('[Topics] 释放锁失败, taskId:', taskId);
    }
  }
}

/**
 * 生成选题详情（单批次，带锁保护）
 */
export async function generateTopicDetails(taskId: string): Promise<TopicDetailsResult> {
  console.log('[Topics] 开始生成详情, taskId:', taskId);

  const task = await taskQueue.get(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  // 获取锁
  const lockResult = await taskQueue.acquireLockWithTimeout(taskId);
  if (!lockResult.success) {
    if (lockResult.timeoutExpired) {
      throw new Error('任务锁超时,请稍后重试');
    } else if (lockResult.wasLocked) {
      throw new Error('任务正在处理中,请稍后再试');
    } else {
      throw new Error('获取任务锁失败');
    }
  }

  try {
    // 检查是否处于选题生成状态
    if (task.status !== 'topic_generating') {
      throw new Error(`任务状态不正确: ${task.status}`);
    }

    // 检查是否已生成大纲
    if (task.topicStep !== 'details' || !task.topicOutlineData) {
      throw new Error('选题大纲不存在');
    }

    // 解析大纲数据
    let outlines: TopicOutline[];
    try {
      outlines = JSON.parse(task.topicOutlineData);
    } catch {
      throw new Error('大纲数据格式错误');
    }

    // 获取批次信息
    const batchSize = task.topicBatchSize || 10;
    const batchIndex = task.topicDetailIndex || 0;
    const totalBatches = Math.ceil(outlines.length / batchSize);

    if (batchIndex >= totalBatches) {
      // 所有批次已完成
      return {
        completed: true,
        totalTopics: outlines.length,
        message: '所有批次已完成',
      };
    }

    console.log(`[Topics] 处理批次 ${batchIndex + 1}/${totalBatches}`);

    // 解析结果数据获取账号和爆款分析
    let resultData: any;
    try {
      resultData = JSON.parse(task.resultData || '{}');
    } catch {
      throw new Error('没有找到分析结果数据');
    }

    const accountAnalysis = resultData.account;
    const viralPatterns = resultData.virals?.patterns;

    // 更新任务状态（使用统一函数）
    const progress = calculateTopicDetailsProgress(batchIndex, totalBatches);
    await taskQueue.update(taskId, {
      currentStep: `正在生成选题详情（第 ${batchIndex + 1}/${totalBatches} 批）...`,
      progress,
    });

    // 记录开始日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: `生成选题详情（批次 ${batchIndex + 1}/${totalBatches}）`,
      status: 'start',
    } as AnalysisLog);

    // 获取当前批次的大纲
    const startIdx = batchIndex * batchSize;
    const endIdx = Math.min(startIdx + batchSize, outlines.length);
    const batchOutlines = outlines.slice(startIdx, endIdx);

    // 生成这批选题的详情
    const batchTopics = await aiAnalysisService.generateTopicDetails(
      batchOutlines,
      accountAnalysis,
      viralPatterns,
      task.aiConfig || undefined,
      batchSize
    );

    // 合并到完整结果中
    let allTopics: FullTopic[] = [];
    if (batchIndex > 0 && task.resultData) {
      const parsed = JSON.parse(task.resultData);
      allTopics = parsed.topics || [];
    }

    allTopics = [...allTopics, ...batchTopics];

    // 更新结果数据
    await taskQueue.update(taskId, {
      resultData: JSON.stringify({
        ...resultData,
        topics: allTopics,
      }),
      topicDetailIndex: batchIndex + 1,
    });

    // 记录完成日志
    await analysisLogger.add(taskId, {
      timestamp: new Date().toISOString(),
      level: 'info',
      phase: 'ai' as any,
      step: `生成选题详情（批次 ${batchIndex + 1}/${totalBatches}）`,
      status: 'success',
      output: {
        本批数量: batchTopics.length,
        累计数量: allTopics.length,
      },
    } as AnalysisLog);

    console.log(`[Topics] 批次 ${batchIndex + 1}/${totalBatches} 完成, 累计: ${allTopics.length}`);

    // 检查是否完成所有批次
    if (batchIndex + 1 >= totalBatches) {
      // 标记选题生成完成
      await taskQueue.update(taskId, {
        topicStep: 'complete',
        currentStep: '选题详情生成完成',
        progress: FULL_FLOW_PROGRESS.topic_details_complete, // 90
      });

      return {
        completed: true,
        totalTopics: allTopics.length,
        message: '选题详情生成完成',
      };
    }

    return {
      completed: false,
      currentBatch: batchIndex + 1,
      totalBatches,
      totalTopics: allTopics.length,
      message: `批次 ${batchIndex + 1}/${totalBatches} 完成，累计 ${allTopics.length} 条`,
    };

  } finally {
    const released = await taskQueue.releaseLock(taskId);
    if (!released) {
      console.error('[Topics] 释放锁失败, taskId:', taskId);
    }
  }
}
