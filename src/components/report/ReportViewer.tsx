'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Report } from '@/types';
import { InteractiveChart, InteractiveChartRef } from '@/components/charts/InteractiveChart';
import { formatListText } from '@/lib/report/formatter';
import { Clock } from 'lucide-react';

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

/**
 * 格式化耗时显示
 */
function formatElapsedTime(startTime: Date | string, endTime: Date | string): string {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  const diffMs = end.getTime() - start.getTime();

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours}小时${remainingMinutes > 0 ? remainingMinutes + '分' : ''}`;
  } else if (diffMinutes > 0) {
    const remainingSeconds = diffSeconds % 60;
    return `${diffMinutes}分${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}`;
  } else {
    return `${diffSeconds}秒`;
  }
}

interface ReportViewerProps { reportId: string; }

export function ReportViewer({ reportId }: ReportViewerProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const response = await fetch(`/api/report/${reportId}`);
        const result = await response.json();
        if (result.success) {
          setReport(result.data);
          // 计算耗时
          const startTime = result.data.createdAt || result.data.completedAt;
          const endTime = result.data.completedAt || result.data.updatedAt;
          if (startTime && endTime) {
            setElapsedTime(formatElapsedTime(startTime, endTime));
          }
        }
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [reportId]);

  // 每日Top1图表的 ref（用于捕获图片）
  const dailyTop1ChartRef = useRef<InteractiveChartRef>(null);

  const handleDownload = async (format: 'word' | 'excel') => {
    // 如果是 Word 下载，先从前端捕获图表图片
    if (format === 'word' && dailyTop1ChartRef.current) {
      const chartImage = dailyTop1ChartRef.current.exportImage();

      if (chartImage) {
        console.log('[ReportViewer] 使用前端捕获的图表图片');
        // 使用 POST 方式下载，携带图表数据
        const response = await fetch(`/api/report/${reportId}/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format: 'word',
            chartImage: chartImage, // base64 图片数据
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || '下载失败');
        }

        const blob = await response.blob();
        triggerDownload(blob, `分析报告-${reportId}.docx`);
        return;
      } else {
        console.warn('[ReportViewer] 无法捕获图表图片，使用默认方式下载');
      }
    }

    // Excel 下载或 Word 下载但无法捕获图片时，使用原有 GET 方式
    const response = await fetch(`/api/report/${reportId}/download?format=${format}`);
    const blob = await response.blob();
    triggerDownload(blob, `分析报告-${reportId}.${format === 'word' ? 'docx' : 'xlsx'}`);
  };

  // 触发浏览器下载的辅助函数
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // 生成月度趋势图表数据
  const monthlyChartData = useMemo(() => {
    if (!report?.monthlyTrend?.data) return null;
    return {
      labels: report.monthlyTrend.data.map((m: any) => m.month),
      datasets: [{
        label: '平均互动量',
        data: report.monthlyTrend.data.map((m: any) => Math.round(m.avgEngagement)),
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
      labels: sortedData.map((d: any) => d.date),
      datasets: [{
        label: '每日Top1互动量',
        data: sortedData.map((d: any) => Math.round(d.engagement)),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 6,
      }],
      annotations: Array.from(monthlyTop1.values()),
      pointTitles: sortedData.map((d: any) => d.title), // 传递每个点的完整标题
    };
  }, [report]);

  if (loading) return <Card className="p-8">加载中...</Card>;
  if (!report) return <Card className="p-8">报告不存在</Card>;

  // 优先使用真实账号名称（从文件名提取），否则使用 AI 生成的名称
  const displayName = report.realAccountName || report.account.nickname;

  return (
    <div className="space-y-6">
      {/* 下载按钮区域 */}
      <div className="flex gap-3 justify-between items-center flex-wrap">
        {/* 总耗时显示 */}
        {elapsedTime && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>耗时：{elapsedTime}</span>
          </div>
        )}
        <div className="flex gap-3">
          <Button onClick={() => handleDownload('word')} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />下载Word
          </Button>
          <Button onClick={() => handleDownload('excel')} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />下载Excel
          </Button>
        </div>
      </div>

      {/* 一、账号概况 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">一、账号概况</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* 基本信息 */}
          <div>
            <span className="text-sm text-gray-400">账号昵称</span>
            <p className="font-medium text-white">{report.account.nickname}</p>
          </div>
          {report.account.followerCount && (
            <div>
              <span className="text-sm text-gray-400">粉丝数</span>
              <p className="font-medium text-white">
                {report.account.followerCount.value}
                <span className="text-xs text-gray-500 ml-1">
                  ({report.account.followerCount.source === 'verified' ? '可验证' :
                    report.account.followerCount.source === 'inferred' ? '推断' : '待补充'})
                </span>
              </p>
              {report.account.followerCount.basis && (
                <p className="text-xs text-gray-500 mt-1">{report.account.followerCount.basis}</p>
              )}
            </div>
          )}
          <div>
            <span className="text-sm text-gray-400">账号类型</span>
            <p className="font-medium text-white">{report.account.accountType}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">内容形态</span>
            <p className="font-medium text-white">{report.account.contentFormat}</p>
          </div>

          {/* 数据概览 */}
          <div>
            <span className="text-sm text-gray-400">数据时间范围</span>
            <p className="font-medium text-white">
              {report.account.dateRange.start} – {report.account.dateRange.end}
              {report.account.dateRange.stages && (
                <span className="text-xs text-gray-400 ml-1">（{report.account.dateRange.stages}）</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-400">总视频数量</span>
            <p className="font-medium text-white">
              ≈ {report.account.totalVideos.count} 条
              {report.account.totalVideos.note && (
                <span className="text-xs text-gray-400 ml-1">（{report.account.totalVideos.note}）</span>
              )}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-400">发布频率</span>
            <p className="font-medium text-white">
              ≈ {report.account.publishFrequency.perWeek} 条/周
              {!report.account.publishFrequency.hasGap && (
                <span className="text-xs text-green-400 ml-1">（不存在明显断更期）</span>
              )}
            </p>
            {report.account.publishFrequency.hasGap && report.account.publishFrequency.gapPeriodsList && (
              <div className="mt-1">
                {report.account.publishFrequency.gapPeriodsList.slice(0, 3).map((gap: any, idx: number) => (
                  <p key={idx} className="text-xs text-orange-400">
                    {gap.start} 至 {gap.end}（{gap.days}天）
                  </p>
                ))}
                {report.account.publishFrequency.gapPeriodsList.length > 3 && (
                  <div className="group relative inline-block">
                    <p className="text-xs text-gray-400 cursor-help">
                      还有 {report.account.publishFrequency.gapPeriodsList.length - 3} 条断更期...
                    </p>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-10 w-64">
                      {report.account.publishFrequency.gapPeriodsList.slice(3).map((gap: any, idx: number) => (
                        <p key={idx} className="text-orange-400">
                          {gap.start} 至 {gap.end}（{gap.days}天）
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {report.account.publishFrequency.hasGap && !report.account.publishFrequency.gapPeriodsList && report.account.publishFrequency.gapPeriods && (
              <p className="text-xs text-orange-400 mt-1">断更期：{report.account.publishFrequency.gapPeriods}</p>
            )}
          </div>
          <div>
            <span className="text-sm text-gray-400">最佳发布时间</span>
            <div className="mt-1">
              {report.account.bestPublishTime.windows.map((window: any, idx: number) => (
                <p key={idx} className="text-sm text-gray-200">
                  {window.timeRange}（{(window.percentage ?? 0).toFixed(1)}%）
                </p>
              ))}
            </div>
            {report.account.bestPublishTime.analysis && (
              <p className="text-xs text-gray-500 mt-1">{report.account.bestPublishTime.analysis}</p>
            )}
          </div>

          {/* 受众与内容 */}
          <div className="col-span-2">
            <span className="text-sm text-gray-400">核心受众人群</span>
            <p className="font-medium text-white mt-1">{report.account.audience.description}</p>
            <p className="text-xs text-gray-500 mt-1">依据：{report.account.audience.basis}</p>
          </div>
          <div className="col-span-2">
            <span className="text-sm text-gray-400">核心母题</span>
            <p className="font-medium text-white mt-1">
              {report.account.coreTopics.length > 0
                ? report.account.coreTopics.join('、')
                : '未形成稳定母题'}
            </p>
            {report.account.unstableReason && (
              <p className="text-xs text-gray-500 mt-1">{report.account.unstableReason}</p>
            )}
          </div>

          {/* 变现方式 */}
          <div className="col-span-2">
            <span className="text-sm text-gray-400">变现方式</span>
            <div className="mt-1 space-y-1">
              {report.account.monetization.methods.map((method: any, idx: number) => (
                <p key={idx} className="text-sm text-gray-200">• {method}</p>
              ))}
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-400">成交链路：{report.account.monetization.salesFunnel}</p>
                <p className="text-xs text-gray-400 mt-1">主产品价格带：{report.account.monetization.priceRange}</p>
                <p className="text-xs text-gray-400 mt-1">
                  内容与变现一致性：{report.account.monetization.consistency}
                </p>
              </div>
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
                {report.monthlyTrend.data.map((item: any, index: number) => (
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

        {/* 数据分析口径说明 */}
        {report.monthlyTrend.dataScopeNote && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2 text-gray-200">数据分析口径说明</h4>
            <p className="text-xs text-gray-400 whitespace-pre-line">{report.monthlyTrend.dataScopeNote}</p>
          </div>
        )}

        {/* 关键波峰月份 */}
        {report.monthlyTrend.peakMonths && report.monthlyTrend.peakMonths.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">关键波峰月份</h4>
            {report.monthlyTrend.peakMonths.map((peak: any, idx: number) => (
              <div key={idx} className="mb-4 p-4 bg-gray-800/30 rounded-lg">
                <p className="text-sm font-medium text-white mb-2">{peak.month}: {peak.description}</p>
                <div className="space-y-2">
                  {peak.topVideos.map((video: any, vIdx: number) => (
                    <div key={vIdx} className="text-xs p-2 bg-gray-900/50 rounded">
                      <p className="text-gray-300">{video.title}</p>
                      <div className="flex gap-3 mt-1 text-gray-400">
                        <span>👍 {(video.likes ?? 0).toLocaleString()}</span>
                        <span>💬 {(video.comments ?? 0).toLocaleString()}</span>
                        <span>⭐ {(video.saves ?? 0).toLocaleString()}</span>
                        <span>🔁 {(video.shares ?? 0).toLocaleString()}</span>
                        <span>收藏率 {(video.saveRate ?? 0).toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 长期爆款母体 */}
        {report.monthlyTrend.viralThemes && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">长期爆款母体</h4>
            {report.monthlyTrend.viralThemes.hasThemes ? (
              <div className="space-y-2">
                {report.monthlyTrend.viralThemes.themes?.map((theme: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-800/30 rounded">
                    <p className="text-sm font-medium text-white">{theme.themeType}</p>
                    <p className="text-xs text-gray-400 mt-1">{theme.representativeTitle}</p>
                    <p className="text-xs text-gray-500 mt-1">{theme.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">{report.monthlyTrend.viralThemes.reason}</p>
            )}
          </div>
        )}

        {/* 爆发期细化 */}
        {report.monthlyTrend.explosivePeriods && report.monthlyTrend.explosivePeriods.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">爆发期细化</h4>
            {report.monthlyTrend.explosivePeriods.map((period: any, idx: number) => (
              <div key={idx} className="mb-4">
                <div className="flex gap-4 text-sm mb-2 text-gray-300">
                  <span className="font-medium text-white">{period.periodName}</span>
                  <span>{period.period}</span>
                  <span className="text-gray-400">{period.explanation}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-1 px-2 text-gray-400">发布时间</th>
                        <th className="text-left py-1 px-2 text-gray-400">标题</th>
                        <th className="text-right py-1 px-2 text-gray-400">互动</th>
                        <th className="text-right py-1 px-2 text-gray-400">收藏率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {period.topVideos.map((video: any, vIdx: number) => (
                        <tr key={vIdx} className="border-b border-white/5">
                          <td className="py-1 px-2 text-gray-300">{video.publishTime}</td>
                          <td className="py-1 px-2 text-gray-300 max-w-md truncate">{video.title}</td>
                          <td className="text-right py-1 px-2 text-gray-300">{(video.totalEngagement ?? 0).toLocaleString()}</td>
                          <td className="text-right py-1 px-2 text-green-400">{(video.saveRate ?? 0).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 三、爆款视频分析 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">三、爆款视频分析</h3>

        {/* 每日Top1爆点图表（可交互）- 移到章节开头 */}
        {dailyTop1ChartData && (
          <div className="mb-6">
            <InteractiveChart
              ref={dailyTop1ChartRef}
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

        {/* 数据分析口径说明 */}
        {report.virals.dataScopeNote && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2 text-gray-200">数据分析口径说明</h4>
            <p className="text-xs text-gray-400 whitespace-pre-line">{report.virals.dataScopeNote}</p>
          </div>
        )}

        {/* 逐月爆款清单 */}
        {report.virals.monthlyList && report.virals.monthlyList.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">逐月爆款清单</h4>
            <div className="space-y-4">
              {report.virals.monthlyList.map((monthData: any, idx: number) => (
                <details key={idx} className="group">
                  <summary className="cursor-pointer text-sm text-white font-medium p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors">
                    {monthData.month} - {monthData.videos.length}条爆款（阈值={Math.round(monthData.threshold).toLocaleString()}）
                  </summary>
                  <div className="mt-3 p-3 bg-gray-900/30 rounded-lg">
                    {/* 爆款表格 */}
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-1 px-2 text-gray-400">发布时间</th>
                            <th className="text-left py-1 px-2 text-gray-400">标题</th>
                            <th className="text-right py-1 px-2 text-gray-400">互动</th>
                            <th className="text-right py-1 px-2 text-gray-400">收藏率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthData.videos.map((video: any, vIdx: number) => (
                            <tr key={vIdx} className="border-b border-white/5">
                              <td className="py-1 px-2 text-gray-300">{video.publishTime}</td>
                              <td className="py-1 px-2 text-gray-300 max-w-md truncate">{video.title}</td>
                              <td className="text-right py-1 px-2 text-gray-300">{(video.totalEngagement ?? 0).toLocaleString()}</td>
                              <td className="text-right py-1 px-2 text-green-400">{(video.saveRate ?? 0).toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Top10标题汇总 */}
                    {monthData.top10Titles && monthData.top10Titles.length > 0 && (
                      <div className="p-2 bg-gray-800/30 rounded">
                        <p className="text-xs text-gray-400 mb-1">当月Top10标题汇总：</p>
                        <ol className="text-xs text-gray-300 space-y-0.5">
                          {monthData.top10Titles.map((title: any, tIdx: number) => (
                            <li key={tIdx}>{tIdx + 1}. {title}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* 爆款分析总览（扩展版） */}
        {report.virals.byCategory && report.virals.byCategory.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">爆款分析总览</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-gray-400">分类</th>
                    <th className="text-right py-2 px-3 text-gray-400">数量</th>
                    <th className="text-right py-2 px-3 text-gray-400">互动中位数</th>
                    <th className="text-right py-2 px-3 text-gray-400">收藏率中位数</th>
                    <th className="text-right py-2 px-3 text-gray-400">收藏率P90</th>
                  </tr>
                </thead>
                <tbody>
                  {report.virals.byCategory.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-2 px-3 text-gray-200">{item.category}</td>
                      <td className="text-right py-2 px-3 text-gray-200">{item.count}</td>
                      <td className="text-right py-2 px-3 text-gray-200">
                        {'medianEngagement' in item ? Math.round((item as any).medianEngagement).toLocaleString() : Math.round((item as any).avgEngagement).toLocaleString()}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-200">
                        {'medianSaveRate' in item ? ((item as any).medianSaveRate ?? 0).toFixed(2) + '%' : '-'}
                      </td>
                      <td className="text-right py-2 px-3 text-green-400">
                        {'p90SaveRate' in item ? ((item as any).p90SaveRate ?? 0).toFixed(2) + '%' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 特征描述 */}
            {report.virals.byCategory.some((c: any) => c.description) && (
              <div className="mt-3 space-y-2 text-xs text-gray-400">
                {report.virals.byCategory.map((item: any, index: number) => (
                  item.description ? (
                    <p key={index}><strong className="text-gray-300">{item.category}：</strong>{item.description}</p>
                  ) : null
                ))}
              </div>
            )}
          </div>
        )}

        {/* 共性机制（当不可分类时） */}
        {report.virals.commonMechanisms && !report.virals.commonMechanisms.hasCategories && report.virals.commonMechanisms.mechanisms && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">共性机制</h4>
            {report.virals.commonMechanisms.reason && (
              <p className="text-xs text-gray-500 mb-2">{report.virals.commonMechanisms.reason}</p>
            )}
            <div className="space-y-3">
              {report.virals.commonMechanisms.mechanisms.map((mechanism: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-800/30 rounded-lg">
                  <p className="text-sm font-medium text-white mb-2">{mechanism.pattern}</p>
                  {mechanism.evidence && mechanism.evidence.length > 0 && (
                    <div className="text-xs text-gray-400">
                      <p className="mb-1">举证：</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {mechanism.evidence.map((ev: any, eIdx: number) => (
                          <li key={eIdx}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 方法论抽象模块 */}
        {report.virals.methodology && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">方法论抽象</h4>

            {/* 爆款母题 */}
            {report.virals.methodology.viralTheme && (
              <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
                <h5 className="text-xs font-medium text-gray-300 mb-2">爆款母题公式</h5>
                <p className="text-xs text-gray-400 mb-2">{report.virals.methodology.viralTheme.formula}</p>
                <p className="text-sm text-white mb-2">{report.virals.methodology.viralTheme.conclusion}</p>
                {report.virals.methodology.viralTheme.evidence && (
                  <div className="text-xs text-gray-400">
                    <p className="mb-1">数值证据：</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {report.virals.methodology.viralTheme.evidence.map((ev: any, idx: number) => (
                        <li key={idx}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 爆款发布时间分布 */}
            {report.virals.methodology.timeDistribution && report.virals.methodology.timeDistribution.length > 0 && (
              <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
                <h5 className="text-xs font-medium text-gray-300 mb-2">爆款发布时间分布</h5>
                <div className="flex flex-wrap gap-2">
                  {report.virals.methodology.timeDistribution.map((dist: any, idx: number) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded">
                      {dist.timeWindow}（{dist.percentage}%）
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 选题公式 */}
            {report.virals.methodology.topicFormulas && report.virals.methodology.topicFormulas.length > 0 && (
              <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
                <h5 className="text-xs font-medium text-gray-300 mb-2">选题公式</h5>
                <div className="space-y-3">
                  {report.virals.methodology.topicFormulas.map((formula: any, idx: number) => (
                    <details key={idx} className="group">
                      <summary className="cursor-pointer text-xs text-white font-medium hover:text-gray-300">
                        {formula.theme}
                      </summary>
                      <div className="mt-2 pl-3 text-xs text-gray-400 space-y-1">
                        <p><strong className="text-gray-300">高频场景：</strong>{formula.scenarios}</p>
                        <p><strong className="text-gray-300">隐藏规则：</strong>{formula.hiddenRules}</p>
                        <p><strong className="text-gray-300">反常识结论：</strong>{formula.counterIntuitive}</p>
                        <p><strong className="text-gray-300">动作：</strong>{formula.actions?.join('、')}</p>
                        <p className="mt-2"><strong className="text-gray-300">模板：</strong></p>
                        <ul className="list-disc list-inside pl-2">
                          {formula.templates?.map((tpl: any, tIdx: number) => (
                            <li key={tIdx} className="text-gray-300">{tpl}</li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* 标题公式 */}
            {report.virals.methodology.titleFormulas && report.virals.methodology.titleFormulas.length > 0 && (
              <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
                <h5 className="text-xs font-medium text-gray-300 mb-2">标题公式</h5>
                <div className="grid grid-cols-2 gap-2">
                  {report.virals.methodology.titleFormulas.map((formula: any, idx: number) => (
                    <div key={idx} className="p-2 bg-gray-900/50 rounded">
                      <p className="text-xs font-medium text-white mb-1">{formula.type}</p>
                      <p className="text-xs text-gray-400">{formula.template}</p>
                      {formula.example && (
                        <p className="text-xs text-gray-500 mt-1">例：{formula.example}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 脚本公式 */}
            {report.virals.methodology.scriptFormula && (
              <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
                <h5 className="text-xs font-medium text-gray-300 mb-2">脚本公式</h5>
                <p className="text-sm text-white mb-2">{report.virals.methodology.scriptFormula.mainFramework}</p>
                <p className="text-xs text-gray-400 mb-2">{report.virals.methodology.scriptFormula.explanation}</p>
                {report.virals.methodology.scriptFormula.alternativeFramework && (
                  <p className="text-xs text-gray-500">备选：{report.virals.methodology.scriptFormula.alternativeFramework}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 爆款选题库（聚合表） */}
        {report.virals.topicLibrary && report.virals.topicLibrary.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3 text-gray-200">爆款选题库（聚合表）</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-gray-400">ID</th>
                    <th className="text-left py-2 px-3 text-gray-400">发布时间</th>
                    <th className="text-left py-2 px-3 text-gray-400">标题</th>
                    <th className="text-left py-2 px-3 text-gray-400">分类</th>
                    <th className="text-right py-2 px-3 text-gray-400">互动</th>
                    <th className="text-right py-2 px-3 text-gray-400">收藏率</th>
                    <th className="text-left py-2 px-3 text-gray-400">核心观点</th>
                  </tr>
                </thead>
                <tbody>
                  {report.virals.topicLibrary.map((item: any) => (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="py-2 px-3 text-gray-400">{item.id}</td>
                      <td className="py-2 px-3 text-gray-300">{item.publishTime}</td>
                      <td className="py-2 px-3 text-gray-300 max-w-md truncate">{item.title}</td>
                      <td className="py-2 px-3 text-gray-300">{item.category || '-'}</td>
                      <td className="text-right py-2 px-3 text-gray-300">{(item.totalEngagement ?? 0).toLocaleString()}</td>
                      <td className="text-right py-2 px-3 text-green-400">{(item.saveRate ?? 0).toFixed(2)}%</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{item.keyTakeaway || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 旧版爆款规律（兼容旧数据） */}
        {report.virals.patterns && (!report.virals.byCategory || report.virals.byCategory.length === 0) && (
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

        {/* 旧版提示（如果没有新数据） */}
        {(!report.virals.byCategory || report.virals.byCategory.length === 0) &&
         !report.virals.methodology &&
         !report.virals.topicLibrary && (
          <p className="text-sm text-gray-500 italic mt-4">暂无分类数据</p>
        )}
      </Card>

      {/* 四、选题库（如果有数据） */}
      {report.topics && report.topics.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">四、爆款选题库</h3>
          <div className="space-y-4">
            {report.topics.map((topic: any) => (
              <div key={topic.id} className="border-b border-white/10 pb-4">
                <h4 className="font-medium mb-2 text-white">
                  {topic.id}. {topic.category}
                </h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <p className="text-gray-400">标题备选：</p>
                  <ul className="list-disc list-inside pl-2 text-gray-200">
                    {topic.titles.map((title: any, i: number) => (
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
