'use client';
import { ReportViewer } from '@/components/report/ReportViewer';

export default function ReportPage({ params }: { params: { reportId: string } }) {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">分析报告</h1>
        <ReportViewer reportId={params.reportId} />
      </div>
    </main>
  );
}
