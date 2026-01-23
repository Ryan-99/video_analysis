import Anthropic from '@anthropic-ai/sdk';
import { VideoData, AccountAnalysis } from '@/types';

/**
 * Claude AI服务客户端
 * 增加超时配置以防止请求挂起
 */
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
  timeout: 60000, // 60秒超时
  maxRetries: 2,
});

/**
 * 使用Claude分析账号
 * @param videos 视频数据数组
 * @returns 账号分析结果
 */
export async function analyzeAccount(videos: VideoData[]): Promise<AccountAnalysis> {
  // 取前20个视频标题进行分析
  const titles = videos.map(v => v.title).slice(0, 20).join('\n');

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `分析以下抖音视频并返回JSON格式结果。请分析账号的名称、类型、受众、核心话题以及三个层级的变现方式。

视频标题列表：
${titles}

请返回以下JSON格式（不要包含其他文字说明）：
{
  "name": "账号名称",
  "type": "账号类型",
  "audience": "目标受众",
  "coreTopic": "核心话题",
  "monetization": {
    "level1": "初级变现方式",
    "level2": "中级变现方式",
    "level3": "高级变现方式"
  }
}`,
        },
      ],
    });

    // 提取返回的JSON
    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/) || [text];
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Claude API 调用失败:', error);
    throw error;
  }
}
