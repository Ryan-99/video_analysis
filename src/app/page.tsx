'use client';

// src/app/page.tsx
// 首页 - 现代 SaaS 极简风格 + Aceternity UI
import { FileUploader } from '@/components/upload/FileUploader';
import { SettingsDialog } from '@/components/SettingsDialog';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, BarChart3, Upload, Sparkles, Zap } from 'lucide-react';
import { DotPattern } from '@/components/ui/dot-pattern';
import { GridPattern } from '@/components/ui/grid-pattern';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

/**
 * 从文件名提取账号名称
 */
function extractAccountNameFromFileName(fileName: string): string {
  // 移除文件扩展名
  const nameWithoutExt = fileName.replace(/\.(xlsx|xls|csv)$/i, '');

  // 移除常见的关键词后缀
  const cleanName = nameWithoutExt
    .replace(/[-_](数据|明细|视频|账号|分析|报告|统计|记录)$/gi, '')
    .replace(/[-_]\d{4}[-_]\d{1,2}[-_]\d{1,2}/gi, '') // 移除日期格式
    .replace(/[-_]\d{8}/gi, '') // 移除8位数字日期
    .trim();

  // 如果清理后为空，返回原始文件名（不含扩展名）
  return cleanName || nameWithoutExt;
}

/**
 * 首页
 * 现代 SaaS 极简风格 + Aceternity UI 增强
 * 深色主题 - 参考 Linear、Vercel、Stripe
 */
