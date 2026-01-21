// src/components/upload/ColumnMapper.tsx
// 列映射组件
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ColumnMapping } from '@/types';

interface ColumnMapperProps {
  fileId: string;
  initialMapping: ColumnMapping;
  onConfirm: (mapping: ColumnMapping) => void;
}

/**
 * 列映射组件
 * 允许用户确认或修改自动检测的列映射
 */
export function ColumnMapper({
  fileId,
  initialMapping,
  onConfirm
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * 加载文件预览数据
   */
  useEffect(() => {
    async function loadPreview() {
      try {
        const response = await fetch('/api/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId }),
        });

        const result = await response.json();

        if (result.success) {
          setPreviewData(result.data.previewData);
          // 使用检测到的列映射更新初始映射
          setMapping(result.data.columnMapping);
        }
      } catch (error) {
        console.error('Failed to load preview:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPreview();
  }, [fileId]);

  // 加载中状态
  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </Card>
    );
  }

  // 获取所有可用的列名
  const allColumns = previewData.length > 0
    ? Object.keys(previewData[0])
    : [];

  /**
   * 获取字段的中文名称
   */
  function getFieldLabel(key: string): string {
    const labels: Record<string, string> = {
      title: '视频标题',
      likes: '点赞数',
      comments: '评论数',
      saves: '收藏数',
      shares: '转发数',
      publishTime: '发布时间',
    };
    return labels[key] || key;
  }

  /**
   * 检查映射是否完整
   */
  const isMappingComplete = Object.values(mapping).every(v => v);

  return (
    <Card className="p-8">
      <h3 className="text-lg font-semibold mb-4">确认列映射</h3>

      {/* 列映射选择器 */}
      <div className="space-y-4">
        {Object.entries(mapping).map(([key, value]) => (
          <div key={key} className="flex items-center gap-4">
            <Label className="w-32">{getFieldLabel(key)}:</Label>
            <select
              value={value}
              onChange={(e) =>
                setMapping({ ...mapping, [key]: e.target.value })
              }
              className="flex-1 px-3 py-2 border rounded"
            >
              <option value="">-- 请选择 --</option>
              {allColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* 数据预览表格 */}
      {previewData.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">
            数据预览（前5条）
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {allColumns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2 text-left border bg-gray-50"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {allColumns.map((col) => (
                      <td key={col} className="px-4 py-2 border">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 确认按钮 */}
      <Button
        onClick={() => onConfirm(mapping)}
        className="mt-6"
        disabled={!isMappingComplete}
      >
        开始分析
      </Button>
    </Card>
  );
}
