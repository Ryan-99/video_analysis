import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ImageRun } from 'docx';
import { Report } from '@/types';

export interface ChartBuffers {
  monthlyTrend?: Buffer;
  dailyVirals?: Buffer;
}

export async function generateWordReport(report: Report, chartBuffers?: ChartBuffers): Promise<Buffer> {
  console.log('[Word Report] 开始生成，报告数据:', JSON.stringify(report).substring(0, 200));
  console.log('[Word Report] 图表Buffer:', {
    monthlyTrend: chartBuffers?.monthlyTrend?.length || 0,
    dailyVirals: chartBuffers?.dailyVirals?.length || 0,
  });

  // 使用真实账号名称（从文件名提取），否则使用 AI 生成的名称
  const displayName = report.realAccountName || report.account.name;

  // 计算月度 Top1 爆点标注（用于文字说明）
  let monthlyTop1Annotations: string[] = [];
  if (report.dailyTop1 && report.dailyTop1.length > 0) {
    const monthlyTop1 = new Map<string, { engagement: number; title: string; date: string }>();
    for (const item of report.dailyTop1) {
      const month = item.date.substring(0, 7);
      const existing = monthlyTop1.get(month);
      if (!existing || item.engagement > existing.engagement) {
        monthlyTop1.set(month, item);
      }
    }
    monthlyTop1Annotations = Array.from(monthlyTop1.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => `${item.date} - ${item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title} (互动量: ${Math.round(item.engagement).toLocaleString()})`);
  }

  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 标题（包含账号名称）
          new Paragraph({ text: `${displayName} - 抖音账号分析报告`, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Paragraph({ text: '' }),

          // 一、账号概况
          new Paragraph({ text: '一、账号概况', heading: HeadingLevel.HEADING_2 }),
          ...generateAccountSection(report.account),
          new Paragraph({ text: '' }),

          // 二、月度趋势分析
          new Paragraph({ text: '二、月度趋势分析', heading: HeadingLevel.HEADING_2 }),
          ...generateMonthlySection(report.monthlyTrend, chartBuffers?.monthlyTrend),
          new Paragraph({ text: '' }),

          // 三、爆款视频分析
          new Paragraph({ text: '三、爆款视频分析', heading: HeadingLevel.HEADING_2 }),
          ...generateViralSection(report.virals, chartBuffers?.dailyVirals, monthlyTop1Annotations),
          new Paragraph({ text: '' }),

          // 四、爆款选题库
          new Paragraph({ text: '四、爆款选题库', heading: HeadingLevel.HEADING_2 }),
          ...generateTopicsSection(report.topics),
        ],
      }],
    });

    console.log('[Word Report] 文档对象创建成功，开始打包');
    const buffer = await Packer.toBuffer(doc);
    console.log('[Word Report] 打包成功，大小:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('[Word Report] 生成失败:', error);
    console.error('[Word Report] 错误堆栈:', error instanceof Error ? error.stack : 'No stack');
    throw error;
  }
}

function generateAccountSection(account: Report['account']): Paragraph[] {
  const paragraphs: Paragraph[] = [
    // 基本信息
    new Paragraph({ children: [new TextRun({ text: '【基本信息】', bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: '账号名称：', bold: true }), new TextRun(account.name)] }),
    new Paragraph({ children: [new TextRun({ text: '账号类型：', bold: true }), new TextRun(account.type)] }),
    new Paragraph({ children: [new TextRun({ text: '核心主题：', bold: true }), new TextRun(account.coreTopic)] }),
    new Paragraph({ children: [new TextRun({ text: '目标受众：', bold: true }), new TextRun(account.audience)] }),
    new Paragraph({ text: '' }),

    // 变现方式
    new Paragraph({ children: [new TextRun({ text: '【变现方式】', bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: '初级变现：', bold: true }), new TextRun(account.monetization.level1)] }),
    new Paragraph({ children: [new TextRun({ text: '中级变现：', bold: true }), new TextRun(account.monetization.level2)] }),
    new Paragraph({ children: [new TextRun({ text: '高级变现：', bold: true }), new TextRun(account.monetization.level3)] }),
    new Paragraph({ text: '' }),
  ];
  return paragraphs;
}

