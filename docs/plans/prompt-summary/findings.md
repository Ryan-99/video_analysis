# 研究发现 - Prompt 汇总

创建时间: 2025-01-23

## Prompt 存储位置

**统一配置文件**: `src/config/prompts.json`

所有 prompt 都通过 `src/lib/prompts/index.ts` 的 `promptEngine` 统一管理。

## Prompt 使用位置

| Prompt Key | 使用位置 | 用途 |
|------------|----------|------|
| `account_overview` | `ai-analysis/service.ts:108` | 分析账号概况 |
| `monthly_trend` | `ai-analysis/service.ts:134` | 分析月度趋势 |
| `viral_analysis` | `ai-analysis/service.ts:160` | 分析爆款视频 |
| `topic_outline_generation` | `ai-analysis/service.ts:191` | 生成30条选题大纲 |
| `topic_detail_generation` | `ai-analysis/service.ts:271` | 生成选题详情 |

## Prompt 列表

### 1. account_overview - 账号概况分析

**变量**: `video_titles` (视频标题列表)

**输出**: JSON
```json
{
  "name": "账号昵称",
  "type": "账号类型",
  "coreTopic": "核心主题",
  "audience": "目标受众",
  "monetization": {
    "level1": "初级变现方式",
    "level2": "中级变现方式",
    "level3": "高级变现方式"
  }
}
```

---

### 2. monthly_trend - 月度趋势分析

**变量**:
- `monthly_data` (月度统计数据)
- `viral_data` (爆款视频数据)

**输出**: JSON
```json
{
  "summary": "趋势总结",
  "stages": [
    {"type": "探索期", "period": "2024-01至2024-03", "description": "..."}
  ]
}
```

---

### 3. viral_analysis - 爆款视频分析

**变量**:
- `viral_videos` (爆款视频列表)
- `threshold` (爆款判定阈值)

**输出**: JSON
```json
{
  "summary": "爆款总结",
  "byCategory": [
    {"category": "分类名称", "count": 5, "avgEngagement": 50000, "description": "特征描述"}
  ],
  "patterns": {
    "commonElements": "共同元素",
    "timingPattern": "时间规律",
    "titlePattern": "标题规律"
  }
}
```

---

### 4. topic_outline_generation - 选题大纲生成

**变量**:
- `core_topic` (核心主题)
- `account_type` (账号类型)
- `audience` (目标受众)
- `viral_categories` (爆款分类结果)
- `viral_patterns` (爆款规律)

**输出**: JSON (30条选题大纲)
```json
{
  "topics": [
    {"id": 1, "category": "原生家庭/创伤疗愈", "titles": ["本质句标题", "反常识标题", "清单承诺标题"]}
  ]
}
```

---

### 5. topic_detail_generation - 选题详情生成

**变量**:
- `core_topic` (核心主题)
- `viral_patterns` (爆款规律)
- `topic_outlines` (选题大纲列表)

**输出**: JSON (口播稿、分镜、案例)
```json
{
  "topics": [
    {
      "id": 1,
      "script": "5段式口播稿...",
      "storyboard": ["镜头1", "镜头2", "镜头3", "镜头4"],
      "casePoint": "案例点位..."
    }
  ]
}
```

## 结论

✅ 所有 prompt 已统一存储在 `src/config/prompts.json` 中
✅ 所有 prompt 通过 `promptEngine.render()` 统一调用
✅ 没有发现硬编码的 prompt
