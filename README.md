# 抖音账号分析工具

一个基于代码+AI混合模式的抖音账号数据分析工具。

## 功能

- 上传Excel/CSV文件
- 自动解析和验证数据
- P90/MAD/阈值计算
- AI智能分析
- 生成完整报告(Word/Excel)

## 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 生成Prisma客户端
npx prisma generate

# 推送数据库schema
npx prisma db push

# 启动开发服务器
npm run dev
```

## 部署

- 前端和API: Vercel
- Python图表服务: Railway

## 技术栈

- Next.js 14
- TypeScript
- TailwindCSS
- shadcn/ui
- Prisma
- Claude/OpenAI API
