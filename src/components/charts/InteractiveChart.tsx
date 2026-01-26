'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface InteractiveChartProps {
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      borderWidth?: number;
      pointRadius?: number;
      pointHoverRadius?: number;
      fill?: boolean;
    }>;
  };
  yLabel?: string;
  xLabel?: string;
  annotations?: Array<{
    index: number;
    label: string;
  }>;
  height?: number;
}

/**
 * 可交互折线图组件
 * 支持点击数据点查看详细信息
 */
export function InteractiveChart({
  title,
  data,
  yLabel = '互动量',
  xLabel = '日期',
  annotations = [],
  height = 400,
}: InteractiveChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    label: string;
    value: number;
  } | null>(null);

  // 处理数据点点击事件
  const handleClick = (event: any, elements: any[]) => {
    if (elements && elements.length > 0) {
      const { index, datasetIndex } = elements[0];
      const label = data.labels[index];
      const value = data.datasets[datasetIndex].data[index];
      setSelectedPoint({ index, label, value: value as number });
    } else {
      setSelectedPoint(null);
    }
  };

  // Chart.js 配置
  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map(ds => ({
      ...ds,
      fill: ds.fill ?? false,
      tension: 0.1, // 平滑曲线
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        color: '#e5e7eb',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#f3f4f6',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            return `${value.toLocaleString()} 互动量`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: xLabel,
          color: '#9ca3af',
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: yLabel,
          color: '#9ca3af',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return value.toLocaleString();
          },
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
        },
      },
    },
    onClick: handleClick,
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <Card className="p-4 bg-white/5 border border-white/10">
      <div style={{ height: `${height}px` }}>
        <Line data={chartData} options={options} />
      </div>

      {/* 选中数据点的详情 */}
      {selectedPoint && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="text-sm text-gray-400">
            选中数据点：
            <span className="ml-2 font-medium text-white">{selectedPoint.label}</span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            互动量：
            <span className="ml-2 font-medium text-green-400">
              {selectedPoint.value.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* 标注信息 */}
      {annotations && annotations.length > 0 && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <div className="text-sm font-medium text-gray-200 mb-2">月度 Top1 爆点标注</div>
          <div className="space-y-1">
            {annotations.map((anno, idx) => (
              <div key={idx} className="text-xs text-gray-400">
                <span className="text-blue-400">{anno.label}</span>:{" "}
                {data.labels[anno.index]} - 互动量{" "}
                {data.datasets[0].data[anno.index]?.toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
