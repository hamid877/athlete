/**
 * @file constants.ts
 * @module lib/growth-intelligence
 * @description
 *   Centralised numeric constants for the Growth Intelligence scoring engine.
 *
 *   All tuneable values live here — never scattered across scorer files.
 *   When the science evolves (e.g., new research on optimal weekly volume)
 *   or A/B testing reveals better thresholds, this is the only file that
 *   needs to change.
 */

import type { ScoreStatus, ConfidenceLevel } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Engine Version
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic version of the Growth Analysis engine.
 *
 * Increment MAJOR when scoring algorithm changes break backward-compatibility
 * with cached results.
 * Increment MINOR when new sub-scores are added.
 * Increment PATCH for bug-fixes that don't change score semantics.
 */
export const GROWTH_ENGINE_VERSION = '1.0.0' as const;

// ─────────────────────────────────────────────────────────────────────────────
// Data Sufficiency Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum number of completed workout sessions required before the engine
 * produces scores.  Below this threshold `insufficientData = true` is set
 * and all scores are returned as 0 with `confidenceLevel = 'insufficient'`.
 */
export const MIN_SESSIONS_FOR_ANALYSIS = 3;

/**
 * Minimum number of sessions per exercise required before a strength
 * forecast or plateau signal is emitted for that exercise.
 */
export const MIN_SESSIONS_PER_EXERCISE_FOR_FORECAST = 4;

/**
 * Number of consecutive weeks without ≥ 1 % improvement before a plateau
 * signal is raised.  Phase 2 fills the detection logic.
 */
export const PLATEAU_DETECTION_WINDOW_WEEKS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Score Status Thresholds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a numeric score [0, 100] to a `ScoreStatus` label.
 *
 * Ordered from lowest to highest so the scorer utilities can iterate in
 * reverse and find the first threshold the score satisfies.
 *
 * @example
 * score = 72  → 'good'
 * score = 45  → 'poor'
 */
export const SCORE_THRESHOLDS: ReadonlyArray<{
  readonly min: number;
  readonly status: ScoreStatus;
}> = [
  { min: 0,  status: 'critical'  },
  { min: 30, status: 'poor'      },
  { min: 50, status: 'fair'      },
  { min: 65, status: 'good'      },
  { min: 80, status: 'excellent' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Confidence Thresholds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps total completed session count to a `ConfidenceLevel`.
 *
 * Ordered ascending by `minSessions`.
 */
export const CONFIDENCE_THRESHOLDS: ReadonlyArray<{
  readonly minSessions: number;
  readonly level: ConfidenceLevel;
}> = [
  { minSessions: 0,  level: 'insufficient' },
  { minSessions: 3,  level: 'low'          },
  { minSessions: 8,  level: 'moderate'     },
  { minSessions: 16, level: 'high'         },
  { minSessions: 30, level: 'very_high'    },
] as const;

/**
 * Maps a `ConfidenceLevel` to a numeric confidence value [0, 1].
 * Used when building `ScoreDetail.confidence` from a `ConfidenceLevel`.
 */
export const CONFIDENCE_LEVEL_TO_VALUE: Readonly<Record<ConfidenceLevel, number>> = {
  insufficient: 0.0,
  low:          0.3,
  moderate:     0.55,
  high:         0.80,
  very_high:    0.95,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Overall Growth Score Weights
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Relative weight each sub-score contributes to the overall Growth Score.
 *
 * All values MUST sum to exactly 1.0.
 *
 * Rationale:
 *  - Consistency (0.25): showing up is the single biggest predictor of gains.
 *  - Progressive Overload (0.30): the primary mechanical driver of adaptation.
 *  - Weekly Volume (0.20): total stimulus delivered per muscle.
 *  - Recovery (0.15): quality of adaptation between sessions.
 *  - Nutrition (0.10): supports but doesn't dominate when data is limited.
 */
export const SCORE_WEIGHTS = {
  consistency:        0.25,
  progressiveOverload: 0.30,
  weeklyVolume:       0.20,
  recovery:           0.15,
  nutrition:          0.10,
} as const satisfies Record<string, number>;

// Weight sum: 0.25 + 0.30 + 0.20 + 0.15 + 0.10 = 1.00 ✓
// Verified by unit tests in Phase 2.

// ─────────────────────────────────────────────────────────────────────────────
// Consistency Scorer Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Number of calendar weeks to look back when computing the consistency score.
 * A shorter window is more reactive; a longer window smooths anomalies.
 */
export const CONSISTENCY_LOOKBACK_WEEKS = 8;

/**
 * The minimum adherence ratio (actual / planned sessions) below which
 * the score is capped at 'poor' regardless of other factors.
 */
export const CONSISTENCY_POOR_THRESHOLD_RATIO = 0.5;

// ─────────────────────────────────────────────────────────────────────────────
// Progressive Overload Scorer Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum week-over-week e1RM improvement (as a decimal fraction) to count
 * as "progressing".  Below this the session is scored as "stalled".
 *
 * 0.5 % aligns with the lower bound of `calculateProgressProjection()` in
 * `lib/performance/projections.ts` (0.25 % / week) — intentionally loose
 * so intermittent overload still registers.
 */
export const PROGRESSIVE_OVERLOAD_MIN_IMPROVEMENT_RATE = 0.005;

/**
 * Number of recent sessions per exercise to consider when computing
 * the progressive overload score.
 */
export const PROGRESSIVE_OVERLOAD_SESSION_WINDOW = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Volume Scorer Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-exported reference to the optimal weekly sets window.
 * Aligns with the existing `VOLUME_TARGETS` in `lib/performance/volume.ts`.
 */
export const VOLUME_OPTIMAL_MIN_SETS = 10;
export const VOLUME_OPTIMAL_MAX_SETS = 20;

/**
 * Score applied when a muscle is in the optimal weekly set range [10–20].
 */
export const VOLUME_OPTIMAL_SCORE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Scorer Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimum average recovery percentage across all muscles to score as 'good'.
 */
export const RECOVERY_GOOD_THRESHOLD_PCT = 70;

/**
 * Weight given to lower-body muscles (which have longer recovery windows)
 * in the recovery score aggregation.
 */
export const RECOVERY_LOWER_BODY_WEIGHT = 1.5;

// ─────────────────────────────────────────────────────────────────────────────
// Nutrition Scorer Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recommended daily protein intake per kg of bodyweight (grams).
 * Conservative lower end of ISSN guidelines (1.6–2.2 g/kg).
 */
export const NUTRITION_MIN_PROTEIN_GRAMS_PER_KG = 1.6;

/**
 * Upper end of optimal protein intake.
 */
export const NUTRITION_MAX_PROTEIN_GRAMS_PER_KG = 2.2;

/**
 * Score returned for the nutrition dimension when no nutrition data is
 * provided by the user.  Set intentionally neutral so missing data
 * doesn't unfairly penalise the overall Growth Score.
 */
export const NUTRITION_NO_DATA_SCORE = 50;
