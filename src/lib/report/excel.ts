import ExcelJS from 'exceljs';
import { Report } from '@/types';

export async function generateExcelReport(report: Report): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const overviewSheet = workbook.addWorksheet('账号概览');
  overviewSheet.addRow(['项目', '内容']);
  overviewSheet.addRow(['账号昵称', report.account.nickname]);
  overviewSheet.addRow(['账号类型', report.account.accountType]);
  overviewSheet.addRow(['内容形态', report.account.contentFormat]);
  overviewSheet.addRow(['目标受众', report.account.audience.description]);
  overviewSheet.addRow(['核心主题', report.account.coreTopics.length > 0 ? report.account.coreTopics.join('、') : '未形成稳定母题']);
  if (report.account.followerCount) {
    const sourceText = report.account.followerCount.source === 'verified' ? '可验证' :
                       report.account.followerCount.source === 'inferred' ? '推断' : '待补充';
    overviewSheet.addRow(['粉丝数', `${report.account.followerCount.value} (${sourceText})`]);
  }
  overviewSheet.addRow(['数据时间范围', `${report.account.dateRange.start} 至 ${report.account.dateRange.end}`]);
  overviewSheet.addRow(['总视频数量', `${report.account.totalVideos.count} 条`]);
  overviewSheet.addRow(['发布频率', `约 ${report.account.publishFrequency.perWeek} 条/周`]);
  if (report.account.bestPublishTime.windows.length > 0) {
    const timeText = report.account.bestPublishTime.windows.map(w =>
      `${w.timeRange} (${w.percentage.toFixed(1)}%)`
    ).join('；');
    overviewSheet.addRow(['最佳发布时间', timeText]);
  }
  if (report.account.monetization.methods.length > 0) {
    overviewSheet.addRow(['变现方式', report.account.monetization.methods.join('；')]);
  }

  const monthlySheet = workbook.addWorksheet('月度趋势');
  monthlySheet.addRow(['月份', '平均互动', '视频数', 'P90', '中位数', '阈值']);
  for (const data of report.monthlyTrend.data) {
    monthlySheet.addRow([data.month, data.avgEngagement, data.videoCount, data.p90, data.median, data.threshold]);
  }

  const viralsSheet = workbook.addWorksheet('爆款视频');
  viralsSheet.addRow(['总数', report.virals.total]);
  viralsSheet.addRow(['阈值', report.virals.threshold]);
  viralsSheet.addRow([]);
  viralsSheet.addRow(['分类', '数量', '平均互动']);
  for (const category of report.virals.byCategory) {
    viralsSheet.addRow([category.category, category.count, category.avgEngagement]);
  }

  const topicsSheet = workbook.addWorksheet('选题库');
  topicsSheet.addRow(['ID', '分类', '标题1', '标题2', '标题3', '口播稿', '分镜']);
  for (const topic of report.topics) {
    topicsSheet.addRow([topic.id, topic.category, topic.titles[0] || '', topic.titles[1] || '', topic.titles[2] || '', topic.script, topic.storyboard.join('; ')]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
