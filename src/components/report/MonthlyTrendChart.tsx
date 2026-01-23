'use client';

import { MonthlyData } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MonthlyTrendChartProps {
  data: MonthlyData[];
}

/**
 * 月度趋势折线图
 * 显示每月的平均互动总量、P90、中位数和阈值
 */
export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  // 格式化数据用于图表显示
  const chartData = data.map((item) => ({
    month: item.month,
    平均互动: Math.round(item.avgEngagement),
    P90: Math.round(item.p90),
    中位数: Math.round(item.median),
    阈值: Math.round(item.threshold),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="month"
          stroke="#888"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#888"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
          }}
        />
        <Legend wrapperStyle={{ color: '#888' }} />
        <Line
          type="monotone"
          dataKey="平均互动"
          stroke="#4a7cff"
          strokeWidth={2}
          dot={{ fill: '#4a7cff', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="P90"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ fill: '#22c55e', r: 3 }}
          strokeDasharray="5 5"
        />
        <Line
          type="monotone"
          dataKey="中位数"
          stroke="#eab308"
          strokeWidth={2}
          dot={{ fill: '#eab308', r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="阈值"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          strokeDasharray="3 3"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
