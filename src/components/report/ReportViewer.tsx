'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Report } from '@/types';
import { InteractiveChart } from '@/components/charts/InteractiveChart';
import { formatListText } from '@/lib/report/formatter';

/**
 * 渲染格式化文本的组件，自动处理编号列表换行
 */
function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  const lines = formatListText(text);

  if (lines.length === 1) {
    return <p className={className}>{text}</p>;
  }

  return (
    <div className={className}>
      {lines.map((line, index) => (
        <p key={index} className="mb-1 last:mb-0">
          {line}
        </p>
      ))}
    </div>
  );
}

interface ReportViewerProps { reportId: string; }

export function ReportViewer({ reportId }: ReportViewerProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const response = await fetch(`/api/report/${reportId}`);
        const result = await response.json();
        if (result.success) {
          setReport(result.data);
        }
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

  // 生成月度趋势图表数据
  const monthlyChartData = useMemo(() => {
    if (!report?.monthlyTrend?.data) return null;
    return {
      labels: report.monthlyTrend.data.map(m => m.month),
      datasets: [{
        label: '平均互动量',
        data: report.monthlyTrend.data.map(m => Math.round(m.avgEngagement)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
      }],
    };
  }, [report]);

  // 生成每日Top1图表数据
  const dailyTop1ChartData = useMemo(() => {
    if (!report?.dailyTop1 || report.dailyTop1.length === 0) return null;

    const sortedData = [...report.dailyTop1].sort((a, b) => a.date.localeCompare(b.date));

    // 找出每个月的Top1爆点（用于标注）
    const monthlyTop1 = new Map<string, { index: number; label: string }>();
    sortedData.forEach((item, idx) => {
      const month = item.date.substring(0, 7); // YYYY-MM
      if (!monthlyTop1.has(month)) {
        monthlyTop1.set(month, {
          index: idx,
          label: `${month} ${item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title}`,
        });
      }
    });

    return {
      labels: sortedData.map(d => d.date),
      datasets: [{
        label: '每日Top1互动量',
        data: sortedData.map(d => Math.round(d.engagement)),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 6,
      }],
      annotations: Array.from(monthlyTop1.values()),
      pointTitles: sortedData.map(d => d.title), // 传递每个点的完整标题
    };
  }, [report]);

  if (loading) return <Card className="p-8">加载中...</Card>;
  if (!report) return <Card className="p-8">报告不存在</Card>;

  // 优先使用真实账号名称（从文件名提取），否则使用 AI 生成的名称
  const displayName = report.realAccountName || report.account.name;

  return (
    <div className="space-y-6">
      {/* 下载按钮区域 */}
      <div className="flex gap-3 justify-end flex-wrap">
        <Button onClick={() => handleDownload('word')} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />下载Word
        </Button>
        <Button onClick={() => handleDownload('excel')} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />下载Excel
        </Button>
      </div>

      {/* 一、账号概况 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">一、账号概况</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-400">账号名称</span>
            <p className="font-medium text-white">{displayName}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">账号类型</span>
            <p className="font-medium text-white">{report.account.type}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">核心主题</span>
            <p className="font-medium text-white">{report.account.coreTopic}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">目标受众</span>
            <p className="font-medium text-white">{report.account.audience}</p>
          </div>
          <div className="col-span-2">
            <span className="text-sm text-gray-400">变现方式</span>
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-200">初级：{report.account.monetization.level1}</p>
              <p className="text-sm text-gray-200">中级：{report.account.monetization.level2}</p>
              <p className="text-sm text-gray-200">高级：{report.account.monetization.level3}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 二、月度趋势分析 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">二、月度趋势分析</h3>
        <FormattedText text={report.monthlyTrend.summary} className="text-sm text-gray-300 mb-6" />

        {/* 月度趋势图表（可交互） */}
        {monthlyChartData && (
          <div className="mb-6">
            <InteractiveChart
              title="月度平均互动趋势"
              data={monthlyChartData}
              yLabel="互动量"
              xLabel="月份"
              height={350}
            />
          </div>
        )}

        {/* 月度数据表格 */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-200">月度数据详情</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-gray-400">月份</th>
                  <th className="text-right py-2 px-3 text-gray-400">视频数</th>
                  <th className="text-right py-2 px-3 text-gray-400">平均互动</th>
                  <th className="text-right py-2 px-3 text-gray-400">P90</th>
                  <th className="text-right py-2 px-3 text-gray-400">中位数</th>
                  <th className="text-right py-2 px-3 text-gray-400">阈值</th>
                </tr>
              </thead>
              <tbody>
                {report.monthlyTrend.data.map((item, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-2 px-3 text-gray-200">{item.month}</td>
                    <td className="text-right py-2 px-3 text-gray-200">{item.videoCount}</td>
                    <td className="text-right py-2 px-3 text-gray-200">{Math.round(item.avgEngagement).toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-gray-200">{Math.round(item.p90).toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-gray-200">{Math.round(item.median).toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-green-400">{Math.round(item.threshold).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* 三、爆款视频分析 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">三、爆款视频分析</h3>
        <FormattedText text={report.virals.summary} className="text-sm text-gray-300 mb-4" />
        <div className="flex gap-6 text-sm mb-6">
          <div>
            <span className="text-gray-400">爆款总数：</span>
            <span className="font-medium text-white">{report.virals.total}</span>
          </div>
          <div>
            <span className="text-gray-400">判定阈值：</span>
            <span className="font-medium text-white">{Math.round(report.virals.threshold).toLocaleString()}</span>
          </div>
        </div>

        {/* 每日Top1爆点图表（可交互） */}
        {dailyTop1ChartData && (
          <div className="mb-6">
            <InteractiveChart
              title="全周期每日Top1爆点趋势（标注版）"
              data={{
                labels: dailyTop1ChartData.labels,
                datasets: dailyTop1ChartData.datasets,
              }}
              yLabel="互动量"
              xLabel="日期"
              annotations={dailyTop1ChartData.annotations}
              pointTitles={dailyTop1ChartData.pointTitles}
              height={400}
            />
          </div>
        )}

        {/* 爆款规律 */}
        {report.virals.patterns && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">爆款规律</h4>
            <div className="space-y-3 text-sm text-gray-200">
              {report.virals.patterns.commonElements && (
                <div>
                  <span className="text-gray-400">共同元素：</span>
                  <FormattedText text={report.virals.patterns.commonElements} className="inline-block ml-1" />
                </div>
              )}
              {report.virals.patterns.timingPattern && (
                <div>
                  <span className="text-gray-400">发布时间：</span>
                  <FormattedText text={report.virals.patterns.timingPattern} className="inline-block ml-1" />
                </div>
              )}
              {report.virals.patterns.titlePattern && (
                <div>
                  <span className="text-gray-400">标题规律：</span>
                  <FormattedText text={report.virals.patterns.titlePattern} className="inline-block ml-1" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 爆款分类数据表格 */}
        {report.virals.byCategory && report.virals.byCategory.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">爆款分类详情</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-gray-400">分类</th>
                    <th className="text-right py-2 px-3 text-gray-400">数量</th>
                    <th className="text-right py-2 px-3 text-gray-400">平均互动</th>
                  </tr>
                </thead>
                <tbody>
                  {report.virals.byCategory.map((item, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-2 px-3 text-gray-200">{item.category}</td>
                      <td className="text-right py-2 px-3 text-gray-200">{item.count}</td>
                      <td className="text-right py-2 px-3 text-gray-200">{Math.round(item.avgEngagement).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(!report.virals.byCategory || report.virals.byCategory.length === 0) && (
          <p className="text-sm text-gray-500 italic">暂无分类数据</p>
        )}
      </Card>

      {/* 四、选题库（如果有数据） */}
      {report.topics && report.topics.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">四、爆款选题库</h3>
          <div className="space-y-4">
            {report.topics.map((topic) => (
              <div key={topic.id} className="border-b border-white/10 pb-4">
                <h4 className="font-medium mb-2 text-white">
                  {topic.id}. {topic.category}
                </h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p className="text-gray-400">标题备选：</p>
                  <ul className="list-disc list-inside pl-2 text-gray-200">
                    {topic.titles.map((title, i) => (
                      <li key={i}>{title}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
