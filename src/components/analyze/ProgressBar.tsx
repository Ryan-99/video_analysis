// src/components/analyze/ProgressBar.tsx
// 分析进度条组件 - 极简 SaaS 风格
import { Task } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * 分析进度条组件
 * 极简 SaaS 风格 - 深色主题
 */
export function ProgressBar({ task }: { task: Task }) {
  const { theme } = useTheme();

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

  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';

  // 阶段数据
  const stages = [
    { key: 'parse', label: '解析', threshold: 0 },
    { key: 'calculate', label: '计算', threshold: 25 },
    { key: 'analyze', label: '分析', threshold: 50 },
    { key: 'chart', label: '图表', threshold: 75 },
    { key: 'report', label: '报告', threshold: 90 },
  ];

  return (
    <div className="space-y-6">
      {/* 当前进度标签 */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/40 font-medium">
          当前进度
        </span>
        <span className="text-3xl font-semibold text-white">
          {task.progress}
          <span className="text-lg text-white/30">%</span>
        </span>
      </div>

      {/* 主进度条 - 极简风格 */}
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${task.progress}%`,
            backgroundColor: ctaColor
          }}
        >
          {/* 闪光动画 */}
          {!isCompleted && !isFailed && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>
      </div>

      {/* 当前步骤 - 极简排版 */}
      <div className="flex items-start gap-4">
        <div
          className="mt-1 w-2.5 h-2.5 rounded-full transition-all duration-300"
          style={{
            backgroundColor: isFailed ? '#ef4444' : ctaColor,
            ...(isCompleted || isFailed ? {} : { animation: 'pulse 2s ease-in-out infinite' })
          }}
        />
        <div className="flex-1">
          <p className="text-base font-medium text-white leading-tight">
            {task.currentStep || getStatusText(task.status)}
          </p>
          {!isCompleted && !isFailed && (
            <p className="text-xs text-white/30 mt-2">
              正在处理您的数据...
            </p>
          )}
        </div>
      </div>

      {/* 错误提示 - 极简风格 */}
      {isFailed && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-white/70">{task.error || '分析失败，请重试'}</p>
          </div>
        </div>
      )}

      {/* 完成提示 - 极简风格 */}
      {isCompleted && (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-white/70">
              分析完成！共处理 <span className="font-medium text-white">{task.recordCount || 0}</span> 条视频，
              发现 <span className="font-medium text-white">{task.viralCount || 0}</span> 条爆款内容
            </p>
          </div>
        </div>
      )}

      {/* 阶段指示器 - 极简风格 */}
      {!isCompleted && !isFailed && (
        <div className="flex items-center justify-between">
          {stages.map((stage, index) => {
            const isActive = task.progress >= stage.threshold;
            const isCurrent = task.progress >= stage.threshold && (
              index === stages.length - 1 || task.progress < stages[index + 1].threshold
            );

            return (
              <div
                key={stage.key}
                className="relative flex-1 text-center"
              >
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-500 ${
                    isCurrent
                      ? 'scale-110'
                      : ''
                  }`}
                  style={{
                    backgroundColor: isCurrent
                      ? ctaColor
                      : isActive
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.02)',
                    border: isActive && !isCurrent ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                  }}
                >
                  <span className={`text-xs font-medium ${
                    isCurrent ? 'text-white' : isActive ? 'text-white/60' : 'text-white/30'
                  }`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className={`mt-2 text-[10px] uppercase tracking-wider ${
                  isCurrent ? 'text-white/60' : isActive ? 'text-white/40' : 'text-white/20'
                }`}>
                  {stage.label}
                </div>

                {/* 连接线 */}
                {index < stages.length - 1 && (
                  <div
                    className={`absolute top-5 left-1/2 h-px transition-all duration-500`}
                    style={{
                      width: 'calc(100% + 1rem)',
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
