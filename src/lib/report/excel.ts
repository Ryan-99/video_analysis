import ExcelJS from 'exceljs';
import { Report } from '@/types';

export async function generateExcelReport(report: Report): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const overviewSheet = workbook.addWorksheet('账号概览');
  overviewSheet.addRow(['项目', '内容']);
  overviewSheet.addRow(['账号名称', report.account.name]);
  overviewSheet.addRow(['账号类型', report.account.type]);
  overviewSheet.addRow(['目标受众', report.account.audience]);
  overviewSheet.addRow(['核心主题', report.account.coreTopic]);

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
  return buffer as Buffer;
}
