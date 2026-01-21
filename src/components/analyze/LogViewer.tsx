'use client';

// src/components/analyze/LogViewer.tsx
// 日志查看器组件
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
 * 阶段图标映射
 */
const PHASE_ICONS: Record<string, string> = {
  parse: '📄',
  calculate: '🔢',
  ai: '🤖',
  chart: '📊',
  report: '📝',
};

/**
 * 状态颜色映射
 */
const STATUS_COLORS: Record<string, string> = {
  start: 'text-gray-600',
  progress: 'text-blue-600',
  success: 'text-green-600',
  error: 'text-red-600',
};

/**
 * 状态图标映射
 */
const STATUS_ICONS: Record<string, string> = {
  start: '○',
  progress: '◐',
  success: '✓',
  error: '✗',
};

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

export function LogViewer({ logs, summary }: LogViewerProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暂无日志记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 摘要卡片 */}
      {summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">执行摘要</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">
                {summary.totalSteps}
              </div>
              <div className="text-xs text-gray-500">总步骤</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-green-600">
                {summary.completedSteps}
              </div>
              <div className="text-xs text-gray-500">已完成</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-red-600">
                {summary.failedSteps}
              </div>
              <div className="text-xs text-gray-500">失败</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">
                {formatDuration(summary.totalDuration)}
              </div>
              <div className="text-xs text-gray-500">总耗时</div>
            </div>
          </div>

          {/* 错误列表 */}
          {summary.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-medium text-red-600 mb-2">错误列表</h4>
              <div className="space-y-1">
                {summary.errors.map((error, index) => (
                  <div
                    key={index}
                    className="text-xs text-red-600 flex items-start gap-2"
                  >
                    <span>•</span>
                    <span>
                      {error.step}: {error.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 日志列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">执行日志</h3>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                {/* 阶段图标 */}
                <div className="text-lg" title={log.phase}>
                  {PHASE_ICONS[log.phase] || '•'}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 步骤标题 */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {log.step}
                    </span>
                    <span
                      className={`${STATUS_COLORS[log.status]} text-base`}
                      title={log.status}
                    >
                      {STATUS_ICONS[log.status]}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>

                  {/* 持续时间 */}
                  {log.duration && (
                    <div className="text-xs text-gray-500 mb-1">
                      耗时: {formatDuration(log.duration)}
                    </div>
                  )}

                  {/* 输入 */}
                  {log.input && (
                    <details className="mb-2">
                      <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-700">
                        输入数据
                      </summary>
                      <pre className="mt-1 text-xs bg-gray-50 rounded p-2 overflow-x-auto">
                        {typeof log.input === 'string'
                          ? log.input
                          : JSON.stringify(log.input, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* 输出 */}
                  {log.output && (
                    <details className="mb-2">
                      <summary className="text-xs text-green-600 cursor-pointer hover:text-green-700">
                        输出数据
                      </summary>
                      <pre className="mt-1 text-xs bg-gray-50 rounded p-2 overflow-x-auto">
                        {typeof log.output === 'string'
                          ? log.output
                          : JSON.stringify(log.output, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* 错误 */}
                  {log.error && (
                    <div className="text-xs text-red-600 bg-red-50 rounded p-2">
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
