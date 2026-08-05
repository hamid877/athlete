/**
 * @file types.ts
 * @module lib/growth-intelligence
 * @description
 *   Central type definitions for the Growth Intelligence engine.
 *
 *   Design principles:
 *   ─────────────────
 *   • Every public function in growth-analysis.service.ts uses only
 *     types defined here — keeping the surface area easy to audit.
 *   • Discriminated unions (ScoreStatus, ConfidenceLevel, etc.) allow
 *     future UI code to use exhaustive switch checks.
 *   • Optional fields are marked `?` so Phase 1 stubs can return partial
 *     results and Phase 2+ fills in the rest.
 *   • No Mongoose / React / Next.js imports — this layer is pure TS.
 */

import type { ExperienceLevel, ActivityLevel, GoalType } from '@/types';
import type { WorkoutSessionDTO } from '@/lib/serializers/workoutSession';

// ─────────────────────────────────────────────────────────────────────────────
// Primitive Scalar Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A score value clamped in the range [0, 100].
 * Using a branded type documents intent even though TypeScript treats it as
 * `number` at runtime.
 */
export type Score = number;

/**
 * A confidence value clamped in the range [0, 1].
 */
export type Confidence = number;

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated Unions — Status / Classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Qualitative bucket for any Score (0–100).
 *
 * Threshold mapping lives in `constants.ts → SCORE_THRESHOLDS`.
 */
export type ScoreStatus =
  | 'critical'   // 0–29  — needs immediate attention
  | 'poor'       // 30–49 — below expectations
  | 'fair'       // 50–64 — room for improvement
  | 'good'       // 65–79 — on track
  | 'excellent'; // 80–100 — optimal

/**
 * How reliable the calculated score is, based on available data volume.
 *
 * Threshold mapping lives in `constants.ts → CONFIDENCE_THRESHOLDS`.
 */
export type ConfidenceLevel =
  | 'insufficient' // < 3 sessions — cannot produce meaningful scores
  | 'low'          // 3–7 sessions
  | 'moderate'     // 8–15 sessions
  | 'high'         // 16–29 sessions
  | 'very_high';   // 30+ sessions

/**
 * Week-over-week trend direction of any tracked metric.
 */
export type TrendDirection =
  | 'improving'
  | 'stable'
  | 'declining'
  | 'insufficient_data';

/**
 * High-level category of a coaching recommendation.
 */
export type RecommendationCategory =
  | 'volume'
  | 'intensity'
  | 'recovery'
  | 'nutrition'
  | 'consistency'
  | 'technique'
  | 'programming'
  | 'deload';

/**
 * Urgency tier of a coaching recommendation.
 * Used by the UI to sort and visually distinguish recommendations.
 */
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

// ─────────────────────────────────────────────────────────────────────────────
// Score Detail — Building Block for Every Sub-Score
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A fully-described scored dimension of growth.
 *
 * Every sub-score (consistency, progressive overload, weekly volume,
 * recovery, nutrition) and the overall Growth Score share this shape.
 *
 * @example
 * {
 *   key: 'consistency',
 *   label: 'Consistency Score',
 *   value: 72,
 *   status: 'good',
 *   confidence: 0.85,
 *   confidenceLevel: 'high',
 *   trend: 'improving',
 *   explanation: 'You trained 4 of 5 planned days last week.',
 *   breakdown: { plannedSessions: 5, completedSessions: 4 },
 * }
 */
export interface ScoreDetail {
  /**
   * Machine-readable identifier for the score dimension.
   * Stable across releases so the UI can key off it.
   */
  readonly key: string;

  /** Human-readable label. */
  readonly label: string;

  /** Numeric value clamped [0, 100]. */
  value: Score;

  /** Qualitative bucket derived from `value`. */
  status: ScoreStatus;

  /**
   * Probability-like confidence [0, 1].
   * Reflects how reliable the score is based on available data.
   */
  confidence: Confidence;

  /** Human-readable confidence tier. */
  confidenceLevel: ConfidenceLevel;

  /** Week-over-week trend. */
  trend: TrendDirection;

  /**
   * One-line plain-English explanation suitable for UI display.
   * Phase 2+ will generate this dynamically.
   */
  explanation: string;

  /**
   * Optional structured breakdown of the raw inputs used.
   * Shape is score-specific; typed as `unknown` so each scorer can
   * provide its own payload without polluting the shared interface.
   */
  breakdown?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Muscle-Level Analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-muscle growth potential assessment.
 *
 * Aggregates volume, stimulus, and recovery data for a single muscle group
 * and synthesises them into a growth potential score.
 */
export interface MuscleGrowthDetail {
  /** Canonical muscle name matching `lib/performance/constants.ts`. */
  muscle: string;

  /** Weekly set count over the analysis window. */
  weeklySets: number;

