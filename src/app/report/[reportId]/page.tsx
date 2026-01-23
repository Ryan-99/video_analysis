'use client';

// src/app/report/[reportId]/page.tsx
// 报告页面 - 极简 SaaS 风格 + Aceternity UI
import { ReportViewer } from '@/components/report/ReportViewer';
import { GridPattern } from '@/components/ui/grid-pattern';
import { DotPattern } from '@/components/ui/dot-pattern';
import { BackButton } from '@/components/ui/BackButton';
import { use } from 'react';

/**
 * 报告页面
 * 极简 SaaS 风格 - 深色主题
 */
export default function ReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params);

  return (
    <main className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* 背景装饰 - 极简网格 */}
      <GridPattern className="absolute inset-0 opacity-20" />

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-12">
        {/* 页面标题 - 极简风格 */}
        <header className="flex items-center justify-between mb-12">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/40 font-medium mb-3">
              Analysis Report
            </p>
            <h1 className="text-white text-4xl font-bold tracking-tight">
              分析报告
            </h1>
          </div>
          <BackButton />
        </header>

        {/* 报告查看器 */}
        <div className="relative bg-white/5 border border-white/10 overflow-hidden rounded-2xl">
          {/* 点阵背景 */}
          <DotPattern className="opacity-10" />

          <div className="relative p-8">
            <ReportViewer reportId={reportId} />
          </div>
        </div>
      </div>
    </main>
  );
}
