// QuickChart annotation 分步测试
// 分别测试不同的 annotation 配置，找出问题

import fs from 'fs';

// 基础图表配置
const baseConfig = (title) => ({
  type: 'line',
  data: {
    labels: ['2024-01-01', '2024-01-02', '2024-01-03'],
    datasets: [{
      label: '每日Top1互动量',
      data: [10000, 15000, 12000],
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      pointRadius: 2,
    }],
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: title,
      },
      legend: { display: false },
    },
    scales: {
      x: { display: true },
      y: { display: true, beginAtZero: true },
    },
  },
});

// 测试1: 基础图表（无annotation）
async function test1_Basic() {
  console.log('\n=== 测试 1: 基础图表（无 annotation）===');

  const config = baseConfig('测试1: 基础图表');

  const response = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart: config,
      width: 800,
      height: 400,
      format: 'png',
    }),
  });

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    fs.writeFileSync('test-1-basic.png', Buffer.from(buffer));
    console.log('✅ test-1-basic.png 已保存');
  } else {
    console.error('❌ 测试1失败:', await response.text());
  }
}

// 测试2: Point annotation
async function test2_PointAnnotation() {
  console.log('\n=== 测试 2: Point Annotation（红点标注）===');

  const config = baseConfig('测试2: Point Annotation');
  config.options.plugins.annotation = {
    annotations: {
      point1: {
        type: 'point',
        xValue: '2024-01-02',
        yValue: 15000,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        radius: 6,
      },
    },
  };

  const response = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart: config,
      width: 800,
      height: 400,
      format: 'png',
    }),
  });

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    fs.writeFileSync('test-2-point.png', Buffer.from(buffer));
    console.log('✅ test-2-point.png 已保存');
  } else {
    console.error('❌ 测试2失败:', await response.text());
  }
}

// 测试3: Label annotation
async function test3_LabelAnnotation() {
  console.log('\n=== 测试 3: Label Annotation（标题标签）===');

  const config = baseConfig('测试3: Label Annotation');
  config.options.plugins.annotation = {
    annotations: {
      label1: {
        type: 'label',
        xValue: '2024-01-02',
        yValue: 15000,
        content: ['测试标题'],
        font: { size: 14 },
        color: '#fff',
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
      },
    },
  };

  const response = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart: config,
      width: 800,
      height: 400,
      format: 'png',
    }),
  });

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    fs.writeFileSync('test-3-label.png', Buffer.from(buffer));
    console.log('✅ test-3-label.png 已保存');
  } else {
    console.error('❌ 测试3失败:', await response.text());
  }
}

// 测试4: Point + Label 组合
async function test4_CombinedAnnotation() {
  console.log('\n=== 测试 4: Point + Label 组合 ===');

  const config = baseConfig('测试4: Point + Label 组合');
  config.options.plugins.annotation = {
    annotations: {
      point1: {
        type: 'point',
        xValue: '2024-01-02',
        yValue: 15000,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        radius: 6,
      },
      label1: {
        type: 'label',
        xValue: '2024-01-02',
        yValue: 15000,
        content: ['测试标题'],
        font: { size: 11 },
        color: '#fff',
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        borderRadius: 4,
        padding: { top: 4, bottom: 4, left: 6, right: 6 },
        yAdjust: -15,
      },
    },
  };

  const response = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart: config,
      width: 800,
      height: 400,
      format: 'png',
    }),
  });

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    fs.writeFileSync('test-4-combined.png', Buffer.from(buffer));
    console.log('✅ test-4-combined.png 已保存');
  } else {
    console.error('❌ 测试4失败:', await response.text());
  }
}

// 测试5: 简化的 Box annotation（替代方案）
async function test5_BoxAnnotation() {
  console.log('\n=== 测试 5: Box Annotation（替代方案）===');

  const config = baseConfig('测试5: Box Annotation');
  config.options.plugins.annotation = {
    annotations: {
      box1: {
        type: 'box',
        xMin: '2024-01-02',
        xMax: '2024-01-02',
        yMin: 15000,
        yMax: 16000,
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
      },
    },
  };

  const response = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart: config,
      width: 800,
      height: 400,
      format: 'png',
    }),
  });

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    fs.writeFileSync('test-5-box.png', Buffer.from(buffer));
    console.log('✅ test-5-box.png 已保存');
  } else {
    console.error('❌ 测试5失败:', await response.text());
  }
}

// 运行所有测试
(async () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║    QuickChart Annotation 分步测试                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  await test1_Basic();
  await test2_PointAnnotation();
  await test3_LabelAnnotation();
  await test4_CombinedAnnotation();
  await test5_BoxAnnotation();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║    所有测试完成                                        ║');
  console.log('║    请检查生成的图片文件，对比每个测试的效果            ║');
  console.log('╚════════════════════════════════════════════════════════╝');
})();