export default function HomePage() {
  const { theme } = useTheme();
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  /**
   * 获取 CTA 按钮颜色
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
   * 处理文件上传成功 - 直接开始分析
   */
  const handleFileUploaded = async (id: string, url: string, name: string) => {
    try {
      setFileId(id);
      setFileName(name);

      // 从文件名提取账号名称
      const extractedAccountName = extractAccountNameFromFileName(name);
      setAccountName(extractedAccountName);
      console.log('[HomePage] 从文件名识别的账号名称:', extractedAccountName);

      // 从 localStorage 读取 AI 配置
      let aiConfig = undefined;
      const savedConfig = localStorage.getItem('aiConfig');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          // 获取默认提供商的配置
          const defaultProvider = config.providers.find((p: any) => p.id === config.defaultProvider) || config.providers[0];
          aiConfig = JSON.stringify(defaultProvider);
        } catch (e) {
          console.error('Failed to parse AI config from localStorage:', e);
        }
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: id,
          fileUrl: url,
          aiConfig, // 传递 AI 配置
          accountName: extractedAccountName, // 传递账号名称
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 创建任务成功，立即触发后台处理
        console.log('[HomePage] 任务已创建，ID:', result.data.taskId);
        console.log('[HomePage] 即将调用后台处理接口...');

        // 调用 /api/jobs/process 来触发后台任务执行
        // 传递 taskId 参数，确保后端处理正确的任务
        // 使用 keepalive: true 确保页面跳转后请求仍然继续
        fetch('/api/jobs/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: result.data.taskId }),
          keepalive: true, // 允许请求在页面卸载后继续
        }).catch(processError => {
          // 忽略错误，因为页面可能已经跳转
          console.log('[HomePage] 后台处理请求已发送');
        });

        // 跳转到分析页面
        router.push(`/analyze/${result.data.taskId}`);
      } else {
        console.error('分析启动失败:', result.error);
        setFileId(null);
        setFileName(null);
        setAccountName(null);
        if (result.error.code === 'INCOMPLETE_MAPPING') {
          alert(`字段映射不完整，缺少必要字段：${result.error.missing.join(', ')}`);
        } else {
          alert(`分析启动失败: ${result.error.message}`);
        }
      }
    } catch (error) {
      console.error('Failed to start analysis:', error);
      setFileId(null);
      setFileName(null);
      setAccountName(null);
      alert('分析启动失败，请重试');
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* 背景装饰 - 极简网格 */}
      <GridPattern className="absolute inset-0 opacity-30" />

      {/* 顶部导航 */}
      <header className="relative border-b border-white/5">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
              <BarChart3 className="w-5 h-5 text-white/60" />
            </div>
            <div className="text-white font-semibold text-lg">
              抖音数据分析
            </div>
          </div>

          {/* 设置按钮 */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-4 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            设置
          </button>
        </div>
      </header>

      {/* 主内容 */}
      <div className="relative max-w-4xl mx-auto px-8 py-16">
        {/* Hero 区域 */}
        <div className="text-center mb-12 relative">
          {/* 标签 */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 mb-8">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: ctaColor }} />
            <span className="text-xs text-white/50 font-medium tracking-wide uppercase">AI-Powered Analysis</span>
          </div>

          {/* 主标题 */}
          <h1 className="text-white text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            深度解析您的
            <br />
            <span style={{ color: ctaColor }}>抖音账号数据</span>
          </h1>

          {/* 副标题 */}
          <p className="text-white/40 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            上传视频数据，自动识别字段，AI 智能分析
            <br />
            生成完整的可视化报告
          </p>

          {/* 特性标签 */}
          <div className="flex items-center justify-center gap-6 text-sm text-white/30">
            <span className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-white/30" />
              自动字段识别
            </span>
            <span className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-white/30" />
              AI 智能分析
            </span>
            <span className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-white/30" />
              可视化报告
            </span>
          </div>
        </div>

        {/* 流程说明 - 移到上传区域之前 */}
        <div className="relative mb-16">
          <DotPattern className="opacity-20" />
          <div className="relative max-w-4xl mx-auto px-8 py-12">
            <div className="text-center mb-10">
              <h2 className="text-white/50 text-sm font-medium tracking-wider uppercase">Analysis Flow</h2>
            </div>

            <div className="grid grid-cols-3 gap-8">
              {[
                { num: '01', title: '上传数据', subtitle: 'Excel / CSV' },
                { num: '02', title: '智能分析', subtitle: '自动识别 + AI' },
                { num: '03', title: '获取报告', subtitle: '可视化结果' }
              ].map((step, index) => (
                <div key={index} className="text-center">
                  <div className="text-white/5 text-6xl font-black mb-4">{step.num}</div>
                  <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                  <p className="text-white/30 text-sm">{step.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 上传区域 */}
        {!fileId ? (
          <div className="relative">
            <FileUploader onFileUploaded={handleFileUploaded} />
          </div>
        ) : (
          <div className="text-center py-20">
            {/* 成功图标 */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${ctaColor}15` }}
            >
              <svg className="w-10 h-10" style={{ color: ctaColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-white text-2xl font-semibold mb-3">文件上传成功</h3>
            <p className="text-white/40 mb-8">{fileName || '未知文件'}</p>
            {accountName && (
              <p className="text-white/30 mb-8 text-sm">账号名称：{accountName}</p>
            )}

            {/* 加载状态 */}
            <div className="flex items-center justify-center gap-4">
              <svg className="w-5 h-5 animate-spin text-white/40" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-white/40">正在自动识别字段并开始分析...</span>
            </div>
          </div>
        )}
      </div>

      {/* 特性卡片 - 使用 HoverBorderGradient */}
      <div className="relative border-t border-white/5">
        <div className="max-w-6xl mx-auto px-8 py-16">
          <div className="grid grid-cols-3 gap-6">
            {[
              {
                icon: Upload,
                title: '数据解析',
                description: '支持 Excel / CSV 格式，自动识别数据字段'
              },
              {
                icon: Sparkles,
                title: 'AI 分析',
                description: '深度学习账号特征，智能划分成长阶段'
              },
              {
                icon: Zap,
                title: '选题生成',
                description: '基于爆款分析，自动生成 30 条选题脚本'
              }
            ].map((feature, index) => (
              <HoverBorderGradient
                key={index}
                className="group p-8 transition-all duration-300"
              >
                <feature.icon className="w-8 h-8 text-white/20 mb-6 group-hover:text-white/40 transition-colors" />
                <h3 className="text-white font-semibold text-lg mb-3">{feature.title}</h3>
                <p className="text-white/30 text-sm leading-relaxed">{feature.description}</p>
              </HoverBorderGradient>
            ))}
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