  /** Normalised stimulus score [0, 100] from the stimulus engine. */
  stimulusScore: Score;

  /** Current recovery percentage [0, 100]. */
  recoveryPercent: number;

  /**
   * Composite growth potential score [0, 100].
   * Considers volume adequacy, stimulus quality, and recovery state.
   */
  growthPotentialScore: Score;

  /** Status derived from `growthPotentialScore`. */
  status: ScoreStatus;

  /**
   * Short recommendation for this specific muscle.
   * Phase 2+ generates this contextually.
   */
  recommendation: string;

  /** Whether the muscle is currently limiting overall progress. */
  isBottleneck: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strength Forecast
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A projected strength range for a specific exercise over a future timeframe.
 *
 * Phase 1: structure only.
 * Phase 3+: populated with time-series / regression model output.
 */
export interface StrengthForecast {
  /** Exercise ID (string form of ObjectId). */
  exerciseId: string;

  /** Human-readable exercise name. */
  exerciseName: string;

  /** Current estimated 1-rep max (Epley formula). */
  current1RM: number;

  /**
   * Projected 1RM range after `forecastWeeks` weeks.
   * `min` assumes slow-gainer rate; `max` assumes fast-gainer rate.
   */
  projected1RM: {
    min: number;
    max: number;
  };

  /** Number of weeks the projection covers. */
  forecastWeeks: number;

  /** Confidence in the forecast. Lower confidence = wider interval. */
  confidence: Confidence;

  confidenceLevel: ConfidenceLevel;

