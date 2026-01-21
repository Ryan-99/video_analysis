// src/components/analyze/ProgressBar.tsx
// 分析进度条组件
import { Task } from '@/types';

/**
 * 分析进度条组件
 * @param task 任务对象
 */
export function ProgressBar({ task }: { task: Task }) {
  /**
   * 获取状态对应的描述文本
   */
  const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
      queued: '排队中...',
      parsing: '正在解析数据...',
      calculating: '正在计算指标...',
      analyzing: '正在进行AI分析...',
      generating_charts: '正在生成图表...',
      completed: '分析完成！',
      failed: '分析失败',
    };
    return statusMap[status] || status;
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      queued: 'bg-gray-400',
      parsing: 'bg-blue-500',
      calculating: 'bg-indigo-500',
      analyzing: 'bg-purple-500',
      generating_charts: 'bg-pink-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
    };
    return colorMap[status] || 'bg-indigo-500';
  };

  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  return (
    <div className="space-y-6">
      {/* 进度百分比 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">当前进度</span>
        <span className="text-2xl font-bold text-gray-900">{task.progress}%</span>
      </div>

      {/* 进度条 */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${getStatusColor(
            task.status
          )}`}
          style={{ width: `${task.progress}%` }}
        >
          {/* 动画效果 - 处理中显示闪光 */}
          {!isCompleted && !isFailed && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          )}
        </div>
      </div>

      {/* 当前步骤 */}
      <div className="flex items-start gap-3">
        <div className={`mt-1 w-2 h-2 rounded-full ${getStatusColor(task.status)}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {task.currentStep || getStatusText(task.status)}
          </p>
          {!isCompleted && !isFailed && (
            <p className="text-xs text-gray-500 mt-1">
              请稍候，正在处理您的数据...
            </p>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {isFailed && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{task.error || '分析失败，请重试'}</p>
        </div>
      )}

      {/* 完成提示 */}
      {isCompleted && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">
            ✓ 分析完成！共处理 {task.recordCount || 0} 条视频，发现{' '}
            {task.viralCount || 0} 条爆款内容
          </p>
        </div>
      )}

      {/* 阶段指示器 */}
      {!isCompleted && !isFailed && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span
            className={
              task.progress >= 0
                ? 'text-indigo-600 font-medium'
                : 'text-gray-400'
            }
          >
            解析
          </span>
          <span
            className={
              task.progress >= 25
                ? 'text-indigo-600 font-medium'
                : 'text-gray-400'
            }
          >
            计算
          </span>
          <span
            className={
              task.progress >= 50
                ? 'text-indigo-600 font-medium'
                : 'text-gray-400'
            }
          >
            分析
          </span>
          <span
            className={
              task.progress >= 75
                ? 'text-indigo-600 font-medium'
                : 'text-gray-400'
            }
          >
            图表
          </span>
          <span
            className={
              task.progress >= 90
                ? 'text-indigo-600 font-medium'
                : 'text-gray-400'
            }
          >
            报告
          </span>
        </div>
      )}
    </div>
  );
}
