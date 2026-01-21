import { Task } from '@/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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

  return (
    <Card className="p-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">分析进度</h3>
          <span className="text-sm text-gray-500">{task.progress}%</span>
        </div>

        <Progress value={task.progress} className="h-2" />

        <p className="text-sm text-gray-600">
          {task.currentStep || getStatusText(task.status)}
        </p>

        {/* 错误提示 */}
        {task.error && (
          <p className="text-sm text-red-500">错误: {task.error}</p>
        )}

        {/* 完成提示 */}
        {task.status === 'completed' && (
          <p className="text-sm text-green-600">
            分析完成！共处理 {task.recordCount} 条视频，发现 {task.viralCount} 条爆款
          </p>
        )}
      </div>
    </Card>
  );
}
