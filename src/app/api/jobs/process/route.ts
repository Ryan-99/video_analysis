import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/queue/database';
import { executeAnalysis, executeAnalysisStep, completeAnalysis } from '@/lib/analyzer/pipeline';
import { generateTopicOutline, generateTopicDetails } from '@/lib/topics/service';

// 配置为 Node.js 运行时，最大 300 秒（Hobby 计划限制）
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/jobs/process
 * 处理队列中的待处理任务
 * 可以被前端定时触发
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`[Jobs] ${timestamp} - 触发`);

  try {
    // 获取所有任务
    const allTasks = await taskQueue.getAll();
    console.log(`[Jobs] 数据库中共有 ${allTasks.length} 个任务`);

    // 统计各状态任务数量
    const statusCount = allTasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('[Jobs] 任务状态分布:', JSON.stringify(statusCount));

    // 优先处理正在生成选题的任务
    const topicTasks = allTasks.filter(t => t.status === 'topic_generating');
    const queuedTasks = allTasks.filter(t => t.status === 'queued');
    // 同时检查正在分析的任务（分步执行中）
    const analyzingTasks = allTasks.filter(t => t.status === 'parsing' || t.status === 'calculating' || t.status === 'analyzing');

    console.log(`[Jobs] 选题生成中: ${topicTasks.length}, 队列中: ${queuedTasks.length}, 分析中: ${analyzingTasks.length}`);

    let task: typeof allTasks[0] | null = null;

    if (topicTasks.length > 0) {
      // 优先选题生成任务
      task = topicTasks[0];
      console.log(`[Jobs] ========== 继续选题生成任务: ${task.id} ==========`);
      console.log(`[Jobs] topicStep: ${task.topicStep}, topicDetailIndex: ${task.topicDetailIndex}`);
    } else if (analyzingTasks.length > 0) {
      // 继续分步分析任务
      task = analyzingTasks[0];
      console.log(`[Jobs] ========== 继续分步分析任务: ${task.id} ==========`);
      console.log(`[Jobs] analysisStep: ${task.analysisStep}, status: ${task.status}`);
    } else if (queuedTasks.length > 0) {
      // 新任务 - 检查是否需要分步分析
      const queuedTask = queuedTasks[0];
      // 检查是否有 analysisStep 且小于 6（未完成分析）
      if (queuedTask.analysisStep !== null && queuedTask.analysisStep !== undefined && queuedTask.analysisStep < 6) {
        task = queuedTask;
        console.log(`[Jobs] ========== 继续分步分析任务（状态为queued）: ${task.id} ==========`);
        console.log(`[Jobs] analysisStep: ${task.analysisStep}`);
      } else if (queuedTask.analysisStep === undefined || queuedTask.analysisStep === null) {
        // 兼容旧任务 - 使用 executeAnalysis
        task = queuedTask;
        console.log(`[Jobs] ========== 开始新任务（旧模式）: ${task.id} ==========`);
        console.log(`[Jobs] 文件: ${task.fileName}`);
      } else {
        // analysisStep >= 6，应该进入选题生成，但状态仍为 queued
        task = queuedTask;
        console.log(`[Jobs] ========== 开始新任务: ${task.id} ==========`);
        console.log(`[Jobs] 文件: ${task.fileName}`);
      }
    } else {
      console.log('[Jobs] 没有待处理的任务');
      return NextResponse.json({
        success: true,
        message: '没有待处理的任务',
        processing: false,
      });
    }

    if (!task) {
      console.log('[Jobs] 没有有效任务');
      return NextResponse.json({
        success: true,
        message: '没有有效任务',
        processing: false,
      });
    }

    // 使用原子操作获取任务锁（防止竞态条件）
    console.log(`[Jobs] 尝试获取任务 ${task.id} 的原子锁`);
    const locked = await taskQueue.acquireLockWithTimeout(task.id);
    if (!locked) {
      console.log(`[Jobs] 任务 ${task.id} 已被其他进程锁定，跳过本次执行`);
      return NextResponse.json({
        success: true,
        message: '任务已被其他进程锁定',
        processing: true,
        taskId: task.id,
      });
    }
    console.log(`[Jobs] 成功获取任务 ${task.id} 的原子锁`);

    try {
      // 检查任务是否在进行分步分析
      if (task.analysisStep !== null && task.analysisStep !== undefined && task.analysisStep < 6) {
        // 分步分析模式
        console.log(`[Jobs] 执行分步分析，步骤: ${task.analysisStep}`);
        await executeAnalysisStep(task.id, task.analysisStep);
        console.log(`[Jobs] ========== 分步分析步骤完成: ${task.id}, 步骤: ${task.analysisStep} ==========`);
      } else if (task.status === 'queued') {
        // 新任务：执行完整分析流程（到选题生成阶段）
        console.log('[Jobs] 执行完整分析流程（旧模式兼容）');
        await executeAnalysis(task.id);
        console.log(`[Jobs] ========== 任务步骤完成: ${task.id} ==========`);
      } else if (task.status === 'topic_generating') {
        // 选题生成任务：继续处理
        console.log('[Jobs] 继续选题生成流程');
        await handleTopicGeneration(task.id);
        console.log(`[Jobs] ========== 选题生成步骤完成: ${task.id} ==========`);
      } else {
        console.log(`[Jobs] ========== 任务步骤完成: ${task.id} ==========`);
      }
    } catch (error) {
      console.error(`[Jobs] ========== 任务失败: ${task.id} ==========`);
      console.error('[Jobs] 错误类型:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[Jobs] 错误信息:', error instanceof Error ? error.message : String(error));
      console.error('[Jobs] 错误堆栈:', error instanceof Error ? error.stack : '无堆栈');

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      await taskQueue.update(task.id, {
        status: 'failed',
        error: errorMessage,
      });
    } finally {
      // 使用原子操作释放锁
      console.log(`[Jobs] 释放任务 ${task.id} 的原子锁`);
      await taskQueue.releaseLock(task.id);
    }

    return NextResponse.json({
      success: true,
      message: '任务处理完成',
      taskId: task.id,
      processing: false,
    });
  } catch (error) {
    console.error('[Jobs] ========== 未捕获的错误 ==========');
    console.error('[Jobs] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROCESS_JOB_FAILED',
          message: '处理任务失败',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 处理选题生成的分步执行
 */
async function handleTopicGeneration(taskId: string): Promise<void> {
  const task = await taskQueue.get(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }

  console.log(`[Jobs] 选题生成状态: topicStep=${task.topicStep}, topicDetailIndex=${task.topicDetailIndex}`);

  // 根据当前步骤决定下一步操作
  if (task.topicStep === 'outline' || task.topicStep === null) {
    // 生成选题大纲 - 直接调用内部函数
    console.log('[Jobs] --- 阶段: 生成选题大纲 ---');
    await generateTopicOutline(taskId);
    console.log('[Jobs] 大纲生成完成');
  } else if (task.topicStep === 'details') {
    // 生成选题详情（可能需要多次调用）
    const batchSize = task.topicBatchSize || 10;
    const topicOutlineData = task.topicOutlineData || '[]';
    const outlines = JSON.parse(topicOutlineData);
    const totalBatches = Math.ceil(outlines.length / batchSize);
    const currentIndex = task.topicDetailIndex || 0;

    console.log(`[Jobs] --- 阶段: 生成选题详情 ---`);
    console.log(`[Jobs] 批次 ${currentIndex + 1}/${totalBatches}, 每批 ${batchSize} 条, 共 ${outlines.length} 条`);

    const result = await generateTopicDetails(taskId);
    console.log('[Jobs] 详情批次完成:', JSON.stringify(result));

    // 如果所有批次完成，执行完成流程
    if (result.completed) {
      console.log('[Jobs] 所有选题详情生成完成，执行完成流程');
      await completeAnalysis(taskId);
    } else {
      // 还有更多批次，保持 topic_generating 状态以便下次继续
      console.log('[Jobs] 等待下一批次处理');
    }
  } else if (task.topicStep === 'complete') {
    // 选题已完成，执行完成流程
    console.log('[Jobs] 选题已完成，执行完成流程');
    await completeAnalysis(taskId);
  } else {
    console.warn('[Jobs] 未知的 topicStep:', task.topicStep);
  }
}

/**
 * GET /api/jobs/process
 * 查询处理状态
 */
export async function GET() {
  const allTasks = await taskQueue.getAll();
  const processingTask = allTasks.find(t => t.processing === true);
  return NextResponse.json({
    success: true,
    processing: !!processingTask,
    taskId: processingTask?.id || null,
  });
}
