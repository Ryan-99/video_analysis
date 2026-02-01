// QuickChart API annotation 支持测试脚本
// 测试 chartjs-plugin-annotation 在 QuickChart 服务端的兼容性

import fs from 'fs';

// 测试配置：与 service.ts generateDailyTop1Config 相同的 annotation 配置
const testConfig = {
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
        text: '测试图表 - annotation 支持',
      },
      legend: {
        display: false,
      },
      // ===== annotation 配置 =====
      annotation: {
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
      },
      // ===== annotation 配置结束 =====
    },
    scales: {
      x: { display: true },
      y: { display: true, beginAtZero: true },
    },
  },
};

// 测试 GET 方法
async function testQuickChartGet() {
  console.log('=== 测试 GET 方法 ===');
  const baseUrl = 'https://quickchart.io/chart';
  const params = new URLSearchParams({
    c: JSON.stringify(testConfig),
    w: '800',
    h: '400',
    format: 'png',
  });
  const url = `${baseUrl}?${params.toString()}`;

  console.log('测试 URL:', url.substring(0, 100) + '...');
  console.log('URL 长度:', url.length);

  const response = await fetch(url);
  console.log('响应状态:', response.status);
  console.log('响应类型:', response.headers.get('content-type'));

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    console.log('图片大小:', buffer.byteLength, '字节');

    // 保存图片到本地
    fs.writeFileSync('test-output-get.png', Buffer.from(buffer));
    console.log('✅ GET 方法图片已保存到 test-output-get.png');
  } else {
    const errorText = await response.text();
    console.error('❌ GET 请求失败:', errorText);
  }
}

// 测试 POST 方法
async function testQuickChartPost() {
  console.log('\n=== 测试 POST 方法 ===');

  const response = await fetch('https://quickchart.io/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart: testConfig,
      width: 800,
      height: 400,
      format: 'png',
      devicePixelRatio: 2,
    }),
  });

  console.log('响应状态:', response.status);
  console.log('响应类型:', response.headers.get('content-type'));

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('image')) {
    const buffer = await response.arrayBuffer();
    console.log('图片大小:', buffer.byteLength, '字节');

    fs.writeFileSync('test-output-post.png', Buffer.from(buffer));
    console.log('✅ POST 方法图片已保存到 test-output-post.png');
  } else {
    const errorText = await response.text();
    console.error('❌ POST 请求失败:', errorText);
  }
}

// 运行测试
(async () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║    QuickChart API annotation 支持测试                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  await testQuickChartGet();
  await testQuickChartPost();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║    测试完成                                            ║');
  console.log('║    请查看生成的图片文件：                               ║');
  console.log('║    - test-output-get.png (GET 方法)                    ║');
  console.log('║    - test-output-post.png (POST 方法)                  ║');
  console.log('║                                                        ║');
  console.log('║    判断标准：                                          ║');
  console.log('║    - 如果图片中有红点 + 白色标题标签 → QuickChart 支持  ║');
  console.log('║    - 如果只有折线图 → QuickChart 不支持 annotation      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
})();
