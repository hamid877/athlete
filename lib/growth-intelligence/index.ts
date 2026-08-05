/**
 * @file index.ts
 * @module lib/growth-intelligence
 * @description
 *   Barrel export for the Growth Intelligence engine.
 *
 *   Callers should import from this file, not from sub-modules:
 *
 *   ```ts
 *   import { analyzeGrowth, validateInput } from '@/lib/growth-intelligence';
 *   import type { GrowthAnalysisResult, ScoreDetail } from '@/lib/growth-intelligence';
 *   ```
 *
 *   ─── What is exported ─────────────────────────────────────────────────────
 *
 *   Types (re-exported for consumers):
 *     GrowthAnalysisInput, GrowthAnalysisResult, GrowthAnalysisMeta,
 *     ScoreDetail, MuscleGrowthDetail, StrengthForecast, PlateauSignal,
 *     GrowthRecommendation, ScoreStatus, ConfidenceLevel, TrendDirection,
 *     RecommendationCategory, RecommendationPriority, Score, Confidence
 *
 *   Constants (exported so tests can assert against canonical values):
 *     GROWTH_ENGINE_VERSION, SCORE_WEIGHTS, SCORE_THRESHOLDS,
 *     CONFIDENCE_THRESHOLDS, MIN_SESSIONS_FOR_ANALYSIS, ...
 *
 *   Service functions (primary public API):
 *     analyzeGrowth, validateInput, computeOverallGrowthScore,
 *     analyzeMuscleGrowth, generateStrengthForecasts, detectPlateaus,
 *     generateRecommendations
 *
 *   Snapshot service (Phase 1 Step 4):
 *     saveGrowthSnapshot, getLatestGrowthSnapshot, getGrowthSnapshotHistory
 *     Type: IGrowthAnalysisSnapshot, SnapshotHistoryOptions
 *
 *   Helper utilities (exported for unit testing in Phase 2):
 *     resolveScoreStatus, resolveConfidenceLevel, clampScore,
 *     clampConfidence, linearRegressionSlope, isoWeekKey, mean,
 *     buildRecommendationId, filterByDateRange
 *
 *   Scorer functions (exported for isolated unit testing only —
 *   production code should go through analyzeGrowth):
 *     calculateConsistencyScore, calculateProgressiveOverloadScore,
 *     calculateWeeklyVolumeScore, calculateRecoveryScore,
 *     calculateNutritionScore
 *
 *   ─── What is NOT exported ──────────────────────────────────────────────────
 *   Internal helpers that are implementation details of the service
 *   (e.g., `buildMeta`, `mapScoreDetail`) are not re-exported here.
 */

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  Score,
  Confidence,
  ScoreStatus,
  ConfidenceLevel,
  TrendDirection,
  RecommendationCategory,
  RecommendationPriority,
  ScoreDetail,
  MuscleGrowthDetail,
  StrengthForecast,
  PlateauSignal,
  GrowthRecommendation,
  GrowthAnalysisInput,
  GrowthAnalysisResult,
  GrowthAnalysisMeta,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────────
export {
  GROWTH_ENGINE_VERSION,
  MIN_SESSIONS_FOR_ANALYSIS,
  MIN_SESSIONS_PER_EXERCISE_FOR_FORECAST,
  PLATEAU_DETECTION_WINDOW_WEEKS,
  SCORE_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
  CONFIDENCE_LEVEL_TO_VALUE,
  SCORE_WEIGHTS,
  CONSISTENCY_LOOKBACK_WEEKS,
  CONSISTENCY_POOR_THRESHOLD_RATIO,
  PROGRESSIVE_OVERLOAD_MIN_IMPROVEMENT_RATE,
  PROGRESSIVE_OVERLOAD_SESSION_WINDOW,
  VOLUME_OPTIMAL_MIN_SETS,
  VOLUME_OPTIMAL_MAX_SETS,
  VOLUME_OPTIMAL_SCORE,
  RECOVERY_GOOD_THRESHOLD_PCT,
  RECOVERY_LOWER_BODY_WEIGHT,
  NUTRITION_MIN_PROTEIN_GRAMS_PER_KG,
  NUTRITION_MAX_PROTEIN_GRAMS_PER_KG,
  NUTRITION_NO_DATA_SCORE,
} from './constants';

