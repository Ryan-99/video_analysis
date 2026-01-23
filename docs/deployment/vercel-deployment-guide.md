# Vercel 部署手册

**最后更新**: 2025-01-23
**项目**: 抖音账号分析系统

---

## 目录

1. [前置要求](#前置要求)
2. [环境变量配置](#环境变量配置)
3. [Vercel Blob 配置](#vercel-blob-配置)
4. [部署步骤](#部署步骤)
5. [部署后验证](#部署后验证)
6. [常见问题](#常见问题)
7. [回滚指南](#回滚指南)

---

## 前置要求

### 必需账户

- [Vercel 账户](https://vercel.com/signup)
- [GitHub 账户](https://github.com/signup)（用于代码托管）

### 必需工具

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) (推荐 LTS 版本)
- [npm](https://www.npmjs.com/) (随 Node.js 安装)

### AI 服务 API Key

选择至少一个 AI 服务提供商：

| 服务商 | 获取地址 | 说明 |
|--------|----------|------|
| Anthropic Claude | https://console.anthropic.com/ | 推荐，响应质量高 |
| OpenAI GPT | https://platform.openai.com/ | 备用方案 |

---

## 环境变量配置

### 本地开发环境变量

复制 `.env.example` 创建 `.env.local`：

```bash
cp .env.example .env.local
```

### 生产环境变量（在 Vercel 中配置）

登录 [Vercel Dashboard](https://vercel.com/dashboard) 进入项目设置 → **Environment Variables**

| 变量名 | 说明 | 必需 | 示例值 |
|--------|------|:----:|--------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 存储令牌 | ✅ | `vercel_blob_...` |
| `CLAUDE_API_KEY` | Anthropic API Key | ⚠️ | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API Key | ⚠️ | `sk-...` |
| `AI_PROVIDER` | 默认 AI 提供商 | ❌ | `claude` 或 `openai` |

> ⚠️ **注意**: 至少配置一个 AI 服务商的 API Key

---

## Vercel Blob 配置

### 什么是 Vercel Blob

Vercel Blob 是 Vercel 提供的对象存储服务，用于替代本地文件系统。本项目使用 Blob 存储用户上传的 Excel 文件。

### 配置步骤

1. **安装 Vercel Blob 扩展**

   在 Vercel 项目中，进入 **Storage** 标签页，点击 **Link Database**，选择 **Blob**。

2. **创建 Blob 存储**

   - 输入存储名称（如：`tiktok-analyzer-uploads`）
   - 选择区域：推荐 `Hong Kong` 或 `Singapore`
   - 点击 **Create**

3. **获取连接令牌**

   创建完成后，Vercel 会自动添加 `BLOB_READ_WRITE_TOKEN` 环境变量。

4. **验证配置**

   确保环境变量列表中有 `BLOB_READ_WRITE_TOKEN`。

---

## 部署步骤

### 方式一：通过 Vercel CLI（推荐）

1. **安装 Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**

   ```bash
   vercel login
   ```

3. **部署项目**

   在项目根目录执行：

   ```bash
   # 首次部署会引导配置
   vercel

   # 生产环境部署
   vercel --prod
   ```

4. **配置环境变量**

   按照提示输入环境变量的值。

### 方式二：通过 GitHub 集成

1. **推送代码到 GitHub**

   ```bash
   git add .
   git commit -m "feat: 准备 Vercel 部署"
   git push origin master
   ```

2. **在 Vercel 导入项目**

   - 访问 https://vercel.com/new
   - 选择你的 GitHub 仓库
   - 点击 **Import**

3. **配置构建设置**

   Vercel 会自动检测 Next.js 项目，配置如下：

   | 设置项 | 值 |
   |--------|-----|
   | Framework Preset | Next.js |
   | Build Command | `prisma generate && next build` |
   | Output Directory | `.next` |
   | Install Command | `npm install` |

4. **配置环境变量**

   在 Environment Variables 部分添加所有必需的环境变量。

5. **部署**

   点击 **Deploy** 按钮。

---

## 部署后验证

### 1. 检查部署状态

在 Vercel Dashboard 查看 Deployment 状态，确认没有错误。

### 2. 功能测试

访问部署后的域名，测试以下功能：

| 功能 | 测试方法 | 预期结果 |
|------|----------|----------|
| 文件上传 | 上传测试 Excel 文件 | 上传成功，返回文件 URL |
| 列映射配置 | 完成列映射配置 | 进入分析页面 |
| 分析执行 | 提交分析任务 | 任务正常执行 |
| 报告查看 | 查看分析结果 | 正常显示报告 |

### 3. 查看日志

在 Vercel Dashboard → **Logs** 查看实时日志，确认没有错误。

---

## 常见问题

### Q1: 部署失败，提示 "Module not found"

**原因**: 依赖未正确安装

**解决方案**:
1. 检查 `package.json` 依赖是否完整
2. 删除 `node_modules` 和 `package-lock.json`
3. 重新运行 `npm install`

### Q2: 上传文件后分析失败

**原因**: Vercel Blob 未正确配置

**解决方案**:
1. 检查 `BLOB_READ_WRITE_TOKEN` 环境变量是否存在
2. 确认 Vercel Blob 存储已创建并关联
3. 查看 Function Logs 获取详细错误信息

### Q3: AI 分析报错

**原因**: API Key 未配置或无效

**解决方案**:
1. 检查 `CLAUDE_API_KEY` 或 `OPENAI_API_KEY` 是否正确
2. 确认 API Key 有足够的配额
3. 检查 AI 服务商服务状态

### Q4: 分析过程中任务超时

**原因**: Vercel Serverless Function 有执行时间限制

**解决方案**:
1. 当前代码已配置 `maxDuration: 60`（60秒）
2. 如果数据量大，考虑：
   - 分批处理数据
   - 使用 Vercel Cron Jobs 异步处理
   - 迁移到长期运行的后端服务

### Q5: 本地开发和生产环境行为不一致

**原因**: 环境变量不同

**解决方案**:
确保 `.env.local` 和 Vercel 环境变量配置一致。

---

## 回滚指南

### 快速回滚到上一版本

1. 在 Vercel Dashboard 进入项目
2. 点击 **Deployments**
3. 找到之前的成功部署
4. 点击 **Promote to Production**

### 回滚到指定版本

```bash
# 通过 CLI
vercel rollback [deployment-url]
```

---

## 费用说明

### Vercel 免费套餐限制

| 项目 | 限制 |
|------|------|
| 带宽 | 100 GB/月 |
| Serverless Function 执行时间 | 10秒（Hobby）/ 60秒（Pro） |
| Vercel Blob 存储 | 500 GB |
| Vercel Blob 带宽 | 1 TB/月 |

### 何时需要升级

- 超出免费带宽限制
- 需要更长的 Function 执行时间
- 需要更多 Blob 存储

---

## 技术支持

遇到问题？按以下步骤排查：

1. **查看日志**: Vercel Dashboard → Logs
2. **检查环境变量**: 确保所有必需变量已配置
3. **检查 Blob 存储**: 确认 Blob 存储正常运行
4. **本地测试**: 确认代码在本地环境正常运行

如需进一步帮助，请提供：
- 错误日志截图
- 部署 URL
- 具体操作步骤