  /**
   * Week-by-week trajectory for charting.
   * Each entry: { week: number; min: number; max: number }
   * Phase 2+ fills this; Phase 1 returns [].
   */
  weeklyTrajectory: Array<{
    week: number;
    min: number;
    max: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plateau Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signal emitted when the engine detects a strength or volume plateau.
 *
 * A plateau is defined as:
 *   - No statistically meaningful improvement in e1RM or weekly volume
 *     over `detectionWindowWeeks` consecutive weeks.
 */
export interface PlateauSignal {
  exerciseId: string;
  exerciseName: string;

  /**
   * The metric on which the plateau was detected.
   * - `strength` → e1RM stalled
   * - `volume`   → total weekly volume stalled
   */
  plateauType: 'strength' | 'volume';

  /**
   * Number of consecutive weeks without meaningful progress.
   * Phase 2+ calculates this; Phase 1 defaults to 0.
   */
  weeksSincePeak: number;

  /**
   * Peak value of the metric before the plateau.
   * Units: kg (strength = e1RM, volume = kg·reps total).
   */
  peakValue: number;

  /** Current value of the metric. */
  currentValue: number;

  /**
   * Suggested intervention strategies.
   * Phase 2+ generates these; Phase 1 returns [].
   */
  suggestedInterventions: string[];

  /** Severity of the plateau. */
  severity: 'mild' | 'moderate' | 'severe';
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single actionable coaching recommendation.
 *
 * Recommendations are generated from the full `GrowthAnalysisResult` and
 * represent the highest-value actions the user can take immediately.
 */
export interface GrowthRecommendation {
  /** Unique stable identifier for deduplication / tracking. */
  id: string;

  /** High-level domain this recommendation addresses. */
  category: RecommendationCategory;

  priority: RecommendationPriority;

  /** Short headline (≤ 60 chars). */
  title: string;

  /** Detailed explanation of why this is recommended. */
  message: string;

  /**
   * Concrete step the user should take.
   * Phase 2+ makes this specific to current data.
   */
  action: string;

  /**
   * Optional muscle group or exercise this recommendation targets.
   * `null` when the recommendation is global.
   */
  target: string | null;

  /**
   * Estimated impact if the recommendation is followed (qualitative).
   * Phase 3+ will quantify this.
   */
  estimatedImpact: 'low' | 'medium' | 'high';
}

// ─────────────────────────────────────────────────────────────────────────────
// Input — What the Engine Receives
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete set of data the Growth Analysis engine requires.
 *
 * All fields that come from the database are plain DTOs (no Mongoose
 * Documents) so this layer stays framework-free.
 */
export interface GrowthAnalysisInput {
  // ── User profile context ──────────────────────────────────────────────────

  /** User's planned workout frequency (days per week). */
  plannedWorkoutDaysPerWeek: number;

  experienceLevel: ExperienceLevel;

  activityLevel: ActivityLevel;

  /**
   * User's body weight in kg, used for calorie calculations.
   * `null` if not logged.
   */
  bodyweightKg: number | null;

  /** User's primary fitness goal. `null` if not set. */
  fitnessGoal: GoalType | null;

  // ── Historical workout data ───────────────────────────────────────────────

  /**
   * All completed workout sessions available for analysis.
   * These are already serialised DTOs (strings, not ObjectIds).
   */
  sessions: WorkoutSessionDTO[];

  // ── Time window ───────────────────────────────────────────────────────────

  /**
   * Analysis window start (inclusive).
   * The engine only scores data within [windowStart, windowEnd].
   */
  windowStart: Date;

  /**
   * Analysis window end (inclusive). Defaults to now.
   */
  windowEnd: Date;

  // ── Weight log (optional) ─────────────────────────────────────────────────

  /**
   * Chronological body-weight entries.
   * Used by the Nutrition Score to correlate caloric surplus/deficit
   * with actual weight change.
   */
  weightLog?: Array<{
    date: Date;
    weightKg: number;
  }>;

  // ── Nutrition data (optional, Phase 2+) ──────────────────────────────────

  /**
   * Estimated daily caloric intake (kcal).
   * `null` if not tracked — Nutrition Score will reflect low confidence.
   */
  averageDailyCaloriesKcal?: number | null;

  /**
   * Estimated daily protein intake (grams).
   * `null` if not tracked.
   */
  averageDailyProteinGrams?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output — What the Engine Returns
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The root output of `analyzeGrowth()`.
 *
 * All sub-results are co-located here so UI pages and API routes
 * need only one fetch/call to populate an entire analytics dashboard.
 */
export interface GrowthAnalysisResult {
  // ── Composite score ───────────────────────────────────────────────────────

  /**
   * The headline Growth Score — a weighted composite of all sub-scores.
   * This is the single number the UI surfaces most prominently.
   */
  overallGrowthScore: ScoreDetail;

  // ── Sub-scores ────────────────────────────────────────────────────────────

  /** How consistently the user trains to their planned schedule. */
  consistencyScore: ScoreDetail;

  /** Rate and quality of progressive overload across exercises. */
  progressiveOverloadScore: ScoreDetail;

  /** Adequacy of weekly training volume per muscle group. */
  weeklyVolumeScore: ScoreDetail;

  /** Muscle recovery quality and fatigue management. */
  recoveryScore: ScoreDetail;

  /**
   * Estimated alignment between caloric/protein intake and the training
   * stimulus. Depends on optional nutrition inputs.
   */
  nutritionScore: ScoreDetail;

  // ── Muscle-level breakdown ────────────────────────────────────────────────

  /** Per-muscle growth potential, sorted by `growthPotentialScore` desc. */
  muscleDetails: MuscleGrowthDetail[];

  // ── Forward-looking outputs ───────────────────────────────────────────────

  /** Per-exercise strength projections. Empty in Phase 1. */
  strengthForecasts: StrengthForecast[];

  /** Detected training plateaus. Empty in Phase 1. */
  plateauSignals: PlateauSignal[];

  // ── Coaching layer ────────────────────────────────────────────────────────

  /**
   * Prioritised, actionable recommendations.
   * Sorted: `critical` → `high` → `medium` → `low`.
   */
  recommendations: GrowthRecommendation[];

  /**
   * Plain-English insight strings generated by the rule-based InsightsGenerator.
   * Ordered by priority: critical issues first, positive reinforcement last.
   *
   * Consumers can display these directly in a coaching feed or summary panel.
   */
  insights: string[];

  // ── Result metadata ───────────────────────────────────────────────────────

  /** Metadata about this particular analysis run. */
  meta: GrowthAnalysisMeta;
}

/**
 * Provenance and quality metadata attached to every `GrowthAnalysisResult`.
 */
export interface GrowthAnalysisMeta {
  /** ISO timestamp of when this analysis was computed. */
  computedAt: string;

  /** Analysis window that was used. */
  windowStart: string;
  windowEnd: string;

  /** Number of completed sessions included in the analysis. */
  sessionsAnalyzed: number;

  /** Total training days within the window. */
  trainingDaysAnalyzed: number;

  /**
   * Overall confidence in the result.
   * Reflects the minimum confidence across all sub-scores.
   */
  overallConfidence: Confidence;
  overallConfidenceLevel: ConfidenceLevel;

  /**
   * Engine version string.
   * Increment this when the scoring algorithm changes materially
   * so cached results can be invalidated.
   */
  engineVersion: string;

  /**
   * True when there is not enough data to produce reliable scores.
   * UI should show a progressive learning state.
   */
  insufficientData: boolean;

  /**
   * Human-readable explanation of why `insufficientData` is true.
   * `null` when data is sufficient.
   */
  insufficientDataReason: string | null;

  /** Progressive learning state when data is insufficient */
  learningState?: {
    status: 'learning' | 'active';
    learningProgress: number; // 0-100 percentage
    workoutsCompleted: number;
    workoutsRequired: number;
    estimatedUnlock: string; // ISO date string or human readable
  };
}
