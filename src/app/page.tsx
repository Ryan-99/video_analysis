'use client';

// src/app/page.tsx
// 首页 - 文件上传和列映射
import { FileUploader } from '@/components/upload/FileUploader';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ColumnMapping } from '@/types';

export default function HomePage() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
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
  const handleFileUploaded = (id: string, url: string, name: string) => {
    setFileId(id);
    setFileUrl(url);
    setFileName(name);
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">D</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              抖音账号分析工具
            </h1>
          </div>
          <Link
            href="/settings"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            设置
          </Link>
        </div>
      </header>

      {/* 主内容 */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* 欢迎卡片 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              深入了解您的抖音账号
            </h2>
            <p className="text-indigo-100 text-lg">
              上传您的视频数据，获取AI驱动的深度分析和建议
            </p>
          </div>
          <div className="px-8 py-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-indigo-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">数据统计</h3>
                <p className="text-sm text-gray-500">月度趋势分析</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">爆款识别</h3>
                <p className="text-sm text-gray-500">发现高潜力内容</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-pink-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">AI分析</h3>
                <p className="text-sm text-gray-500">智能内容洞察</p>
              </div>
            </div>
          </div>
        </div>

        {/* 工作流程 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-sm font-medium text-gray-900 mb-4">分析流程</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">上传数据</p>
                <p className="text-xs text-gray-500">支持CSV/Excel格式</p>
              </div>
            </div>
            <div className="w-12 h-px bg-gray-200" />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">映射字段</p>
                <p className="text-xs text-gray-500">匹配数据列</p>
              </div>
            </div>
            <div className="w-12 h-px bg-gray-200" />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">获取报告</p>
                <p className="text-xs text-gray-500">AI生成分析</p>
              </div>
            </div>
          </div>
        </div>

        {/* 根据状态显示不同组件 */}
        {!fileId ? (
          <FileUploader
            onFileUploaded={handleFileUploaded}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">映射数据字段</h3>
                <p className="text-sm text-gray-500 mt-1">
                  文件: {fileName || '未知文件'}
                </p>
              </div>
              <button
                onClick={() => {
                  setFileId(null);
                  setFileUrl(null);
                  setFileName(null);
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                重新上传
              </button>
            </div>
            <ColumnMapper
              fileId={fileId}
              fileUrl={fileUrl!}
              initialMapping={columnMapping}
              onConfirm={handleColumnConfirm}
            />
          </div>
        )}
      </div>
    </main>
  );
}
