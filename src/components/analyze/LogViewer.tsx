'use client';

// src/components/analyze/LogViewer.tsx
// 日志查看器组件 - 极简 SaaS 风格
import { AnalysisLog } from '@/types';

interface LogViewerProps {
  logs: AnalysisLog[];
  summary?: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalDuration: number;
    errors: Array<{ step: string; error: string; timestamp: string }>;
  } | null;
}

/**
 * 格式化持续时间
 */
function formatDuration(ms?: number): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 状态颜色映射 - 极简风格
 */
const STATUS_COLORS: Record<string, string> = {
  start: 'text-white/40',
  progress: 'text-white/60',
  success: 'text-green-400',
  error: 'text-red-400',
};

export function LogViewer({ logs, summary }: LogViewerProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-16">
        {/* 空状态图标 */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-xl mb-6">
          <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        {/* 空状态文本 */}
        <h3 className="text-xl font-semibold text-white mb-2">
          等待日志数据
        </h3>
        <p className="text-sm text-white/30 max-w-xs mx-auto mb-6">
          分析开始后，这里将显示详细的执行日志，包括每个步骤的输入输出和耗时信息。
        </p>

        {/* 加载动画 */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" />
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 摘要卡片 - 极简风格 */}
      {summary && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6">
            <h3 className="text-xs uppercase tracking-wider text-white/40 font-medium mb-6">
              执行摘要
            </h3>

            {/* 统计网格 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-white/[0.02] rounded-lg">
                <div className="text-3xl font-semibold text-white mb-1">
                  {summary.totalSteps}
                </div>
                <div className="text-xs text-white/30 uppercase tracking-wider">总步骤</div>
              </div>
              <div className="text-center p-4 bg-white/[0.02] rounded-lg">
                <div className="text-3xl font-semibold text-green-400 mb-1">
                  {summary.completedSteps}
                </div>
                <div className="text-xs text-white/30 uppercase tracking-wider">已完成</div>
              </div>
              <div className="text-center p-4 bg-white/[0.02] rounded-lg">
                <div className="text-3xl font-semibold text-red-400 mb-1">
                  {summary.failedSteps}
                </div>
                <div className="text-xs text-white/30 uppercase tracking-wider">失败</div>
              </div>
              <div className="text-center p-4 bg-white/[0.02] rounded-lg">
                <div className="text-3xl font-semibold text-white mb-1">
                  {formatDuration(summary.totalDuration)}
                </div>
                <div className="text-xs text-white/30 uppercase tracking-wider">总耗时</div>
              </div>
            </div>

            {/* 错误列表 */}
            {summary.errors.length > 0 && (
              <div className="pt-6 border-t border-white/5">
                <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium mb-4">
                  错误列表
                </h4>
                <div className="space-y-3">
                  {summary.errors.map((error, index) => (
                    <div
                      key={index}
                      className="text-sm text-white/60 bg-white/[0.02] rounded-lg px-4 py-3 border border-white/5"
                    >
                      <span className="font-medium text-white/80">{error.step}:</span> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 日志列表 - 极简风格 */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {/* 标题 */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-xs uppercase tracking-wider text-white/40 font-medium">
            执行日志
          </h3>
        </div>

        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="px-6 py-5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-4">
                {/* 阶段指示器 */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-white/5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'success'
                        ? 'bg-green-400'
                        : log.status === 'error'
                          ? 'bg-red-400'
                          : 'bg-white/40'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  {/* 步骤标题 */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-medium text-white">
                      {log.step}
                    </span>
                    <span className={`text-xs ml-auto ${STATUS_COLORS[log.status]}`}>
                      {log.status === 'start' && '• 开始'}
                      {log.status === 'progress' && '• 进行中'}
                      {log.status === 'success' && '✓ 完成'}
                      {log.status === 'error' && '✕ 失败'}
                    </span>
                    <span className="text-xs text-white/20 font-mono">{formatTimestamp(log.timestamp)}</span>
                  </div>

                  {/* 消息内容 - 优先显示 message */}
                  {(log as any).message && (
                    <div className="text-sm text-white/80 mb-3">
                      {(log as any).message}
                    </div>
                  )}

                  {/* 持续时间 */}
                  {log.duration && (
                    <div className="text-xs text-white/30 mb-3">
                      耗时: {formatDuration(log.duration)}
                    </div>
                  )}

                  {/* 详细信息 - 优先显示 details 而不是 output */}
                  {(log as any).details && (
                    <details className="group mb-3" open={log.status === 'error'}>
                      <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 font-medium flex items-center gap-2 w-fit uppercase tracking-wider">
                        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        详细信息
                      </summary>
                      <div className="mt-3 text-xs bg-white/[0.02] rounded-lg px-4 py-3 border border-white/5">
                        {Object.entries((log as any).details).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                            <span className="text-white/40">{key}:</span>
                            <span className="text-white/70 ml-4 text-right">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* 输入数据 - 仅在需要时显示 */}
                  {log.input && !(log as any).details && (
                    <details className="group mb-3">
                      <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 font-medium flex items-center gap-2 w-fit uppercase tracking-wider">
                        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        输入数据
                      </summary>
                      <pre className="mt-3 text-xs bg-white/[0.02] rounded-lg px-4 py-3 border border-white/5 overflow-x-auto text-white/50">
                        {typeof log.input === 'string'
                          ? log.input
                          : JSON.stringify(log.input, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* 错误 */}
                  {log.error && (
                    <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-4 py-3 border border-red-400/20">
                      {log.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