function generateMonthlySection(trend: Report['monthlyTrend'], chartBuffer?: Buffer): Paragraph[] {
  console.log('[Word Report] generateMonthlySection - trend.keys:', Object.keys(trend));
  console.log('[Word Report] generateMonthlySection - trend.data 存在:', !!trend.data);
  if (trend.data) {
    console.log('[Word Report] generateMonthlySection - trend.data.length:', trend.data.length);
    if (trend.data.length > 0) {
      console.log('[Word Report] generateMonthlySection - 第一条数据:', JSON.stringify(trend.data[0]));
    }
  }

  const paragraphs: Paragraph[] = [
    // 总结
    new Paragraph({ children: [new TextRun({ text: '【趋势总结】', bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: trend.summary })] }),
    new Paragraph({ text: '' }),

    // 月度趋势图表
    new Paragraph({ children: [new TextRun({ text: '【月度趋势图表】', bold: true, size: 28 })] }),
  ];

  // 添加图表图片（如果有）
  if (chartBuffer && chartBuffer.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: chartBuffer,
            transformation: { width: 600, height: 300 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  } else {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '（图表暂无）', italics: true })] }));
  }
  paragraphs.push(new Paragraph({ text: '' }));

  // 发展阶段
  paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【发展阶段】', bold: true, size: 28 })] }));

  // 添加阶段信息
  if (trend.stages && trend.stages.length > 0) {
    for (const stage of trend.stages) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: `${stage.type}（${stage.period}）：`, bold: true })] }));
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: stage.description })] }));
    }
    paragraphs.push(new Paragraph({ text: '' }));
  }

  // 月度数据表格
  paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【月度数据详情】', bold: true, size: 28 })] }));
  paragraphs.push(...generateMonthlyTable(trend.data));
  paragraphs.push(new Paragraph({ text: '' }));

  return paragraphs;
}

function generateMonthlyTable(data: Report['monthlyTrend']['data']): Paragraph[] {
  console.log('[Word Report] generateMonthlyTable - data.length:', data?.length || 0);

  if (!data || data.length === 0) {
    console.log('[Word Report] generateMonthlyTable - 数据为空，返回提示段落');
    return [new Paragraph({ children: [new TextRun({ text: '暂无月度数据', italics: true })] })];
  }

  // 表头
  const headerRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ text: '月份' })], width: { size: 20, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: '视频数' })], width: { size: 16, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: '平均互动' })], width: { size: 16, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: 'P90' })], width: { size: 16, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: '中位数' })], width: { size: 16, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: '阈值' })], width: { size: 16, type: WidthType.PERCENTAGE } }),
    ],
  });

  // 数据行
  const dataRows = data.map((item) =>
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: item.month })] }),
        new TableCell({ children: [new Paragraph({ text: item.videoCount.toString() })] }),
        new TableCell({ children: [new Paragraph({ text: Math.round(item.avgEngagement).toLocaleString() })] }),
        new TableCell({ children: [new Paragraph({ text: Math.round(item.p90).toLocaleString() })] }),
        new TableCell({ children: [new Paragraph({ text: Math.round(item.median).toLocaleString() })] }),
        new TableCell({ children: [new Paragraph({ text: Math.round(item.threshold).toLocaleString() })] }),
      ],
    })
  );

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return [new Paragraph({ children: [table] })];
}

