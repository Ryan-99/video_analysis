// src/components/SettingsDialog.tsx
// 设置弹窗组件 - Aceternity UI + 现代 SaaS 风格
'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Eye, Terminal } from 'lucide-react';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AIProvider {
  id: string;
  name: string;
  apiUrl: string;
  model: string;
  apiKey: string;
  apiFormat: 'openai' | 'claude';
}

interface AIConfig {
  providers: AIProvider[];
  defaultProvider: string;
}

/**
 * 设置弹窗组件
 * Aceternity UI + 现代 SaaS 极简风格
 */
export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    providers: [
      {
        id: 'default',
        name: '默认 OpenAI',
        apiUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        apiKey: '',
        apiFormat: 'openai',
      }
    ],
    defaultProvider: 'default',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: string } | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('aiConfig');
      if (saved) {
        try {
          setAiConfig(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse AI config:', e);
        }
      }
      setSaved(false);
    }
  }, [isOpen]);

  const addProvider = () => {
    const newProvider: AIProvider = {
      id: `provider-${Date.now()}`,
      name: `自定义 ${aiConfig.providers.length + 1}`,
      apiUrl: '',
      model: '',
      apiKey: '',
      apiFormat: 'openai',
    };
    setAiConfig({
      ...aiConfig,
      providers: [...aiConfig.providers, newProvider],
    });
  };

  const removeProvider = (id: string) => {
    if (aiConfig.providers.length <= 1) {
      alert('至少需要保留一个AI提供商');
      return;
    }
    const newProviders = aiConfig.providers.filter(p => p.id !== id);
    const newDefault = aiConfig.defaultProvider === id
      ? newProviders[0].id
      : aiConfig.defaultProvider;
    setAiConfig({
      providers: newProviders,
      defaultProvider: newDefault,
    });
  };

  const updateProvider = (id: string, updates: Partial<AIProvider>) => {
    setAiConfig({
      ...aiConfig,
      providers: aiConfig.providers.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
      await new Promise(resolve => setTimeout(resolve, 500));
      setSaved(true);
      setTimeout(() => onClose(), 1000);
    } finally {
      setSaving(false);
    }
  };

  /**
   * 测试 API 连接
   */
  const testApiConnection = async (provider: AIProvider) => {
    setTesting(provider.id);
    setTestResult({ [provider.id]: '测试中...' });

    try {
      const response = await fetch('/api/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiConfig: JSON.stringify(provider) }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult({
          [provider.id]: `✓ 连接成功 (${result.data.responseTime})`
        });
      } else {
        setTestResult({
          [provider.id]: `✗ ${result.error.details || result.error.message}`
        });
      }
    } catch (error) {
      setTestResult({
        [provider.id]: `✗ 测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setTesting(null);
      // 3秒后清除结果
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  const themes: { key: Theme; name: string; color: string }[] = [
    { key: 'blue', name: '蓝色', color: '#6366f1' },
    { key: 'yellow', name: '黄色', color: '#facc15' },
    { key: 'green', name: '绿色', color: '#22c55e' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 弹窗内容 */}
      <div
        className="relative bg-[#09090b] rounded-2xl shadow-2xl w-full max-w-4xl mx-6 border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 弹窗头部 */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-semibold">设置</h2>
            <p className="text-white/40 text-sm mt-1">
              配置 AI 服务、主题偏好和查看日志
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 弹窗内容区 */}
        <Tabs defaultValue="ai" className="px-8 py-6">
          <TabsList className="bg-white/5 p-1 rounded-xl border border-white/10">
            <TabsTrigger
              value="ai"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 data-[state=active]:hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              AI 配置
            </TabsTrigger>
            <TabsTrigger
              value="theme"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 data-[state=active]:hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              主题
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 data-[state=active]:hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              日志查看器
            </TabsTrigger>
          </TabsList>

          {/* AI 配置标签 */}
          <TabsContent value="ai" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white/70 text-sm font-medium tracking-wider uppercase">AI 服务提供商</h3>
                <Button
                  onClick={addProvider}
                  variant="ghost"
                  size="sm"
                  className="text-white/40 hover:text-white hover:bg-white/5"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加
                </Button>
              </div>

              {aiConfig.providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`
                    border-2 rounded-xl p-6 space-y-5 transition-all
                    ${aiConfig.defaultProvider === provider.id
                      ? 'border-white/20 bg-white/[0.02]'
                      : 'border-white/5 bg-white/[0.01]'
                    }
                  `}
                >
                  {/* 提供商头部 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="defaultProvider"
                        checked={aiConfig.defaultProvider === provider.id}
                        onChange={() => setAiConfig({ ...aiConfig, defaultProvider: provider.id })}
                        className="w-4 h-4"
                        style={{ accentColor: ctaColor }}
                      />
                      <Input
                        type="text"
                        value={provider.name}
                        onChange={(e) => updateProvider(provider.id, { name: e.target.value })}
                        className="text-white font-semibold bg-transparent border-0 p-0 focus:ring-0 focus:outline-none text-base px-0 h-auto"
                        placeholder="提供商名称"
                      />
                      {aiConfig.defaultProvider === provider.id && (
                        <span className="text-xs px-2 py-1 rounded text-white/60 bg-white/10">默认</span>
                      )}
                    </div>
                    {aiConfig.providers.length > 1 && (
                      <button
                        onClick={() => removeProvider(provider.id)}
                        className="text-white/20 hover:text-red-400 transition-colors p-1 hover:bg-white/5 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* API 格式选择 */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all
                      ${provider.apiFormat === 'openai'
                        ? 'bg-white/[0.03] border-white/20'
                        : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                      }
                    `}>
                      <input
                        type="radio"
                        name={`apiFormat-${provider.id}`}
                        checked={provider.apiFormat === 'openai'}
                        onChange={() => updateProvider(provider.id, { apiFormat: 'openai' })}
                        className="w-4 h-4"
                        style={{ accentColor: ctaColor }}
                      />
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">OpenAI 格式</div>
                        <div className="text-white/30 text-xs">/chat/completions</div>
                      </div>
                    </label>
                    <label className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all
                      ${provider.apiFormat === 'claude'
                        ? 'bg-white/[0.03] border-white/20'
                        : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                      }
                    `}>
                      <input
                        type="radio"
                        name={`apiFormat-${provider.id}`}
                        checked={provider.apiFormat === 'claude'}
                        onChange={() => updateProvider(provider.id, { apiFormat: 'claude' })}
                        className="w-4 h-4"
                        style={{ accentColor: ctaColor }}
                      />
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">Claude 格式</div>
                        <div className="text-white/30 text-xs">/v1/messages</div>
                      </div>
                    </label>
                  </div>

                  {/* API 地址 */}
                  <div>
                    <Label className="text-white/50 text-sm mb-2">API 地址</Label>
                    <Input
                      type="text"
                      value={provider.apiUrl}
                      onChange={(e) => updateProvider(provider.id, { apiUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>

                  {/* 模型名称 */}
                  <div>
                    <Label className="text-white/50 text-sm mb-2">模型名称</Label>
                    <Input
                      type="text"
                      value={provider.model}
                      onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
                      placeholder="gpt-4o"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>

                  {/* API 密钥 */}
                  <div>
                    <Label className="text-white/50 text-sm mb-2">API 密钥</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={provider.apiKey}
                        onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                        placeholder="sk-... 或 {{ENV_VAR}}"
                        className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                      />
                      <Button
                        onClick={() => testApiConnection(provider)}
                        disabled={!provider.apiKey || !provider.apiUrl || testing === provider.id}
                        variant="ghost"
                        size="sm"
                        className="px-3 text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30"
                      >
                        {testing === provider.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <Terminal className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {/* 测试结果 */}
                    {testResult?.[provider.id] && (
                      <div className={`mt-2 text-xs ${
                        testResult[provider.id].startsWith('✓') ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {testResult[provider.id]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 主题标签 */}
          <TabsContent value="theme" className="mt-6">
            <div className="space-y-6">
              <h3 className="text-white/70 text-sm font-medium tracking-wider uppercase mb-6">主题选择</h3>
              <div className="grid grid-cols-3 gap-4">
                {themes.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={`
                      group p-6 rounded-xl border-2 transition-all duration-200
                      ${theme === t.key
                        ? 'border-opacity-100 bg-white/[0.03]'
                        : 'border-opacity-0 hover:border-white/10 hover:bg-white/[0.02]'
                      }
                    `}
                    style={{
                      borderColor: theme === t.key ? t.color : 'transparent'
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg mx-auto mb-4 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: t.color }}
                    />
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-white font-medium">{t.name}</p>
                      {theme === t.key && (
                        <Check className="w-4 h-4" style={{ color: t.color }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* 日志查看器标签 */}
          <TabsContent value="logs" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-white/70 text-sm font-medium tracking-wider uppercase">实时日志</h3>
                <Button
                  onClick={() => localStorage.removeItem('analysisLogs')}
                  variant="ghost"
                  size="sm"
                  className="text-white/40 hover:text-red-400 hover:bg-white/5"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清空日志
                </Button>
              </div>

              {/* 日志显示区域 */}
              <div className="bg-[#0a0a0a] rounded-xl p-6 border border-white/10 h-80 overflow-y-auto">
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-green-400">
                    <span className="text-white/30">[2025-01-21 12:00:00]</span>{' '}
                    系统初始化完成
                  </div>
                  <div className="text-blue-400">
                    <span className="text-white/30">[2025-01-21 12:00:01]</span>{' '}
                    等待文件上传...
                  </div>
                  <div className="text-yellow-400">
                    <span className="text-white/30">[2025-01-21 12:00:02]</span>{' '}
                    提示: 请上传 Excel 或 CSV 格式的数据文件
                  </div>
                  <div className="text-white/20">
                    <span className="text-white/30">[2025-01-21 12:00:03]</span>{' '}
                    <span className="text-white/20">日志查看器已就绪，开始分析后将显示实时日志...</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-white/30">
                <Eye className="w-4 h-4" />
                <span>日志实时显示分析过程中的所有操作和状态</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 弹窗底部 */}
        <div className="border-t border-white/5 px-8 py-5 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/30">
              {saved && (
                <span className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  设置已保存
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={onClose}
                disabled={saving}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: ctaColor,
                  color: theme === 'yellow' ? '#000' : '#fff'
                }}
                className="hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    保存中...
                  </>
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已保存
                  </>
                ) : (
                  '保存设置'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