// ── Helper utilities ──────────────────────────────────────────────────────────
export {
  resolveScoreStatus,
  resolveConfidenceLevel,
  clampScore,
  clampConfidence,
  linearRegressionSlope,
  isoWeekKey,
  getISOWeekNumber,
  getISOWeekYear,
  mean,
  buildRecommendationId,
  filterByDateRange,
} from './helpers';

// ── Scorer functions (for unit testing) ───────────────────────────────────────
export { calculateConsistencyScore } from './scorers/consistency';
export { calculateProgressiveOverloadScore } from './scorers/progressive-overload';
export { calculateWeeklyVolumeScore } from './scorers/weekly-volume';
export { calculateRecoveryScore } from './scorers/recovery';
export { calculateNutritionScore } from './scorers/nutrition';

// ── Insights Generator ────────────────────────────────────────────────────────
export { generateInsights } from './insights-generator';

// ── Service — primary public API ──────────────────────────────────────────────
export {
  analyzeGrowth,
  validateInput,
  computeOverallGrowthScore,
  analyzeMuscleGrowth,
  generateStrengthForecasts,
  detectPlateaus,
  generateRecommendations,
} from './growth-analysis.service';

// ── Snapshot Service ──────────────────────────────────────────────────────────
export {
  saveGrowthSnapshot,
  getLatestGrowthSnapshot,
  getGrowthSnapshotHistory,
} from './snapshot.service';
export type {
  SnapshotHistoryOptions,
} from './snapshot.service';

// ── Comparison Service ────────────────────────────────────────────────────────
// Note: The enum `TrendDirection` is re-exported as `ComparisonTrendDirection`
// to avoid shadowing the string-union `type TrendDirection` from `./types`.
export {
  TrendDirection as ComparisonTrendDirection,
  ChangeSeverity,
  compareSnapshots,
  compareMetric,
  classifyTrend,
  classifySeverity,
  identifyHighlights,
  generateSummary,
} from './comparison.service';
export type {
  MetricComparison,
  MetricDimensions,
  ComparisonHighlight,
  ComparisonSummary,
  ComparisonMeta,
  SnapshotComparison,
} from './comparison.service';

// ── Velocity Service ──────────────────────────────────────────────────────────
export {
  calculateVelocity,
  calculateAcceleration,
  calculateAverageGrowthRate,
  calculateTrendDirection,
} from './velocity.service';
export type {
  VelocityAnalysis,
} from './velocity.service';

// ── Forecast Service ──────────────────────────────────────────────────────────
export {
  forecastGrowthIndex,
  estimateTimeToTargetGI,
  estimateNextMilestone,
  calculateForecastConfidence,
} from './forecast.service';
export type {
  ForecastAnalysis,
} from './forecast.service';

// ── Muscle Analysis Service ───────────────────────────────────────────────────
export {
  SUPPORTED_MUSCLES,
  calculateGrowthPotential,
  generateRecommendation as generateMuscleRecommendation,
  calculateMuscleTrend,
  analyseMuscleGroup,
  analyseAllMuscles,
} from './muscle-analysis.service';
export type {
  MuscleAnalysis,
} from './muscle-analysis.service';

// ── Coach Engine ──────────────────────────────────────────────────────────────
export {
  generateTrainingReadiness,
  generateRecoveryAdvice,
  generateRecommendations as generateCoachRecommendations,
  generateWeeklySummary,
  generateDailyBrief,
} from './coach.service';
export type {
  DailyBrief,
  WeeklySummary,
  TrainingReadiness,
  RecoveryAdvice,
  CoachAnalysis,
} from './coach.service';
