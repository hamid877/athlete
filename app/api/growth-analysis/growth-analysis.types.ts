/**
 * @file growth-analysis.types.ts
 * @module app/api/growth-analysis
 * @description
 *   Strongly typed shapes for the GET /api/growth-analysis response.
 *
 *   Design notes:
 *   ─────────────────────────────────────────────────────────────────────────
 *   • These types EXTEND the engine's output — they never redefine scoring
 *     logic or duplicate constants. All score values originate from
 *     `analyzeGrowth()` in `lib/growth-intelligence/growth-analysis.service.ts`.
 *
 *   • Every category exposes three sub-objects:
 *       rawMetrics       — the un-transformed observations fed into the scorer
 *       calculatedValues — derived quantities the scorer computed
 *       metadata         — confidence, window, version context
 *
 *   • Exposing rawMetrics alongside scores is intentional. Future AI coaching
 *     and prediction systems (Phase 2+) will consume these directly to:
 *       – Build time-series features for ML models
 *       – Generate personalised narrative explanations
 *       – Cross-correlate nutrition ↔ recovery ↔ volume signals
 *       – Detect patterns invisible at the score level
 *
 *   • No `any`, no `unknown` on public fields — every field is precisely typed
 *     so consumers get full IntelliSense and TypeScript catches mismatches.
 */

import type {
  ScoreStatus,
  ConfidenceLevel,
  TrendDirection,
  GrowthRecommendation,
  MuscleGrowthDetail,
  StrengthForecast,
  PlateauSignal,
  GrowthAnalysisMeta,
} from '@/lib/growth-intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Primitives
// ─────────────────────────────────────────────────────────────────────────────

/** Common score envelope shared by every category. */
interface BaseApiScore {
  /** Numeric score clamped [0, 100]. */
  score: number;
  /** Qualitative status bucket. */
  status: ScoreStatus;
  /** Week-over-week trend direction. */
  trend: TrendDirection;
  /** One-line plain-English explanation. */
  explanation: string;
}

