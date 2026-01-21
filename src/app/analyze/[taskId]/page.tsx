'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePolling } from '@/hooks/usePolling';
import { ProgressBar } from '@/components/analyze/ProgressBar';

/**
 * 分析进度页面
 * 显示分析任务的实时进度
 */
export default function AnalyzePage({ params }: { params: { taskId: string } }) {
  const router = useRouter();
  const { task, error } = usePolling(params.taskId);

  // 任务完成后自动跳转到报告页面
  useEffect(() => {
    if (task?.status === 'completed') {
      router.push(`/report/${task.id}`);
    }
  }, [task, router]);

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // 加载状态
  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  // 正常状态
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">抖音账号分析</h1>
        <ProgressBar task={task} />
      </div>
    </main>
  );
}
