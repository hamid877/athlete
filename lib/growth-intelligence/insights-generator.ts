/**
 * @file insights-generator.ts
 * @module lib/growth-intelligence
 * @description
 *   Rule-based Insights Generator for the Growth Intelligence engine.
 *
 *   Reads a fully computed `GrowthAnalysisResult` and produces an ordered
 *   list of plain-English insight strings that a UI can display as a coaching
 *   feed, notification list, or summary panel.
 *
 *   Design principles:
 *   ─────────────────
 *   • Pure function — no side effects, no I/O, deterministic output.
 *   • Rule-based only — no AI, no randomness, no hardcoded strings that
 *     bypass score thresholds.
 *   • Each rule fires on score values and status/trend enums, never on raw
 *     database fields — keeping the insight layer decoupled from data schema.
 *   • Rules are self-documenting: every rule object carries a `condition`
 *     description that explains the threshold it guards.
 *   • Future phases can add new rules without changing the generator core.
 *
 * ─── Insight Ordering ─────────────────────────────────────────────────────────
 *   Insights are returned in priority order:
 *     1. Critical warnings (score < 30)
 *     2. Poor warnings (score 30–49)
 *     3. Positive reinforcement (score ≥ 80)
 *     4. Trend signals (improving / declining)
 *     5. Data-quality notices (insufficient data)
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 *   import { generateInsights } from '@/lib/growth-intelligence/insights-generator';
 *   const insights = generateInsights(result);
 *   // → ["Excellent workout consistency.", "Weekly chest volume is below optimal.", ...]
 */

import type { GrowthAnalysisResult, ScoreDetail } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Internal Rule Engine
// ─────────────────────────────────────────────────────────────────────────────

/** Priority level for ordering insights in the output array. */
type InsightPriority =
  | 'critical'   // Score < 30 — immediate attention needed
  | 'warning'    // Score 30–49 — notable gap
  | 'positive'   // Score ≥ 80 — celebrate good results
  | 'trend'      // Trend signal regardless of absolute score
  | 'notice';    // Informational (data quality, neutral observations)

interface Insight {
  text: string;
  priority: InsightPriority;
}