/** Confidence metadata block shared by every category. */
interface ConfidenceMeta {
  /** Human-readable confidence tier. */
  confidenceLevel: ConfidenceLevel;
  /** Numeric confidence [0, 1]. */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overall Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-dimension weight+value pair used in the composite score calculation.
 * Exposed so AI systems can understand how each sub-score contributes.
 */
export interface OverallBreakdownEntry {
  /** Relative weight this dimension contributes to the composite (0–1). */
  weight: number;
  /** The sub-score value that was weighted (0–100). */
  value: number;
}

/** The composite Growth Score with its constituent weights exposed. */
export interface OverallApiScore extends BaseApiScore {
  calculatedValues: {
    /**
     * Per-dimension weight and input score used to compute the composite.
     * Keys: consistency | progressiveOverload | weeklyVolume | recovery | nutrition
     */
    breakdown: Record<string, OverallBreakdownEntry>;
  };
  metadata: ConfidenceMeta & {
    /** Semantic version of the engine that produced this result. */
    engineVersion: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Consistency Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consistency Score — how reliably the user trained against their planned
 * schedule across the analysis window.
 */
export interface ConsistencyApiScore extends BaseApiScore {
  rawMetrics: {
    /** Total completed workout sessions in the window. */
    completedWorkouts: number;
    /**
     * Total scheduled workouts (plannedDaysPerWeek × weeksInWindow).
     * The denominator of the completion rate.
     */
    scheduledWorkouts: number;
    /**
     * Simple completion ratio (completedWorkouts / scheduledWorkouts), capped at 1.
     * Distinct from weightedAdherence — this is the unweighted raw ratio.
     */
    completionRate: number;
    /** Number of ISO weeks covered by the analysis window. */
    weeksInWindow: number;
    /**
     * Per-ISO-week adherence ratios (e.g. { "2025-W03": 0.75, "2025-W04": 1.0 }).
     * Ideal input for time-series models.
     */
    adherenceByWeek: Record<string, number>;
  };
  calculatedValues: {
    /**
     * Exponentially recency-weighted adherence ratio.
     * Recent weeks are weighted more heavily than older weeks (λ = 0.15).
     * This is the value that directly maps to the score.
     */
    weightedAdherence: number;
  };
  metadata: ConfidenceMeta & {
    /** Planned workout days per week (user profile setting). */
    plannedDaysPerWeek: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Volume Score
// ─────────────────────────────────────────────────────────────────────────────

/** Per-muscle volume entry within the weekly volume breakdown. */
export interface MuscleVolumeEntry {
  /** Muscle name (matches canonical names in lib/performance/constants.ts). */
  muscle: string;
  /** Total completed sets for this muscle in the last 7 days. */
  weeklySets: number;
  /** Volume status classification. */
  status: 'Optimal' | 'High' | 'Low' | 'Very Low' | 'Excessive';
  /** Numeric sub-score mapped from the status (0–100). */
  subScore: number;
}

/**
 * Weekly Volume Score — adequacy of weekly training volume per muscle group
 * against evidence-based optimal ranges (10–20 sets/muscle/week).
 */
export interface WeeklyVolumeApiScore extends BaseApiScore {
  rawMetrics: {
    /** Total completed sets across all tracked muscles in the last 7 days. */
    weeklySets: number;
    /** Evidence-based optimal set range for hypertrophy stimulus. */
    optimalRange: { min: number; max: number };
    /** Per-muscle breakdown of sets, status, and sub-score. */
    muscleBreakdown: MuscleVolumeEntry[];
    /** Number of completed sessions in the most recent 7-day period. */
    currentWeekSessions: number;
  };
  calculatedValues: {
    /** Number of muscle groups currently in the Optimal (10–20 sets) range. */
    optimalMuscleCount: number;
    /**
     * Whether the +5 diversity bonus was applied.
     * The bonus fires when ≥ 4 muscle groups are in the Optimal range,
     * rewarding balanced full-body training.
     */
    diversityBonusApplied: boolean;
    /** Total muscles analysed in this snapshot. */
    musclesAnalyzed: number;
  };
  metadata: ConfidenceMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Progressive Overload Score
// ─────────────────────────────────────────────────────────────────────────────

/** Per-exercise progressive overload entry. */
export interface ExerciseOverloadEntry {
  /** Exercise name. */
  name: string;
  /** Individual exercise score [0–100]. */
  score: number;
  /**
   * Linear regression slope over the e1RM time series (kg per session).
   * Positive = progressing; negative = regressing.
   */
  slope: number;
  /**
   * Dimensionless improvement rate (slope / initial e1RM).
   * Normalised so the figure is comparable across exercises regardless of
   * absolute weight used.
   */
  improvementRate: number;
}

/**
 * Progressive Overload Score — rate and quality of load/volume progression
 * across all tracked exercises.
 */
export interface ProgressiveOverloadApiScore extends BaseApiScore {
  rawMetrics: {
    /** Exercises with score ≥ 70 (progressing at or above target rate). */
    improvedExercises: number;
    /** Exercises with score 40–69 (flat — maintaining but not advancing). */
    stalledExercises: number;
    /** Exercises with score < 40 (regressing). */
    regressingExercises: number;
    /** Per-exercise details including e1RM regression slope and improvement rate. */
    exerciseBreakdown: ExerciseOverloadEntry[];
    /** User experience level used to adjust the minimum improvement rate target. */
    experienceLevel: string;
  };
  calculatedValues: {
    /**
     * Effective minimum improvement rate after experience-level adjustment.
     * Beginners × 2.0 | Intermediate × 1.0 | Advanced × 0.5
     */
    effectiveMinImprovementRate: number;
    /** Total exercises with sufficient data (≥ 2 sessions) to score. */
    exercisesAnalyzed: number;
  };
  metadata: ConfidenceMeta & {
    /** Max number of recent sessions per exercise used in the regression. */
    sessionWindow: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recovery Score — quality of inter-session muscle recovery as measured by
 * the recovery state of trained muscles at the start of each session.
 */
export interface RecoveryApiScore extends BaseApiScore {
  rawMetrics: {
    /**
     * Mean muscle recovery percentage across all sessions in the window.
     * 100 = every session started with fully recovered muscles.
     */
    averageRecovery: number;
    /** Sessions where trained muscles were ≥ goodRecoveryThresholdPct recovered. */
    sessionsWellRecovered: number;
    /** Total sessions analysed. */
    totalSessions: number;
    /**
     * The minimum recovery percentage considered "well recovered".
     * Default: 70 % (from RECOVERY_GOOD_THRESHOLD_PCT).
     */
    goodRecoveryThresholdPct: number;
  };
  calculatedValues: {
    /**
     * Whether a deload week (+5 bonus) was detected in the analysis window.
     * A deload week has ≤ 1 completed session.
     */
    deloadBonusApplied: boolean;
  };
  metadata: ConfidenceMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nutrition Score
// ─────────────────────────────────────────────────────────────────────────────

/** Protein-specific metrics when protein data is available. */
export interface ProteinMetrics {
  /** Actual daily protein intake in grams. */
  actualGrams: number;
  /** Lower target (1.6 g/kg bodyweight). */
  targetMinGrams: number;
  /** Upper target (2.2 g/kg bodyweight — ISSN upper optimal). */
  targetMaxGrams: number;
  /** Computed protein sub-score [0–100]. */
  proteinScore: number;
}

/** Calorie-specific metrics when calorie data is available. */
export interface CalorieMetrics {
  /** Actual daily caloric intake (kcal). */
  actualKcal: number;
  /** Estimated TDEE based on activity level × bodyweight (kcal). */
  estimatedTDEE: number;
  /** Ratio of actual intake to estimated TDEE (> 1 = surplus, < 1 = deficit). */
  surplusRatio: number;
  /** User's fitness goal used for goal-alignment scoring. */
  goalAlignment: string;
  /** Computed caloric adequacy sub-score [0–100]. */
  caloricScore: number;
}

/**
 * Nutrition Score — alignment between estimated caloric/protein intake and the
 * demands of the training stimulus.
 *
 * Note: confidence is 'insufficient' when no nutrition data has been logged.
 * The score defaults to 50 (neutral) in that case to avoid penalising the
 * overall Growth Score when data is simply missing.
 */
export interface NutritionApiScore extends BaseApiScore {
  rawMetrics: {
    /** Protein metrics — null when no protein data was provided. */
    protein: ProteinMetrics | null;
    /** Calorie metrics — null when no calorie data was provided. */
    calories: CalorieMetrics | null;
    /** User's body weight in kg — null if not logged. */
    bodyweightKg: number | null;
  };
  calculatedValues: {
    /** Final protein sub-score — null when protein data is missing. */
    proteinScore: number | null;
    /** Final caloric adequacy sub-score — null when calorie data is missing. */
    caloricScore: number | null;
    /** Blending weights applied to compute the final score. */
    weightApplied: {
      /** Protein weight (0.70 when calories available, 1.0 otherwise). */
      protein: number;
      /** Caloric weight (0.30 when calories available, 0 otherwise). */
      calories: number;
    };
  };
  metadata: ConfidenceMeta & {
    /** Whether daily protein grams were provided. */
    hasProteinData: boolean;
    /** Whether daily calorie intake was provided. */
    hasCalorieData: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top-level confidence summary for the entire analysis run.
 * Uses the weakest-link principle: the result is only as confident as the
 * least-certain sub-score.
 */
export interface ConfidenceSummary {
  /** Overall confidence level (weakest sub-score determines this). */
  level: ConfidenceLevel;
  /** Numeric confidence [0, 1]. */
  value: number;
  /**
   * True when there is insufficient data for any meaningful scores.
   * Consumers should show an onboarding / "collect more data" state.
   */
  insufficientData: boolean;
  /** Human-readable explanation when `insufficientData` is true. Null otherwise. */
  insufficientDataReason: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root API Response
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete, strongly typed response body of `GET /api/growth-analysis`.
 *
 * Structure mirrors the engine's `GrowthAnalysisResult` but elevates each
 * scorer's `breakdown` into explicit, named sub-objects (rawMetrics,
 * calculatedValues, metadata) so consumers never need to cast `unknown`.
 *
 * @example
 * const res = await fetch('/api/growth-analysis');
 * const data: GrowthAnalysisApiResponse = await res.json();
 * console.log(data.consistency.rawMetrics.completedWorkouts);
 * console.log(data.weeklyVolume.rawMetrics.muscleBreakdown);
 */
export interface GrowthAnalysisApiResponse {
  /** Composite weighted Growth Score with sub-score weight breakdown. */
  overall: OverallApiScore;

  /** Workout adherence to the planned schedule. */
  consistency: ConsistencyApiScore;

  /** Weekly training volume adequacy per muscle group. */
  weeklyVolume: WeeklyVolumeApiScore;

  /** Rate of strength/load progression across exercises. */
  progressiveOverload: ProgressiveOverloadApiScore;

  /** Quality of inter-session muscle recovery. */
  recovery: RecoveryApiScore;

  /**
   * Alignment of protein and calorie intake with the training stimulus.
   * Confidence is 'insufficient' when no nutrition data has been logged.
   */
  nutrition: NutritionApiScore;

  /**
   * Rule-based coaching insights, ordered by priority:
   * critical → warning → positive → trend → notice.
   */
  insights: string[];

  /** Prioritised, actionable coaching recommendations (max 5). */
  recommendations: GrowthRecommendation[];

  /** Per-muscle growth potential. Empty in Phase 1. */
  muscleDetails: MuscleGrowthDetail[];

  /** Per-exercise strength projections. Empty in Phase 1. */
  strengthForecasts: StrengthForecast[];

  /** Detected training plateaus. Empty in Phase 1. */
  plateauSignals: PlateauSignal[];

  /** Top-level confidence summary using the weakest-link principle. */
  confidence: ConfidenceSummary;

  /**
   * Provenance and quality metadata:
   * computedAt, windowStart, windowEnd, sessionsAnalyzed, engineVersion, …
   */
  meta: GrowthAnalysisMeta;
}