function generateViralSection(virals: Report['virals'], chartBuffer?: Buffer, annotations: string[] = []): Paragraph[] {
  console.log('[Word Report] generateViralSection - virals.keys:', Object.keys(virals));
  console.log('[Word Report] generateViralSection - byCategory 存在:', !!virals.byCategory);
  if (virals.byCategory) {
    console.log('[Word Report] generateViralSection - byCategory.length:', virals.byCategory.length);
    if (virals.byCategory.length > 0) {
      console.log('[Word Report] generateViralSection - 第一条分类:', JSON.stringify(virals.byCategory[0]));
    }
  }

  const paragraphs: Paragraph[] = [
    // 总结和统计
    new Paragraph({ children: [new TextRun({ text: '【爆款总结】', bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: virals.summary })] }),
    new Paragraph({ text: '' }),

    new Paragraph({ children: [new TextRun({ text: '【爆款统计】', bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: '爆款总数：', bold: true }), new TextRun({ text: virals.total.toString(), bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: '判定阈值：', bold: true }), new TextRun({ text: Math.round(virals.threshold).toLocaleString(), bold: true })] }),
    new Paragraph({ text: '' }),

    // 每日Top1爆点图表
    new Paragraph({ children: [new TextRun({ text: '【全周期每日Top1爆点趋势（标注版）】', bold: true, size: 28 })] }),
  ];

  // 添加图表图片（如果有）
  if (chartBuffer && chartBuffer.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: chartBuffer,
            transformation: { width: 600, height: 300 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  } else {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '（图表暂无）', italics: true })] }));
  }
  paragraphs.push(new Paragraph({ text: '' }));

  // 月度 Top1 爆点标注（文字说明）
  if (annotations && annotations.length > 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【月度 Top1 爆点标注】', bold: true, size: 24 })] }));
    annotations.forEach((anno) => {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '• ' + anno, size: 20 })] }));
    });
    paragraphs.push(new Paragraph({ text: '' }));
  }

  // 爆款规律
  if (virals.patterns) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【爆款规律】', bold: true, size: 28 })] }));
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '共同元素：', bold: true }), new TextRun({ text: virals.patterns.commonElements || '暂无' })] }));
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '时间规律：', bold: true }), new TextRun({ text: virals.patterns.timingPattern || '暂无' })] }));
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '标题规律：', bold: true }), new TextRun({ text: virals.patterns.titlePattern || '暂无' })] }));
    paragraphs.push(new Paragraph({ text: '' }));
  }

  // 爆款分类
  if (virals.byCategory && virals.byCategory.length > 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【爆款分类详情】', bold: true, size: 28 })] }));
    paragraphs.push(...generateViralCategoriesTable(virals.byCategory));
    paragraphs.push(new Paragraph({ text: '' }));
  }

  return paragraphs;
}

function generateViralCategoriesTable(categories: Report['virals']['byCategory']): Paragraph[] {
  console.log('[Word Report] generateViralCategoriesTable - categories.length:', categories?.length || 0);

  if (!categories || categories.length === 0) {
    console.log('[Word Report] generateViralCategoriesTable - 数据为空，返回提示段落');
    return [new Paragraph({ children: [new TextRun({ text: '暂无分类数据', italics: true })] })];
  }

  // 表头
  const headerRow = new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ text: '分类' })], width: { size: 30, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: '数量' })], width: { size: 20, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: '平均互动' })], width: { size: 25, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: '特征描述' })], width: { size: 25, type: WidthType.PERCENTAGE } }),
    ],
  });

  // 数据行
  const dataRows = categories.map((cat) =>
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: cat.category })] }),
        new TableCell({ children: [new Paragraph({ text: cat.count.toString() })] }),
        new TableCell({ children: [new Paragraph({ text: Math.round(cat.avgEngagement).toLocaleString() })] }),
        new TableCell({ children: [new Paragraph({ text: cat.description })] }),
      ],
    })
  );

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return [new Paragraph({ children: [table] })];
}

function generateTopicsSection(topics: Report['topics']): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (!topics || topics.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '暂无选题库数据', italics: true })] }));
    return paragraphs;
  }

  for (const topic of topics) {
    // 分类标题
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: `${topic.id}. ${topic.category}`, bold: true, size: 26 })],
      spacing: { before: 200, after: 100 }
    }));

    // 标题备选
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【标题备选】', bold: true })] }));
    for (const title of topic.titles) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: `• ${title}` })], indent: { left: 300 } }));
    }

    // 口播稿
    if (topic.script) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【60秒口播稿】', bold: true })] }));
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: topic.script })], indent: { left: 300 } }));
    }

    // 案例点位
    if (topic.casePoint) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【案例点位】', bold: true })] }));
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: topic.casePoint })], indent: { left: 300 } }));
    }

    // 分镜说明
    if (topic.storyboard && topic.storyboard.length > 0) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '【分镜说明】', bold: true })] }));
      for (let i = 0; i < topic.storyboard.length; i++) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: `镜头${i + 1}: ${topic.storyboard[i]}` })], indent: { left: 300 } }));
      }
    }

    paragraphs.push(new Paragraph({ text: '' }));
  }

  return paragraphs;
}
