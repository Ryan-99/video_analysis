// src/components/upload/FileUploader.tsx
// 文件上传组件
'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFileUploaded: (fileId: string, fileUrl: string, fileName: string) => void;
}

/**
 * 文件上传组件
 * 支持拖拽上传和点击选择文件
 */
export function FileUploader({ onFileUploaded }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * 处理文件上传
   */
  const uploadFile = async (file: File) => {
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

      // 通知父组件上传成功（传递 fileId, fileUrl 和 fileName）
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

    // 检查文件类型
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
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      {/* 拖拽上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          {/* 图标 */}
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isDragging ? 'bg-indigo-100' : 'bg-gray-100'
            }`}
          >
            <Upload
              className={`w-8 h-8 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`}
            />
          </div>

          {/* 标题 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              上传数据文件
            </h3>
            <p className="text-sm text-gray-500">
              拖拽文件到此处，或点击下方按钮选择文件
            </p>
          </div>

          {/* 支持格式说明 */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="px-2 py-1 bg-gray-100 rounded">CSV</span>
            <span className="px-2 py-1 bg-gray-100 rounded">XLSX</span>
            <span className="px-2 py-1 bg-gray-100 rounded">XLS</span>
            <span>最大 10MB</span>
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

          {/* 上传按钮 */}
          <label htmlFor="file-upload">
            <button
              disabled={uploading}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg'
              }`}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  上传中...
                </span>
              ) : (
                '选择文件'
              )}
            </button>
          </label>

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
