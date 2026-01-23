'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ViralCategoryData {
  category: string;
  count: number;
  avgEngagement: number;
}

interface ViralCategoriesChartProps {
  data: ViralCategoryData[];
}

// 主题色数组（交替使用）
const COLORS = ['#4a7cff', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4'];

/**
 * 爆款分类统计图
 * 显示各分类的爆款数量和平均互动量
 */
export function ViralCategoriesChart({ data }: ViralCategoriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        layout="vertical"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          type="number"
          stroke="#888"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          type="category"
          dataKey="category"
          stroke="#888"
          width={80}
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={(value: number, name: string) => [
            name === 'count' ? `${value} 条` : value.toLocaleString(),
            name === 'count' ? '数量' : '平均互动',
          ]}
        />
        <Legend wrapperStyle={{ color: '#888' }} />
        <Bar dataKey="count" fill="#4a7cff" name="爆款数量">
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