/** Priority sort order — lower number = shown first. */
const PRIORITY_ORDER: Record<InsightPriority, number> = {
  critical: 0,
  warning:  1,
  positive: 2,
  trend:    3,
  notice:   4,
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-Dimension Rule Evaluators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rules for the Consistency Score.
 *
 * Condition table:
 *   value ≥ 80              → positive: "Excellent workout consistency."
 *   value ≥ 65 and < 80     → positive: "Good consistency — keep it up."
 *   value ≥ 50 and < 65     → warning:  "Consistency is fair — try to reduce missed sessions."
 *   value < 50              → warning:  "Consistency needs attention — too many missed sessions."
 *   value < 30              → critical: "Critical consistency gap — significant sessions are being missed."
 *   trend = 'improving'     → trend:    "Consistency trend is improving week over week."
 *   trend = 'declining'     → trend:    "Consistency is declining — recent weeks are below your average."
 */
export function consistencyInsights(score: ScoreDetail): Insight[] {
  const insights: Insight[] = [];
  const { value, trend, confidenceLevel } = score;

  if (confidenceLevel === 'insufficient') {
    insights.push({
      text: 'Not enough sessions yet to evaluate consistency. Keep training!',
      priority: 'notice',
    });
    return insights;
  }

  // Absolute score rules
  if (value >= 80) {
    insights.push({ text: 'Excellent workout consistency.', priority: 'positive' });
  } else if (value >= 65) {
    insights.push({ text: 'Good consistency — keep showing up regularly.', priority: 'positive' });
  } else if (value >= 50) {
    insights.push({
      text: 'Consistency is fair — try to reduce missed sessions this week.',
      priority: 'warning',
    });
  } else if (value >= 30) {
    insights.push({
      text: 'Consistency needs improvement — too many scheduled sessions are being missed.',
      priority: 'warning',
    });
  } else {
    insights.push({
      text: 'Critical consistency gap — you are missing the majority of your planned workouts.',
      priority: 'critical',
    });
  }

  // Trend rules
  if (trend === 'improving') {
    insights.push({
      text: 'Consistency trend is improving — recent weeks are stronger than earlier ones.',
      priority: 'trend',
    });
  } else if (trend === 'declining') {
    insights.push({
      text: 'Consistency is declining — your recent attendance is dropping. Check in on your schedule.',
      priority: 'trend',
    });
  }

  return insights;
}

/**
 * Rules for the Progressive Overload Score.
 *
 * Condition table:
 *   value ≥ 80              → positive: "Progressive overload is on track — your strength is trending upward."
 *   value ≥ 65 and < 80     → positive: "Most lifts are progressing. Minor stalls on some exercises."
 *   value ≥ 50 and < 65     → warning:  "Progressive overload is slowing — most lifts are flat."
 *   value < 50              → warning:  "Progressive overload has stalled across key lifts."
 *   value < 30              → critical: "Regression detected — multiple lifts are declining."
 *   trend = 'improving'     → trend:    "Strength trend is accelerating over recent sessions."
 *   trend = 'declining'     → trend:    "Strength trend is weakening — address the stall before it compounds."
 */
export function progressiveOverloadInsights(score: ScoreDetail): Insight[] {
  const insights: Insight[] = [];
  const { value, trend, confidenceLevel } = score;

  if (confidenceLevel === 'insufficient') {
    insights.push({
      text: 'More sessions needed to evaluate progressive overload trends.',
      priority: 'notice',
    });
    return insights;
  }

  if (value >= 80) {
    insights.push({
      text: 'Progressive overload is on track — your strength is trending upward.',
      priority: 'positive',
    });
  } else if (value >= 65) {
    insights.push({
      text: 'Most lifts are progressing well, with minor stalls on a few exercises.',
      priority: 'positive',
    });
  } else if (value >= 50) {
    insights.push({
      text: 'Progressive overload is slowing down — consider adding small weight increments or rep targets.',
      priority: 'warning',
    });
  } else if (value >= 30) {
    insights.push({
      text: 'Progressive overload has stalled across key exercises — review your programming.',
      priority: 'warning',
    });
  } else {
    insights.push({
      text: 'Strength regression detected on multiple lifts — consider a deload or programme reset.',
      priority: 'critical',
    });
  }

  if (trend === 'improving') {
    insights.push({
      text: 'Strength trend is accelerating — great momentum in recent sessions.',
      priority: 'trend',
    });
  } else if (trend === 'declining') {
    insights.push({
      text: 'Strength trend is weakening across recent sessions — address the stall before it compounds.',
      priority: 'trend',
    });
  }

  return insights;
}

/**
 * Rules for the Weekly Volume Score.
 *
 * Condition table:
 *   value ≥ 80              → positive: "Weekly training volume is well-calibrated for growth."
 *   value ≥ 65 and < 80     → positive: "Weekly volume is good — most muscle groups are adequately stimulated."
 *   value ≥ 50 and < 65     → warning:  "Some muscle groups are below optimal weekly volume."
 *   value < 50              → warning:  "Weekly training volume is below optimal for growth."
 *   value < 30              → critical: "Very low weekly volume — insufficient stimulus for growth."
 *   trend = 'improving'     → trend:    "Weekly volume is increasing — positive training stimulus."
 *   trend = 'declining'     → trend:    "Weekly volume is dropping — monitor for under-training."
 */
export function weeklyVolumeInsights(score: ScoreDetail): Insight[] {
  const insights: Insight[] = [];
  const { value, trend, confidenceLevel } = score;

  if (confidenceLevel === 'insufficient') {
    insights.push({
      text: 'Train more consistently to get a reliable weekly volume score.',
      priority: 'notice',
    });
    return insights;
  }

  if (value >= 80) {
    insights.push({
      text: 'Weekly training volume is well-calibrated for hypertrophy and strength growth.',
      priority: 'positive',
    });
  } else if (value >= 65) {
    insights.push({
      text: 'Weekly volume is good — most muscle groups are receiving adequate stimulus.',
      priority: 'positive',
    });
  } else if (value >= 50) {
    insights.push({
      text: 'Some muscle groups are below optimal weekly volume — consider adding sets for lagging muscles.',
      priority: 'warning',
    });
  } else if (value >= 30) {
    insights.push({
      text: 'Weekly training volume is below optimal for muscle growth.',
      priority: 'warning',
    });
  } else {
    insights.push({
      text: 'Very low weekly volume detected — the training stimulus is insufficient for meaningful growth.',
      priority: 'critical',
    });
  }

  if (trend === 'improving') {
    insights.push({
      text: 'Weekly volume is increasing — good progression in training stimulus.',
      priority: 'trend',
    });
  } else if (trend === 'declining') {
    insights.push({
      text: 'Weekly volume is dropping compared to last week — monitor for unintended under-training.',
      priority: 'trend',
    });
  }

  return insights;
}

/**
 * Rules for the Recovery Score.
 *
 * Condition table:
 *   value ≥ 80              → positive: "Recovery is well-managed — you train fresh."
 *   value ≥ 65 and < 80     → positive: "Recovery is generally good."
 *   value ≥ 50 and < 65     → warning:  "Some sessions started before muscles were fully recovered."
 *   value < 50              → warning:  "You are frequently training under-recovered muscles."
 *   value < 30              → critical: "Severe overtraining risk — muscles consistently under-recovered."
 *   trend = 'improving'     → trend:    "Recovery trend is improving — better fatigue management."
 *   trend = 'declining'     → trend:    "Recovery trend is declining — accumulated fatigue is rising."
 */
export function recoveryInsights(score: ScoreDetail): Insight[] {
  const insights: Insight[] = [];
  const { value, trend, confidenceLevel } = score;

  if (confidenceLevel === 'insufficient') {
    insights.push({
      text: 'More sessions needed to evaluate your recovery quality.',
      priority: 'notice',
    });
    return insights;
  }

  if (value >= 80) {
    insights.push({
      text: 'Recovery is well-managed — most sessions start with muscles fresh and ready.',
      priority: 'positive',
    });
  } else if (value >= 65) {
    insights.push({
      text: 'Recovery is generally good with occasional sessions under slight fatigue.',
      priority: 'positive',
    });
  } else if (value >= 50) {
    insights.push({
      text: 'Some sessions started before muscles were fully recovered. Consider adding rest days.',
      priority: 'warning',
    });
  } else if (value >= 30) {
    insights.push({
      text: 'You are frequently training muscles that have not fully recovered — this limits growth quality.',
      priority: 'warning',
    });
  } else {
    insights.push({
      text: 'Severe overtraining risk — muscles are consistently under-recovered at session start. Rest is needed.',
      priority: 'critical',
    });
  }

  if (trend === 'improving') {
    insights.push({
      text: 'Recovery trend is improving — your fatigue management has been getting better.',
      priority: 'trend',
    });
  } else if (trend === 'declining') {
    insights.push({
      text: 'Recovery trend is declining — accumulated fatigue is building up over recent sessions.',
      priority: 'trend',
    });
  }

  return insights;
}

/**
 * Rules for the Nutrition Score.
 *
 * Condition table:
 *   confidenceLevel = 'insufficient'         → notice: "Log nutrition to unlock this score."
 *   value ≥ 80                               → positive: "Nutrition is well-aligned with your training goals."
 *   value ≥ 65 and < 80                      → positive: "Nutrition is solid — minor tweaks could help."
 *   value ≥ 50 and < 65                      → warning:  "Nutrition could be better aligned with your training."
 *   value < 50                               → warning:  "Calorie or protein intake may be limiting growth."
 *   value < 30                               → critical: "Nutrition is significantly limiting your ability to grow."
 */
export function nutritionInsights(score: ScoreDetail): Insight[] {
  const insights: Insight[] = [];
  const { value, confidenceLevel } = score;

  if (confidenceLevel === 'insufficient') {
    insights.push({
      text: 'Log your protein and calorie intake to unlock personalised nutrition insights.',
      priority: 'notice',
    });
    return insights;
  }

  if (value >= 80) {
    insights.push({
      text: 'Nutrition is well-aligned with your training goals — great fuelling.',
      priority: 'positive',
    });
  } else if (value >= 65) {
    insights.push({
      text: 'Nutrition is solid. Fine-tuning protein or calories could push you to the next level.',
      priority: 'positive',
    });
  } else if (value >= 50) {
    insights.push({
      text: 'Nutrition could be better aligned with your training stimulus.',
      priority: 'warning',
    });
  } else if (value >= 30) {
    insights.push({
      text: 'Calorie or protein intake may be limiting your ability to build muscle and recover.',
      priority: 'warning',
    });
  } else {
    insights.push({
      text: 'Nutrition is significantly limiting growth — prioritise hitting your protein and calorie targets.',
      priority: 'critical',
    });
  }

  return insights;
}

/**
 * Rules for the Overall Growth Score.
 *
 * Generates a summary insight for the composite score.
 *
 * Condition table:
 *   value ≥ 80    → positive: "Your overall growth environment is excellent."
 *   value ≥ 65    → positive: "Strong overall growth conditions with room to improve."
 *   value ≥ 50    → warning:  "Growth conditions are moderate — focus on the lowest-scoring areas."
 *   value < 50    → warning:  "Multiple growth factors need attention."
 *   value < 30    → critical: "Critical gaps are blocking your growth potential."
 */
export function overallInsights(score: ScoreDetail): Insight[] {
  const insights: Insight[] = [];
  const { value } = score;

  if (value >= 80) {
    insights.push({
      text: 'Your overall growth environment is excellent — keep optimising.',
      priority: 'positive',
    });
  } else if (value >= 65) {
    insights.push({
      text: 'Strong overall growth conditions — focus on the areas below optimal to maximise results.',
      priority: 'positive',
    });
  } else if (value >= 50) {
    insights.push({
      text: 'Growth conditions are moderate — addressing the lowest-scoring factors will have the most impact.',
      priority: 'warning',
    });
  } else if (value >= 30) {
    insights.push({
      text: 'Multiple growth factors need attention — prioritise consistency and progressive overload first.',
      priority: 'warning',
    });
  } else {
    insights.push({
      text: 'Critical gaps are significantly blocking your growth potential — start with consistency.',
      priority: 'critical',
    });
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a sorted list of plain-English growth insights from a completed
 * `GrowthAnalysisResult`.
 *
 * Insights are ordered by priority: critical → warning → positive → trend → notice.
 * Within the same priority tier, insights follow the score dimension order:
 *   overall → consistency → progressive overload → weekly volume → recovery → nutrition.
 *
 * @param result - A fully computed `GrowthAnalysisResult`.
 * @returns An ordered array of insight strings. Never empty — always includes
 *          at least the overall growth insight.
 *
 * @example
 * const insights = generateInsights(result);
 * // → [
 * //   "Progressive overload has stalled across key exercises.",
 * //   "Weekly training volume is below optimal for growth.",
 * //   "Recovery trend is improving — better fatigue management.",
 * //   "Log your protein and calorie intake to unlock personalised nutrition insights.",
 * // ]
 */
export function generateInsights(result: GrowthAnalysisResult): string[] {
  const allInsights: Insight[] = [
    ...overallInsights(result.overallGrowthScore),
    ...consistencyInsights(result.consistencyScore),
    ...progressiveOverloadInsights(result.progressiveOverloadScore),
    ...weeklyVolumeInsights(result.weeklyVolumeScore),
    ...recoveryInsights(result.recoveryScore),
    ...nutritionInsights(result.nutritionScore),
  ];

  // Sort: critical first, notices last; stable within same priority
  return allInsights
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .map((i) => i.text);
}
