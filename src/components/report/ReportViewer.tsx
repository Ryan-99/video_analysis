'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Image as ImageIcon } from 'lucide-react';
import { Report } from '@/types';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { ViralCategoriesChart } from './ViralCategoriesChart';
import html2canvas from 'html2canvas';

interface ReportViewerProps { reportId: string; }

export function ReportViewer({ reportId }: ReportViewerProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingChart, setDownloadingChart] = useState<string | null>(null);
  const monthlyChartRef = useRef<HTMLDivElement | null>(null);
  const viralChartRef = useRef<HTMLDivElement | null>(null);

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

  const downloadChartAsPNG = async (ref: React.RefObject<HTMLDivElement | null>, name: string) => {
    if (!ref.current) return;
    setDownloadingChart(name);

    // 保存原始样式
    const originalStyle = ref.current.getAttribute('style');
    const originalChildrenStyles: Array<{ element: HTMLElement; style: string | null }> = [];

    try {
      // 应用兼容 html2canvas 的内联样式（覆盖 CSS 变量）
      ref.current.style.setProperty('background-color', '#1a1a1a', 'important');
      ref.current.style.setProperty('color', '#ffffff', 'important');

      // 遍历所有子元素，将 CSS 变量颜色转换为固定颜色
      const allElements = ref.current.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        originalChildrenStyles.push({ element: htmlEl, style: htmlEl.getAttribute('style') });

        // 设置计算后的颜色值
        const computed = window.getComputedStyle(htmlEl);
        const color = computed.color;
        const bgColor = computed.backgroundColor;

        if (color && color !== 'rgba(0, 0, 0, 0)') {
          htmlEl.style.color = color;
        }
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          htmlEl.style.backgroundColor = bgColor;
        }
      });

      // 使用 html2canvas 生成图片
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          // 忽略某些可能有问题的元素
          return element.tagName === 'BUTTON';
        },
      });

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}-${reportId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download chart:', error);
      alert('图表下载失败，请重试');
    } finally {
      // 恢复原始样式
      if (originalStyle) {
        ref.current.setAttribute('style', originalStyle);
      } else {
        ref.current.removeAttribute('style');
      }

      // 恢复子元素的原始样式
      originalChildrenStyles.forEach(({ element, style }) => {
        if (style) {
          element.setAttribute('style', style);
        } else {
          element.removeAttribute('style');
        }
      });

      setDownloadingChart(null);
    }
  };

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
        <h3 className="text-lg font-semibold mb-4">一、账号概况</h3>
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">二、月度趋势分析</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => downloadChartAsPNG(monthlyChartRef, '月度趋势图')}
            disabled={downloadingChart !== null}
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            {downloadingChart === 'monthly' ? '导出中...' : '下载图表'}
          </Button>
        </div>
        <p className="text-sm text-gray-300 mb-6">{report.monthlyTrend.summary}</p>

        {/* 月度趋势图表 */}
        <div ref={monthlyChartRef} className="bg-black/20 p-4 rounded-lg">
          <MonthlyTrendChart data={report.monthlyTrend.data} />
        </div>

        {/* 月度数据表格 */}
        <div className="mt-6">
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">三、爆款视频分析</h3>
          {report.virals.byCategory && report.virals.byCategory.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadChartAsPNG(viralChartRef, '爆款分类统计图')}
              disabled={downloadingChart !== null}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              {downloadingChart === 'viral' ? '导出中...' : '下载图表'}
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-300 mb-4">{report.virals.summary}</p>
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

        {/* 爆款分类图表 */}
        {report.virals.byCategory && report.virals.byCategory.length > 0 && (
          <>
            <div ref={viralChartRef} className="bg-black/20 p-4 rounded-lg">
              <ViralCategoriesChart data={report.virals.byCategory} />
            </div>

            {/* 爆款分类数据表格 */}
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
          </>
        )}

        {(!report.virals.byCategory || report.virals.byCategory.length === 0) && (
          <p className="text-sm text-gray-500 italic">暂无分类数据</p>
        )}
      </Card>

      {/* 四、选题库（如果有数据） */}
      {report.topics && report.topics.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">四、爆款选题库</h3>
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
