'use client';

// src/app/analyze/[taskId]/page.tsx
// 分析进度页面 - 极简 SaaS 风格 + Aceternity UI
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogViewer } from '@/components/analyze/LogViewer';
import { AnalysisLog } from '@/types';
import { GridPattern } from '@/components/ui/grid-pattern';
import { DotPattern } from '@/components/ui/dot-pattern';
import { Sparkles } from '@/components/ui/sparkles';
import { useTheme } from '@/contexts/ThemeContext';
import { BackButton } from '@/components/ui/BackButton';

/**
 * 分析进度页面
 * 极简 SaaS 风格 + Aceternity UI 增强
 * 深色主题 - 参考 Linear、Vercel、Stripe
 */
export default function AnalyzePage({ params }: { params: Promise<{ taskId: string }> }) {
  const router = useRouter();
  const { theme } = useTheme();
  const [taskId, setTaskId] = useState<string>('');
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  const [taskStatus, setTaskStatus] = useState<any>(null);

  /**
   * 获取 CTA 颜色
   */
  const getCtaColor = () => {
    switch (theme) {
      case 'yellow':
        return '#facc15';
      case 'green':
        return '#22c55e';
      default:
        return '#6366f1';
    }
  };

  const ctaColor = getCtaColor();

  // 防止重复触发处理
  const [isProcessing, setIsProcessing] = useState(false);
  const lastTriggerRef = useRef<number>(0);
  const TRIGGER_COOLDOWN = 10000; // 10秒冷却时间

  // 触发任务处理（用于选题生成等需要分步执行的任务）
  const triggerJobProcessing = async () => {
    const now = Date.now();
    if (now - lastTriggerRef.current < TRIGGER_COOLDOWN) {
      return; // 冷却中，跳过
    }
    if (isProcessing) {
      return; // 已有触发在处理中
    }

    lastTriggerRef.current = now;
    setIsProcessing(true);

    try {
      const response = await fetch('/api/jobs/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      // 不等待响应，让后台处理
    } catch (error) {
      // 静默失败，不影响用户体验
    } finally {
      setTimeout(() => setIsProcessing(false), 5000);
    }
  };

  // 加载日志和任务状态
  const loadData = async () => {
    if (!taskId) return;

    try {
      // 并行获取任务状态和日志
      const [taskRes, logsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`),
        fetch(`/api/logs/${taskId}`)
      ]);

      const taskResult = await taskRes.json();
      if (taskResult.success) {
        const newTaskStatus = taskResult.data;
        console.log('[Frontend] 任务状态更新:', {
          id: newTaskStatus?.id,
          status: newTaskStatus?.status,
          progress: newTaskStatus?.progress,
          currentStep: newTaskStatus?.currentStep,
        });
        setTaskStatus(newTaskStatus);

        // 检测到待处理或选题生成状态，自动触发处理
        if (newTaskStatus?.status === 'queued' || newTaskStatus?.status === 'topic_generating') {
          triggerJobProcessing();
        }
      }

      const logsResult = await logsRes.json();
      if (logsResult.success) {
        setLogs(logsResult.data.logs || []);
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  // 等待params解析
  useEffect(() => {
    params.then(p => setTaskId(p.taskId));
  }, [params]);

  // 初始加载
  useEffect(() => {
    if (taskId) {
      loadData();
    }
  }, [taskId]);

  // 计算状态（需要在useEffect之前定义）
  const isCompleted = taskStatus?.status === 'completed' ||
    logs.some((log) => log.phase === 'report' && log.status === 'success');

  const isFailed = taskStatus?.status === 'failed' ||
    logs.some((log) => log.status === 'error');

  // 定期轮询更新（2秒间隔）
  useEffect(() => {
    if (!taskId || isFailed) return; // 失败后停止轮询

    const interval = setInterval(() => {
      loadData();
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, isFailed]);

  // 完成后跳转（失败则不跳转）
  useEffect(() => {
    if (isCompleted && !isFailed && taskId) {
      const timer = setTimeout(() => {
        router.push(`/report/${taskId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, isFailed, taskId, router]);

  // 计算摘要
  const summary = logs.length > 0
    ? {
        totalSteps: logs.length,
        completedSteps: logs.filter((l) => l.status === 'success').length,
        failedSteps: logs.filter((l) => l.status === 'error').length,
        totalDuration: logs.reduce((sum, l) => sum + (l.duration || 0), 0),
        errors: logs
          .filter((l) => l.status === 'error')
          .map((l) => ({
            step: l.step,
            error: l.error || '未知错误',
            timestamp: l.timestamp,
          })),
      }
    : null;

  // 计算进度百分比
  const progress = taskStatus?.progress ??
    (summary ? Math.round((summary.completedSteps || 0) / Math.max(summary.totalSteps || 1, 1) * 100) : 0);

  // 调试：记录进度计算
  useEffect(() => {
    console.log('[Frontend] 进度计算:', {
      taskStatusProgress: taskStatus?.progress,
      summaryProgress: summary ? Math.round((summary.completedSteps || 0) / Math.max(summary.totalSteps || 1, 1) * 100) : '无summary',
      finalProgress: progress,
    });
  }, [taskStatus?.progress, summary, progress]);

  // 当前步骤状态
  const currentStep = taskStatus?.currentStep || logs[logs.length - 1]?.step || '准备中...';

  return (
    <main className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* 背景装饰 - 极简网格 */}
      <GridPattern className="absolute inset-0 opacity-20" />

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {/* 顶部导航 - 极简风格 */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-8">
            {/* 进度数字 */}
            <div className="hidden sm:block">
              <div className="text-white/5 text-7xl font-black leading-none">
                {String(progress).padStart(3, '0')}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-2">
                Analysis in Progress
              </p>
              <h1 className="text-white text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
                账号
                <span style={{ color: isFailed ? '#ef4444' : ctaColor }}>
                  {isFailed ? '分析失败' : '分析中'}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <BackButton />
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="px-4 py-2 bg-white/5 border border-white/10 text-sm text-white/60 hover:text-white hover:bg-white/[0.02] rounded-lg transition-colors flex items-center gap-2"
            >
              {showLogs ? '隐藏' : '显示'}日志
              <svg className={`w-4 h-4 transition-transform ${showLogs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </header>

        {/* 主要内容 */}
        <div className="space-y-8">
          {/* 进度展示区 - 极简风格 */}
          <div className="relative">
            <div className="relative bg-white/5 border border-white/10 overflow-hidden rounded-2xl">
              <div className="p-8 sm:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* 左侧：进度数字 */}
                  <div className="space-y-6">
                    <p className="text-xs uppercase tracking-wider text-white/40 font-medium">
                      Completion Rate
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-8xl sm:text-9xl font-bold leading-none tracking-tight">
                        {progress}
                      </span>
                      <span className="text-3xl sm:text-4xl font-bold text-white/30">%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          isFailed ? 'bg-red-500' : isCompleted ? 'bg-green-400' : 'animate-pulse'
                        }`}
                        style={{ backgroundColor: isFailed ? '#ef4444' : isCompleted ? '#22c55e' : ctaColor }}
                      />
                      <span className="text-sm text-white/60">
                        {isFailed
                          ? (taskStatus?.error || '分析失败')
                          : isCompleted
                          ? '分析完成'
                          : currentStep}
                      </span>
                    </div>
                  </div>

                  {/* 右侧：进度条和统计 */}
                  <div className="space-y-6">
                    {/* 进度条 */}
                    <div className="relative">
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out relative"
                          style={{
                            width: `${isFailed ? 100 : progress}%`,
                            backgroundColor: isFailed ? '#ef4444' : ctaColor
                          }}
                        >
                          {/* 闪光动画 */}
                          {!isCompleted && !isFailed && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 统计信息 */}
                    {summary && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-white/[0.02] rounded-lg border border-white/5">
                          <div className="text-2xl font-bold text-white mb-1">{summary.totalSteps}</div>
                          <div className="text-xs text-white/30 uppercase tracking-wider">总步骤</div>
                        </div>
                        <div className="text-center p-4 bg-white/[0.02] rounded-lg border border-white/5">
                          <div className="text-2xl font-bold text-green-400 mb-1">{summary.completedSteps}</div>
                          <div className="text-xs text-white/30 uppercase tracking-wider">已完成</div>
                        </div>
                        <div className="text-center p-4 bg-white/[0.02] rounded-lg border border-white/5">
                          <div className="text-2xl font-bold text-red-400 mb-1">{summary.failedSteps}</div>
                          <div className="text-xs text-white/30 uppercase tracking-wider">失败</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* 日志查看器 */}
          {showLogs && (
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs uppercase tracking-wider text-white/40 font-medium">
                  Execution Log
                </h3>
              </div>

              <div className="relative bg-white/5 border border-white/10 overflow-hidden rounded-xl">
                {/* 点阵背景 */}
                <DotPattern className="opacity-10" />

                <div className="relative p-6">
                  <LogViewer logs={logs} summary={summary} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部状态栏 */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#09090b]/90 backdrop-blur-xl border-t border-white/5">
          <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isFailed ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-red-400">分析失败</span>
                    {taskStatus?.error && (
                      <span className="text-xs text-white/30">{taskStatus.error}</span>
                    )}
                  </div>
                </div>
              ) : isCompleted ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-white/80">分析完成</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <svg className="w-4 h-4 animate-spin" style={{ color: ctaColor }} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <span className="text-sm text-white/80">正在处理中...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* 失败时显示重试按钮 */}
              {isFailed && (
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.02] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>返回首页</span>
                </button>
              )}

              {isCompleted && !isFailed && (
                <div className="flex items-center gap-2 text-xs text-white/30">
                  <span>2秒后自动跳转</span>
                  <svg className="w-4 h-4" style={{ color: ctaColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 微妙的闪烁效果 */}
      <Sparkles count={10} className="opacity-30" />
    </main>
  );
}
