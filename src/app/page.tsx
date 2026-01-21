// src/app/page.tsx
// 首页 - 文件上传和列映射
import { FileUploader } from '@/components/upload/FileUploader';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnMapping } from '@/types';

export default function HomePage() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    title: '',
    likes: '',
    comments: '',
    saves: '',
    shares: '',
    publishTime: '',
  });
  const router = useRouter();

  /**
   * 处理文件上传成功
   */
  const handleFileUploaded = (id: string, url: string) => {
    setFileId(id);
    setFileUrl(url);
  };

  /**
   * 处理列映射确认
   */
  const handleColumnConfirm = async (mapping: ColumnMapping) => {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          columnMapping: mapping,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 跳转到分析页面
        router.push(`/analyze/${result.data.taskId}`);
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">抖音账号分析工具</h1>

        {/* 根据状态显示不同组件 */}
        {!fileId ? (
          <FileUploader onFileUploaded={handleFileUploaded} />
        ) : (
          <ColumnMapper
            fileId={fileId}
            fileUrl={fileUrl!}
            initialMapping={columnMapping}
            onConfirm={handleColumnConfirm}
          />
        )}
      </div>
    </main>
  );
}
