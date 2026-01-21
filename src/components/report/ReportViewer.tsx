'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Report } from '@/types';

interface ReportViewerProps { reportId: string; }

export function ReportViewer({ reportId }: ReportViewerProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const response = await fetch(`/api/report/${reportId}`);
        const result = await response.json();
        if (result.success) setReport(result.data);
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [reportId]);

  const handleDownload = async (format: 'word' | 'excel') => {
    const response = await fetch(`/api/report/${reportId}/download?format=${format}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `分析报告-${reportId}.${format === 'word' ? 'docx' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) return <Card className="p-8">加载中...</Card>;
  if (!report) return <Card className="p-8">报告不存在</Card>;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 justify-end">
        <Button onClick={() => handleDownload('word')} variant="outline"><Download className="w-4 h-4 mr-2" />下载Word</Button>
        <Button onClick={() => handleDownload('excel')} variant="outline"><Download className="w-4 h-4 mr-2" />下载Excel</Button>
      </div>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">账号概况</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><span className="text-sm text-gray-500">账号类型</span><p className="font-medium">{report.account.type}</p></div>
          <div><span className="text-sm text-gray-500">核心主题</span><p className="font-medium">{report.account.coreTopic}</p></div>
          <div className="col-span-2"><span className="text-sm text-gray-500">目标受众</span><p className="font-medium">{report.account.audience}</p></div>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">月度趋势</h3>
        <p className="text-sm text-gray-600 mb-4">{report.monthlyTrend.summary}</p>
      </Card>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">爆款分析</h3>
        <p className="text-sm text-gray-600 mb-4">{report.virals.summary}</p>
      </Card>
    </div>
  );
}
