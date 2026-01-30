/**
 * 统一的进度配置 - 所有进度计算的单一数据源
 * 确保进度序列单调递增，分步流程与完整流程对齐
 */

/** 完整流程进度配置 */
export const FULL_FLOW_PROGRESS = {
  /** 解析数据开始 */
  parse_start: 5,
  /** 计算指标完成 */
  calculate_complete: 15,
  /** 账号概况分析完成 */
  account_analysis_complete: 25,
  /** 月度趋势分析完成 */
  monthly_trend_complete: 40,
  /** 爆款视频分析完成 */
  viral_analysis_complete: 55,
  /** 分析阶段完成 */
  analysis_complete: 70,
  /** 选题大纲生成开始 */
  topic_outline_start: 72,
  /** 选题大纲生成完成 */
  topic_outline_complete: 75,
  /** 选题详情生成开始 */
  topic_details_start: 76,
  /** 选题详情生成完成 */
  topic_details_complete: 90,
  /** 图表生成完成 */
  chart_generation_complete: 95,
  /** 任务完成 */
  task_complete: 100,
} as const;

/** 分步流程进度配置（双进度机制：开始进度 + 完成进度） */
export const STEP_FLOW_PROGRESS = {
  /** 步骤0：解析数据 */
  step0_parse_start: 5,        // 步骤开始时设置
  step0_parse_complete: 25,     // 步骤完成时设置

  /** 步骤1：账号概况 */
  step1_account_start: 28,     // 步骤开始时设置
  step1_account_complete: 40,   // 步骤完成时设置

  /** 步骤2：月度趋势 */
  step2_monthly_start: 42,     // 步骤开始时设置
  step2_monthly_complete: 55,   // 步骤完成时设置

  /** 步骤3：爆发期 */
  step3_explosive_start: 57,    // 步骤开始时设置
  step3_explosive_complete: 65, // 步骤完成时设置

  /** 步骤4：爆款分类 */
  step4_viral_start: 67,       // 步骤开始时设置
  step4_viral_complete: 70,     // 步骤完成时设置

  /** 步骤5：方法论 */
  step5_methodology_start: 72,  // 步骤开始时设置
  step5_methodology_complete: 75, // 步骤完成时设置

  /** 步骤6：分步完成，进入选题生成 */
  step6_complete: 76,           // 进入选题生成
} as const;

/**
 * 选题详情进度计算
 * 从 76% 到 90%，共 14 个百分点
 * @param batchIndex 当前批次索引(0-based)
 * @param totalBatches 总批次数
 * @returns 进度百分比
 */
export function calculateTopicDetailsProgress(
  batchIndex: number,
  totalBatches: number
): number {
  const startProgress = STEP_FLOW_PROGRESS.step6_complete; // 76
  const endProgress = FULL_FLOW_PROGRESS.topic_details_complete; // 90
  const range = endProgress - startProgress; // 14

  // 计算当前批次完成后的进度
  // 批次0完成后: 76 + 14 * 1/3 = 80.67 -> 80
  // 批次1完成后: 76 + 14 * 2/3 = 85.33 -> 85
  // 批次2完成后: 76 + 14 * 3/3 = 90
  const completedBatches = batchIndex + 1;
  const progress = startProgress + Math.floor((completedBatches / totalBatches) * range);

  return progress;
}

/**
 * 验证进度是否单调递增
 * @param currentProgress 当前进度
 * @param newProgress 新进度
 * @returns 验证结果
 */
export function validateProgressMonotonic(
  currentProgress: number,
  newProgress: number
): { valid: boolean; reason?: string } {
  if (newProgress < currentProgress) {
    return {
      valid: false,
      reason: `进度倒退: ${currentProgress}% -> ${newProgress}%`,
    };
  }

  if (newProgress > 100) {
    return {
      valid: false,
      reason: `进度超过100%: ${newProgress}%`,
    };
  }

  return { valid: true };
}
