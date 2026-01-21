'use client';

// src/app/analyze/[taskId]/page.tsx
// 分析进度页面 - 显示实时进度和日志
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@/components/analyze/ProgressBar';
import { LogViewer } from '@/components/analyze/LogViewer';
import { AnalysisLog } from '@/types';

/**
 * 分析进度页面
 */
export default function AnalyzePage({ params }: { params: { taskId: string } }) {
  const router = useRouter();
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(true);

  // 加载日志
  const loadLogs = async () => {
    try {
      const response = await fetch(`/api/logs/${params.taskId}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
      }
    } catch (error) {
      console.error('加载日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadLogs();
  }, [params.taskId]);

  // 定期轮询日志更新（2秒间隔）
  useEffect(() => {
    const interval = setInterval(() => {
      loadLogs();
    }, 2000);

    return () => clearInterval(interval);
  }, [params.taskId]);

  // 检查是否完成（从日志判断）
  const isCompleted = logs.some(
    (log) => log.phase === 'report' && log.status === 'success'
  );

  // 完成后跳转
  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        router.push(`/report/${params.taskId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted, params.taskId, router]);

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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">账号分析中</h1>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {showLogs ? '隐藏日志' : '显示日志'}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* 进度条 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">分析进度</h2>
            {isCompleted && (
              <span className="text-sm text-green-600 font-medium">
                分析完成，即将跳转...
              </span>
            )}
          </div>
          {/* 模拟任务对象用于进度条 */}
          <ProgressBar
            task={{
              id: params.taskId,
              status: isCompleted ? ('completed' as const) : ('analyzing' as const),
              progress: Math.round(
                (summary?.completedSteps || 0) / Math.max((summary?.totalSteps || 1), 1) * 100
              ),
              currentStep: logs[logs.length - 1]?.step || '初始化中',
              error: null,
              fileId: '',
              fileName: '',
              fileSize: 0,
              columnMapping: '{}',
              aiProvider: 'claude',
              generateTopics: true,
              resultData: null,
              reportPath: null,
              excelPath: null,
              chartPaths: null,
              recordCount: null,
              viralCount: null,
              completedAt: isCompleted ? new Date() : null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
          />
        </div>

        {/* 日志查看器 */}
        {showLogs && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">执行日志</h2>
              {loading && (
                <span className="text-xs text-gray-500">加载中...</span>
              )}
            </div>
            <LogViewer logs={logs} summary={summary} />
          </div>
        )}

        {/* 说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            分析过程中
          </h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• 数据解析：提取视频数据和关键指标</li>
            <li>• 数据计算：统计月度趋势和识别爆款视频</li>
            <li>• AI分析：调用AI服务生成分析内容</li>
            <li>• 图表生成：生成可视化图表</li>
            <li>• 报告生成：整合所有内容生成最终报告</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
