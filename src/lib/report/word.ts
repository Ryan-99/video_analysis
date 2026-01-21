import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { Report } from '@/types';

export async function generateWordReport(report: Report): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: '抖音账号分析报告', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: '一、账号概况', heading: HeadingLevel.HEADING_2 }),
        ...generateAccountSection(report.account),
        new Paragraph({ text: '二、月度趋势分析', heading: HeadingLevel.HEADING_2 }),
        ...generateMonthlySection(report.monthlyTrend),
        new Paragraph({ text: '三、爆款视频分析', heading: HeadingLevel.HEADING_2 }),
        ...generateViralSection(report.virals),
        new Paragraph({ text: '四、爆款选题库', heading: HeadingLevel.HEADING_2 }),
        ...generateTopicsSection(report.topics),
      ],
    }],
  });
  return await Packer.toBuffer(doc);
}

function generateAccountSection(account: Report['account']): Paragraph[] {
  return [
    new Paragraph({ children: [new TextRun({ text: '账号名称: ', bold: true }), new TextRun(account.name)] }),
    new Paragraph({ children: [new TextRun({ text: '账号类型: ', bold: true }), new TextRun(account.type)] }),
    new Paragraph({ children: [new TextRun({ text: '目标受众: ', bold: true }), new TextRun(account.audience)] }),
    new Paragraph({ children: [new TextRun({ text: '核心主题: ', bold: true }), new TextRun(account.coreTopic)] }),
    new Paragraph({ text: '' }),
  ];
}

function generateMonthlySection(trend: Report['monthlyTrend']): Paragraph[] {
  const paragraphs: Paragraph[] = [new Paragraph({ text: trend.summary }), new Paragraph({ text: '' })];
  for (const data of trend.data) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: `${data.month}: `, bold: true }), new TextRun(`平均互动 ${data.avgEngagement.toFixed(0)}, 视频数 ${data.videoCount}`)] }));
  }
  paragraphs.push(new Paragraph({ text: '' }));
  return paragraphs;
}

function generateViralSection(virals: Report['virals']): Paragraph[] {
  return [new Paragraph({ text: virals.summary }), new Paragraph({ text: '' })];
}

function generateTopicsSection(topics: Report['topics']): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const topic of topics) {
    paragraphs.push(new Paragraph({ text: `${topic.id}. ${topic.category}`, heading: HeadingLevel.HEADING_3 }));
    for (const title of topic.titles) paragraphs.push(new Paragraph({ text: `• ${title}` }));
    paragraphs.push(new Paragraph({ text: '' }));
  }
  return paragraphs;
}
