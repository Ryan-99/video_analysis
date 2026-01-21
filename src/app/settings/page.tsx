'use client';

// src/app/settings/page.tsx
// 设置页面 - AI配置管理
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAnalysisStore } from '@/lib/store/use-analysis-store';
import { AIConfig } from '@/types';

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 新增配置表单状态
  const [newConfig, setNewConfig] = useState<{
    id: string;
    name: string;
    provider: 'claude' | 'openai' | 'custom';
    baseUrl: string;
    apiKey: string;
    model: string;
    maxTokens: number;
  }>({
    id: '',
    name: '',
    provider: 'custom',
    baseUrl: '',
    apiKey: '',
    model: '',
    maxTokens: 4096,
  });

  // 加载配置
  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/config');
      const result = await response.json();

      if (result.success) {
        setConfigs(result.data.configs);
      }
    } catch (error) {
      showMessage('error', '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // 显示消息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 保存配置
  const saveConfigs = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '1.0.0',
          defaultConfigId: configs[0]?.id || '',
          configs,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage('success', '配置已保存');
      } else {
        showMessage('error', result.error || '保存失败');
      }
    } catch (error) {
      showMessage('error', '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 添加配置
  const addConfig = async () => {
    if (!newConfig.id || !newConfig.baseUrl || !newConfig.apiKey || !newConfig.model) {
      showMessage('error', '请填写所有必填字段');
      return;
    }

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      });

      const result = await response.json();

      if (result.success) {
        setConfigs(result.data.configs);
        setNewConfig({
          id: '',
          name: '',
          provider: 'custom',
          baseUrl: '',
          apiKey: '',
          model: '',
          maxTokens: 4096,
        });
        showMessage('success', '配置已添加');
      } else {
        showMessage('error', result.error || '添加失败');
      }
    } catch (error) {
      showMessage('error', '添加配置失败');
    }
  };

  // 删除配置
  const deleteConfig = async (id: string) => {
    try {
      const response = await fetch(`/api/config?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setConfigs(result.data.configs);
        showMessage('success', '配置已删除');
      } else {
        showMessage('error', result.error || '删除失败');
      }
    } catch (error) {
      showMessage('error', '删除配置失败');
    }
  };

  // 更新配置
  const updateConfig = (id: string, updates: Partial<AIConfig>) => {
    setConfigs(configs.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">设置</h1>
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* AI配置卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">AI服务配置</h2>
            <button
              onClick={saveConfigs}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存更改'}
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* 配置列表 */}
            {configs.map((config) => (
              <div
                key={config.id}
                className="p-4 border border-gray-200 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={config.name || config.id}
                    onChange={(e) => updateConfig(config.id, { name: e.target.value })}
                    className="text-base font-medium text-gray-900 border-0 p-0 focus:ring-0"
                    placeholder="配置名称"
                  />
                  <button
                    onClick={() => deleteConfig(config.id)}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    删除
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">提供商</label>
                    <select
                      value={config.provider}
                      onChange={(e) =>
                        updateConfig(config.id, {
                          provider: e.target.value as AIConfig['provider'],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="claude">Claude</option>
                      <option value="openai">OpenAI</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">模型</label>
                    <input
                      type="text"
                      value={config.model}
                      onChange={(e) => updateConfig(config.id, { model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="claude-3-5-sonnet-20241022"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">API地址</label>
                    <input
                      type="text"
                      value={config.baseUrl}
                      onChange={(e) =>
                        updateConfig(config.id, { baseUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="https://api.anthropic.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">API密钥</label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) =>
                        updateConfig(config.id, { apiKey: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="sk-ant-xxx 或 {{CLAUDE_API_KEY}}"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* 添加新配置 */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">添加新配置</h3>
              <div className="p-4 border border-dashed border-gray-300 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">配置ID</label>
                    <input
                      type="text"
                      value={newConfig.id}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, id: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="my-custom-ai"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">配置名称</label>
                    <input
                      type="text"
                      value={newConfig.name}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="我的自定义AI"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">提供商</label>
                    <select
                      value={newConfig.provider}
                      onChange={(e) =>
                        setNewConfig({
                          ...newConfig,
                          provider: e.target.value as 'claude' | 'openai' | 'custom',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="claude">Claude</option>
                      <option value="openai">OpenAI</option>
                      <option value="custom">自定义</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">模型</label>
                    <input
                      type="text"
                      value={newConfig.model}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, model: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="claude-3-5-sonnet-20241022"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">API地址</label>
                    <input
                      type="text"
                      value={newConfig.baseUrl}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, baseUrl: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="https://api.anthropic.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">API密钥</label>
                    <input
                      type="password"
                      value={newConfig.apiKey}
                      onChange={(e) =>
                        setNewConfig({ ...newConfig, apiKey: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="sk-ant-xxx 或 {{CLAUDE_API_KEY}}"
                    />
                  </div>
                </div>

                <button
                  onClick={addConfig}
                  className="w-full px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                >
                  添加配置
                </button>
              </div>
            </div>

            {/* 环境变量说明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-900 mb-2">
                环境变量支持
              </h4>
              <p className="text-xs text-amber-800">
                API密钥支持环境变量占位符。使用{' '}
                <code className="px-1 py-0.5 bg-amber-100 rounded">
                  {'{{'}变量名{'}'}
                </code>{' '}
                格式，例如{' '}
                <code className="px-1 py-0.5 bg-amber-100 rounded">
                  {'{{'}CLAUDE_API_KEY{'}'}
                </code>
                。系统会自动从环境变量中读取实际值。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg ${
            message.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {message.text}
        </div>
      )}
    </main>
  );
}
