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
  const displayName = report.realAccountName || report.account.nickname;

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
                {report.account.publishFrequency.gapPeriodsList.slice(0, 3).map((gap, idx) => (
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
                      {report.account.publishFrequency.gapPeriodsList.slice(3).map((gap, idx) => (
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
              {report.account.bestPublishTime.windows.map((window, idx) => (
                <p key={idx} className="text-sm text-gray-200">
                  {window.timeRange}（{window.percentage.toFixed(1)}%）
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
              {report.account.monetization.methods.map((method, idx) => (
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
            {report.monthlyTrend.peakMonths.map((peak, idx) => (
              <div key={idx} className="mb-4 p-4 bg-gray-800/30 rounded-lg">
                <p className="text-sm font-medium text-white mb-2">{peak.month}: {peak.description}</p>
                <div className="space-y-2">
                  {peak.topVideos.map((video, vIdx) => (
                    <div key={vIdx} className="text-xs p-2 bg-gray-900/50 rounded">
                      <p className="text-gray-300">{video.title}</p>
                      <div className="flex gap-3 mt-1 text-gray-400">
                        <span>👍 {video.likes.toLocaleString()}</span>
                        <span>💬 {video.comments.toLocaleString()}</span>
                        <span>⭐ {video.saves.toLocaleString()}</span>
                        <span>🔁 {video.shares.toLocaleString()}</span>
                        <span>收藏率 {video.saveRate.toFixed(2)}%</span>
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
                {report.monthlyTrend.viralThemes.themes?.map((theme, idx) => (
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
            {report.monthlyTrend.explosivePeriods.map((period, idx) => (
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
                      {period.topVideos.map((video, vIdx) => (
                        <tr key={vIdx} className="border-b border-white/5">
                          <td className="py-1 px-2 text-gray-300">{video.publishTime}</td>
                          <td className="py-1 px-2 text-gray-300 max-w-md truncate">{video.title}</td>
                          <td className="text-right py-1 px-2 text-gray-300">{video.totalEngagement.toLocaleString()}</td>
                          <td className="text-right py-1 px-2 text-green-400">{video.saveRate.toFixed(2)}%</td>
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
