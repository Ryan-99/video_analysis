// src/components/upload/FileUploader.tsx
// 文件上传组件
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileUploaded: (fileId: string) => void;
}

/**
 * 文件上传组件
 * 支持拖拽上传和点击选择文件
 */
export function FileUploader({ onFileUploaded }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 准备表单数据
      const formData = new FormData();
      formData.append('file', file);

      // 上传文件
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      // 通知父组件上传成功
      onFileUploaded(result.data.fileId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded]);

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center gap-4">
        <Upload className="w-12 h-12 text-gray-400" />
        <h3 className="text-lg font-semibold">上传数据文件</h3>
        <p className="text-sm text-gray-500">
          支持 Excel (.xlsx, .xls) 和 CSV 文件，最大10MB
        </p>

        {/* 隐藏的文件输入 */}
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id="file-upload"
        />

        {/* 上传按钮 */}
        <label htmlFor="file-upload">
          <Button disabled={uploading} asChild>
            <span>{uploading ? '上传中...' : '选择文件'}</span>
          </Button>
        </label>

        {/* 错误提示 */}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    </Card>
  );
}
