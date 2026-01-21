'use client';

// src/app/page.tsx
// 首页 - 文件上传
// 现代化设计：深灰主色调、浅灰背景、唯一亮色仅用于按钮、大间距、极细边框
import { FileUploader } from '@/components/upload/FileUploader';
import { SettingsDialog } from '@/components/SettingsDialog';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';

export default function HomePage() {
  const { theme } = useTheme();
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  // 获取主题色
  const getAccentColor = () => {
    switch (theme) {
      case 'yellow':
        return '#d4a84b';
      case 'green':
        return '#5b8c5a';
      default:
        return '#4a7cff';
    }
  };

  const accentColor = getAccentColor();

  /**
   * 处理文件上传成功 - 直接开始分析
   */
  const handleFileUploaded = async (id: string, url: string, name: string) => {
    try {
      setFileId(id);
      setFileName(name);
      setIsAnalyzing(true);

      // 直接调用分析 API，不传列映射（后端自动检测）
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: id,
          fileUrl: url,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/analyze/${result.data.taskId}`);
      } else {
        // 显示错误信息
        console.error('分析启动失败:', result.error);
        setIsAnalyzing(false);
        if (result.error.code === 'INCOMPLETE_MAPPING') {
          alert(`字段映射不完整，缺少必要字段：${result.error.missing.join(', ')}`);
        } else {
          alert(`分析启动失败: ${result.error.message}`);
        }
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setIsAnalyzing(false);
      alert('分析启动失败，请重试');
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gray-50">
        {/* 顶部导航 */}
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-12 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: accentColor }}
              >
                <span className="text-white text-base font-bold">D</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  抖音账号分析工具
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">AI驱动的数据洞察</p>
              </div>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-4 h-4" />
              <span>设置</span>
            </button>
          </div>
        </header>

        {/* 主内容区 - 大间距 */}
        <div className="max-w-5xl mx-auto px-12 py-16">
          <div className="space-y-12">
            {/* 欢迎区域 */}
            <section className="text-center space-y-6">
              <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                深入了解您的<br />抖音账号表现
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
                上传您的视频数据，获取 AI 驱动的深度分析报告。
                了解内容表现趋势，发现增长机会。
              </p>
            </section>

            {/* 特性卡片 */}
            <section className="grid grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <svg className="w-7 h-7" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">数据统计</h3>
                <p className="text-sm text-gray-500 leading-relaxed">全面的月度趋势分析与数据可视化</p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <svg className="w-7 h-7" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">爆款识别</h3>
                <p className="text-sm text-gray-500 leading-relaxed">智能发现高潜力内容与增长机会</p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${accentColor}15` }}
                >
                  <svg className="w-7 h-7" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9.a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI 分析</h3>
                <p className="text-sm text-gray-500 leading-relaxed">深度内容洞察与优化建议</p>
              </div>
            </section>

            {/* 流程说明 */}
            <section className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-8 uppercase tracking-wide">分析流程</h3>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      1
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">上传数据</h4>
                  </div>
                  <p className="text-sm text-gray-500 ml-14">支持 CSV / Excel 格式</p>
                </div>

                <div className="w-16 h-px bg-gray-200" />

                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      2
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">自动分析</h4>
                  </div>
                  <p className="text-sm text-gray-500 ml-14">智能识别字段</p>
                </div>

                <div className="w-16 h-px bg-gray-200" />

                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                      3
                    </div>
                    <h4 className="text-base font-semibold text-gray-900">获取报告</h4>
                  </div>
                  <p className="text-sm text-gray-500 ml-14">AI 生成分析</p>
                </div>
              </div>
            </section>

            {/* 上传区域 */}
            {!fileId ? (
              <FileUploader onFileUploaded={handleFileUploaded} />
            ) : (
              <section className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">文件上传成功</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    文件: <span className="text-gray-700">{fileName || '未知文件'}</span>
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm text-gray-600">正在自动识别字段并开始分析...</span>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* 设置弹窗 */}
      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
