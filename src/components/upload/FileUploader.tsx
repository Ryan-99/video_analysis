// src/components/upload/FileUploader.tsx
// 文件上传组件 - 现代 SaaS 极简风格
'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface FileUploaderProps {
  onFileUploaded: (fileId: string, fileUrl: string, fileName: string) => void;
}

/**
 * 文件上传组件
 * 现代 SaaS 极简风格 - 深色主题
 * 参考：Linear、Vercel、Stripe
 */
export function FileUploader({ onFileUploaded }: FileUploaderProps) {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * 获取 CTA 颜色
   */
  const getCtaColor = () => {
    switch (theme) {
      case 'yellow':
        return '#facc15';
      case 'green':
        return '#22c55e';
      default:
        return '#6366f1';
    }
  };

  const ctaColor = getCtaColor();

  /**
   * 处理文件上传
   */
  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      onFileUploaded(result.data.fileId, result.data.url, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await uploadFile(file);
    },
    [onFileUploaded]
  );

  /**
   * 处理拖拽事件
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (
      !validTypes.includes(file.type) &&
      !validExtensions.includes(fileExtension)
    ) {
      setError('不支持的文件格式，请上传 Excel 或 CSV 文件');
      return;
    }

    await uploadFile(file);
  };

  return (
    <div className="relative">
      {/* 上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-300
          ${isDragging
            ? 'border-white/20 bg-white/[0.02]'
            : 'border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
          }
        `}
      >
        <div className="p-16 text-center">
          {/* 图标 */}
          <div className="flex justify-center mb-8">
            <div
              className={`
                w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300
                ${isDragging ? 'scale-110' : 'scale-100'}
              `}
              style={{ backgroundColor: `${ctaColor}15` }}
            >
              {uploading ? (
                <svg className="w-8 h-8 animate-spin" style={{ color: ctaColor }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Upload className="w-8 h-8" style={{ color: ctaColor }} />
              )}
            </div>
          </div>

          {/* 标题 */}
          <h3 className="text-white text-2xl font-semibold mb-3">
            {isDragging ? '释放文件上传' : '上传数据文件'}
          </h3>

          {/* 描述 */}
          <p className="text-white/30 text-base mb-8">
            拖拽文件到此处，或点击下方按钮选择文件
          </p>

          {/* 支持格式 */}
          <div className="flex items-center justify-center gap-3 mb-10 text-sm">
            {['CSV', 'XLSX', 'XLS'].map((format) => (
              <span
                key={format}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 font-mono"
              >
                {format}
              </span>
            ))}
            <span className="text-white/30">最大 10MB</span>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="file-upload"
          />

          {/* 上传按钮 - CTA */}
          <label
            htmlFor="file-upload"
            className={`
              inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200
              ${uploading
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-[1.02] hover:shadow-xl hover:-translate-y-0.5'
              }
            `}
            style={{
              backgroundColor: ctaColor,
              color: theme === 'yellow' ? '#000' : '#fff'
            }}
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>上传中...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-5 h-5" />
                <span>选择文件</span>
              </>
            )}
          </label>

          {/* 错误提示 */}
          {error && (
            <div className="mt-6 flex items-center justify-center gap-3 text-red-400">
              <X className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* 拖拽遮罩 */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090b]/80 rounded-2xl backdrop-blur-sm">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-bounce"
                style={{ backgroundColor: `${ctaColor}20` }}
              >
                <Upload className="w-10 h-10" style={{ color: ctaColor }} />
              </div>
              <p className="text-white text-lg font-semibold">释放文件开始上传</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
