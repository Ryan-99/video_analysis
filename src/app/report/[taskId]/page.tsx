'use client';

/**
 * 报告页面占位符
 * TODO: 在后续任务中实现完整报告页面
 */
export default function ReportPage({ params }: { params: { taskId: string } }) {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">分析报告</h1>
        <div className="bg-white rounded-lg shadow p-8">
          <p className="text-gray-600">报告页面正在开发中...</p>
          <p className="text-sm text-gray-400 mt-2">任务ID: {params.taskId}</p>
        </div>
      </div>
    </main>
  );
}
