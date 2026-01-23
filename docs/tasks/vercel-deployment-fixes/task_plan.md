# Vercel 部署修复计划

**创建时间**: 2025-01-24
**目标**: 修复 Vercel 部署中的多个问题

---

## 问题列表

1. ❌ **网络错误**: `NetworkError when attempting to fetch resource` - 前端调用 `/api/jobs/process` 失败
2. ❌ **选题生成超时**: 需要将超时时间从 60 秒改回 300 秒
3. ❌ **日志功能失效**: 内存日志在 Vercel Serverless 中无法工作
4. ❌ **环境兼容性**: 检查其他与 Vercel 不兼容的代码

---

## 阶段规划

### 阶段 1: 诊断网络错误 [进行中]

**问题**: 前端调用 `/api/jobs/process` 返回 NetworkError

**可能原因**:
- Vercel Blob URL 在前端请求时被 CORS 阻止
- `/api/jobs/process` 请求超时
- Vercel 函数执行时间超过限制

**诊断步骤**:
- [ ] 检查 `/api/jobs/process` 的 CORS 配置
- [ ] 检查前端 fetch 调用是否正确
- [ ] 查看 Vercel 日志中的错误信息

**解决方案**:
- 前端不应等待 `/api/jobs/process` 响应
- 改为后台触发，前端只轮询任务状态

---

### 阶段 2: 修复选题生成超时

**目标**: 将每批选题生成超时改回 300 秒

**修改文件**:
- `src/lib/ai-analysis/service.ts`

**注意事项**:
- 需要增加整体任务超时时间
- 或使用不同的架构（分批提交任务）

---

### 阶段 3: 实现数据库日志

**目标**: 将内存日志改为数据库存储

**实现方案**:
1. 在 Prisma Schema 中添加 `AnalysisLog` 模型
2. 修改 `AnalysisLogger` 类使用数据库
3. 更新 `/api/logs/[taskId]` 从数据库读取

---

### 阶段 4: 检查环境兼容性

**检查项**:
- [ ] 文件系统操作 (fs/promises)
- [ ] 内存缓存/Map
- [ ] 环境变量配置
- [ ] Blob URL 处理

---

## 错误日志

### 错误 1: NetworkError
```
加载数据失败: TypeError: NetworkError when attempting to fetch resource.
[HomePage] 调用后台处理失败: TypeError: NetworkError when attempting to fetch resource.
```

**尝试 1**: 检查前端 fetch 调用
**状态**: 待处理

---

## 文件清单

- `task_plan.md` - 本文件
- `findings.md` - 研究发现
- `progress.md` - 进度日志
