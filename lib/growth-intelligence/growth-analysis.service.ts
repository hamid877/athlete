/**
 * @file growth-analysis.service.ts
 * @module lib/growth-intelligence
 * @description
 *   Growth Analysis Service — the single public API surface for the
 *   Growth Intelligence engine.
 *
 *   ─────────────────────────────────────────────────────────────────────
 *   PHASE 1 — FOUNDATION ONLY
 *   ─────────────────────────────────────────────────────────────────────
 *   Every exported function is a documented stub that:
 *     • Accepts and validates strongly-typed inputs.
 *     • Returns a fully-typed, well-formed output (no `any`, no empty `{}`).
 *     • Contains commentary describing the Phase 2+ algorithm.
 *
 *   Callers (API routes, server actions, future hooks) depend only on this
 *   module — never on individual scorer files.  This means scorers can be
 *   replaced or extended without changing the call sites.
 *   ─────────────────────────────────────────────────────────────────────
 *
 *   Architecture:
 *     ┌──────────────────────────────────────────┐
 *     │  growth-analysis.service.ts  (this file) │  ← callers use this
 *     └──────────────────────┬───────────────────┘
 *                            │ calls
 *     ┌──────────────────────▼───────────────────┐
 *     │  scorers/  (one file per sub-score)       │
 *     │  consistency | progressive-overload       │
 *     │  weekly-volume | recovery | nutrition     │
 *     └──────────────────────┬───────────────────┘
 *                            │ uses primitives from
 *     ┌──────────────────────▼───────────────────┐
 *     │  lib/performance/  (raw calculation layer)│
 *     └──────────────────────────────────────────┘
 */

import type {
  GrowthAnalysisInput,
  GrowthAnalysisResult,
  GrowthAnalysisMeta,
  GrowthRecommendation,
  MuscleGrowthDetail,
  PlateauSignal,
  RecommendationCategory,
  RecommendationPriority,
  ScoreDetail,
  StrengthForecast,
} from './types';

import {
  GROWTH_ENGINE_VERSION,
  MIN_SESSIONS_FOR_ANALYSIS,
  SCORE_WEIGHTS,
  CONFIDENCE_LEVEL_TO_VALUE,
} from './constants';

import {
  clampScore,
  clampConfidence,
  resolveConfidenceLevel,
  resolveScoreStatus,
  buildRecommendationId,
} from './helpers';

import { calculateConsistencyScore } from './scorers/consistency';
import { calculateProgressiveOverloadScore } from './scorers/progressive-overload';
import { calculateWeeklyVolumeScore } from './scorers/weekly-volume';
import { calculateRecoveryScore } from './scorers/recovery';
import { calculateNutritionScore } from './scorers/nutrition';
import { generateInsights } from './insights-generator';

// ─────────────────────────────────────────────────────────────────────────────
// Input Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the shape and sanity of a `GrowthAnalysisInput` before any
 * computation takes place.
 *
 * This is intentionally a structural guard — it does NOT validate business
 * rules (e.g., "are sets realistic?").  Business-level validation lives in
 * the individual scorers.
 *
 * @param input - The caller-provided input object.
 * @returns `{ valid: true }` when the input is acceptable, or
 *          `{ valid: false, errors: string[] }` with a human-readable error
 *          per violation.
 */
export function validateInput(
  input: GrowthAnalysisInput,
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(input.sessions)) {
    errors.push('`sessions` must be an array.');
  }

  if (
    typeof input.plannedWorkoutDaysPerWeek !== 'number' ||
    input.plannedWorkoutDaysPerWeek < 1 ||
    input.plannedWorkoutDaysPerWeek > 7
  ) {
    errors.push(
      '`plannedWorkoutDaysPerWeek` must be a number between 1 and 7.',
    );
  }

  if (!(input.windowStart instanceof Date) || isNaN(input.windowStart.getTime())) {
    errors.push('`windowStart` must be a valid Date.');
  }

  if (!(input.windowEnd instanceof Date) || isNaN(input.windowEnd.getTime())) {
    errors.push('`windowEnd` must be a valid Date.');
  }

  if (
    input.windowStart instanceof Date &&
    input.windowEnd instanceof Date &&
    input.windowStart > input.windowEnd
  ) {
    errors.push('`windowStart` must be before or equal to `windowEnd`.');
  }

  if (
    input.bodyweightKg !== null &&
    (typeof input.bodyweightKg !== 'number' || input.bodyweightKg <= 0)
  ) {
    errors.push('`bodyweightKg` must be a positive number or null.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite Score Computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the Overall Growth Score as a weighted average of all sub-scores.
 *
 * Weights are defined in `constants.ts → SCORE_WEIGHTS`.
 * The confidence of the overall score is the minimum confidence across all
 * sub-scores (the weakest link principle — one low-data domain drags the
 * composite confidence down).
 *
 * @param subScores - The five scorer outputs (order does not matter).
 * @returns A `ScoreDetail` representing the composite Growth Score.
 */
export function computeOverallGrowthScore(
  subScores: readonly [
    ScoreDetail, // consistency
    ScoreDetail, // progressive overload
    ScoreDetail, // weekly volume
    ScoreDetail, // recovery
    ScoreDetail, // nutrition
  ],
): ScoreDetail {
  const [consistency, progressiveOverload, weeklyVolume, recovery, nutrition] =
    subScores;

  const weightedSum =
    consistency.value        * SCORE_WEIGHTS.consistency +
    progressiveOverload.value * SCORE_WEIGHTS.progressiveOverload +
    weeklyVolume.value        * SCORE_WEIGHTS.weeklyVolume +
    recovery.value            * SCORE_WEIGHTS.recovery +
    nutrition.value           * SCORE_WEIGHTS.nutrition;

  const value = clampScore(weightedSum);

  // Weakest-link confidence: the overall score is only as confident as the
  // least-certain sub-score.
  const minConfidence = Math.min(...subScores.map((s) => s.confidence));
  const confidence = clampConfidence(minConfidence);
  const confidenceLevel = resolveConfidenceLevel(
    // Back-compute a virtual session count from confidence for reuse of helper.
    // Phase 2 can refine this to track session counts explicitly per scorer.
    confidence >= CONFIDENCE_LEVEL_TO_VALUE.very_high ? 30
      : confidence >= CONFIDENCE_LEVEL_TO_VALUE.high ? 16
        : confidence >= CONFIDENCE_LEVEL_TO_VALUE.moderate ? 8
          : confidence >= CONFIDENCE_LEVEL_TO_VALUE.low ? 3
            : 0,
  );

  const status = resolveScoreStatus(value);

  return {
    key: 'overall_growth',
    label: 'Growth Score',
    value,
    status,
    confidence,
    confidenceLevel,
    trend: 'insufficient_data', // Phase 2: compare with prior window
    explanation: `Weighted composite of Consistency (${SCORE_WEIGHTS.consistency * 100}%), Progressive Overload (${SCORE_WEIGHTS.progressiveOverload * 100}%), Weekly Volume (${SCORE_WEIGHTS.weeklyVolume * 100}%), Recovery (${SCORE_WEIGHTS.recovery * 100}%), and Nutrition (${SCORE_WEIGHTS.nutrition * 100}%).`,
    breakdown: {
      consistency:        { weight: SCORE_WEIGHTS.consistency,        value: consistency.value },
      progressiveOverload:{ weight: SCORE_WEIGHTS.progressiveOverload, value: progressiveOverload.value },
      weeklyVolume:       { weight: SCORE_WEIGHTS.weeklyVolume,        value: weeklyVolume.value },
      recovery:           { weight: SCORE_WEIGHTS.recovery,            value: recovery.value },
      nutrition:          { weight: SCORE_WEIGHTS.nutrition,           value: nutrition.value },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Muscle Growth Analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyses per-muscle growth potential from completed workout history.
 *
 * Phase 2 algorithm:
 *   1. Call `analyzeWeeklyVolume()` → weekly sets per muscle.
 *   2. Call `calculateAllStimulus()` → normalised stimulus score per muscle.
 *   3. Call `calculateAllRecovery()` → recovery percentage per muscle.
 *   4. Combine the three dimensions into `growthPotentialScore`:
 *        volume_score   = f(weeklySets vs optimal range)  [40 %]
 *        stimulus_score = stimulusScore                   [35 %]
 *        recovery_score = recoveryPercent                 [25 %]
 *   5. Flag muscles as `isBottleneck` if they are ≤ 'fair' status and are
 *      in the user's primary muscle groups (derived from exercise history).
 *
 * @param _input - The full GrowthAnalysisInput context.
 * @returns An array of per-muscle `MuscleGrowthDetail` objects.
 *          Phase 1: Returns an empty array.
 *
 * @remarks
 *   The underscore prefix on `_input` signals that the parameter is
 *   intentionally unused in Phase 1 but will be consumed in Phase 2.
 */
export function analyzeMuscleGrowth(
  input: GrowthAnalysisInput,
): MuscleGrowthDetail[] {
  // Phase 1 placeholder — Phase 2 will populate this array.
  // `input` will be consumed by volume, stimulus, and recovery sub-engines.
  void (input satisfies GrowthAnalysisInput);
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Strength Forecasting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates per-exercise strength projections.
 *
 * Phase 2 algorithm:
 *   1. Filter sessions to those with ≥ MIN_SESSIONS_PER_EXERCISE_FOR_FORECAST
 *      appearances of the same exercise.
 *   2. Compute chronological e1RM series using `calculateEpley1RM()`.
 *   3. Fit a linear regression (via `linearRegressionSlope()`) to the series.
 *   4. Project forward using slope × weeks for the mid-line, then add/subtract
 *      residual standard error for min/max bounds.
 *   5. Delegate to `calculateProgressProjection()` for the weekly trajectory
 *      array already implemented in `lib/performance/projections.ts`.
 *
 * Phase 3+ can replace step 3–4 with a Bayesian or ARIMA model for
 * nonlinear athlete fatigue curves.
 *
 * @param _input - The full GrowthAnalysisInput context.
 * @returns An array of `StrengthForecast` objects, one per trackable exercise.
 *          Phase 1: Returns an empty array.
 */
export function generateStrengthForecasts(
  input: GrowthAnalysisInput,
): StrengthForecast[] {
  // Phase 1 placeholder — Phase 2 will populate this array.
  // `input` will be consumed by the e1RM regression engine.
  void (input satisfies GrowthAnalysisInput);
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Plateau Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects training plateaus across all tracked exercises.
 *
 * Phase 2 algorithm:
 *   1. For each exercise with sufficient history, compute weekly peak e1RM.
 *   2. Determine `weeksSincePeak` by finding the last week with a new peak.
 *   3. If `weeksSincePeak ≥ PLATEAU_DETECTION_WINDOW_WEEKS` → emit a signal.
 *   4. Classify severity:
 *        mild     → 3 weeks
 *        moderate → 4–5 weeks
 *        severe   → 6+ weeks
 *   5. Generate intervention suggestions based on severity + experienceLevel.
 *
 * @param _input - The full GrowthAnalysisInput context.
 * @returns An array of `PlateauSignal` objects.
 *          Phase 1: Returns an empty array.
 */
export function detectPlateaus(
  input: GrowthAnalysisInput,
): PlateauSignal[] {
  // Phase 1 placeholder — Phase 2 will populate this array.
  // `input` will be consumed by the plateau detection window logic.
  void (input satisfies GrowthAnalysisInput);
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a prioritised list of actionable coaching recommendations
 * from a completed `GrowthAnalysisResult`.
 *
 * Algorithm:
 *   1. Evaluate each sub-score against threshold rules.
 *   2. Each rule emits a candidate `GrowthRecommendation`.
 *   3. Candidates are sorted by priority: critical → high → medium → low.
 *   4. Capped at 5 recommendations to avoid overwhelming the user.
 *
 * Recommendation rules:
 *   Consistency < 50   → high:   Missed sessions are the biggest growth inhibitor.
 *   Consistency < 30   → critical: Critical session gaps.
 *   Overload < 50      → high:   Stalled lifts block adaptation.
 *   Overload < 30      → critical: Active regression needs immediate attention.
 *   Weekly volume < 50 → medium: Low volume limits hypertrophic stimulus.
 *   Weekly volume < 30 → high:   Very low volume is insufficient stimulus.
 *   Recovery < 50      → medium: Frequent under-recovery reduces adaptation quality.
 *   Recovery < 30      → high:   Severe fatigue accumulation.
 *   Nutrition < 50 (with data) → low: Nutritional gap limiting recovery/growth.
 *   Nutrition < 30 (with data) → medium: Significant nutritional deficit.
 *
 * @param result - A completed `GrowthAnalysisResult`.
 * @returns Sorted, deduplicated `GrowthRecommendation[]` (max 5).
 */
export function generateRecommendations(
  result: GrowthAnalysisResult,
): GrowthRecommendation[] {
  const candidates: GrowthRecommendation[] = [];

  // ── Helper: push a recommendation candidate ────────────────────────────────
  let recIndex = 0;
  function pushRec(
    category: RecommendationCategory,
    priority: RecommendationPriority,
    title: string,
    message: string,
    action: string,
    target: string | null,
    estimatedImpact: 'low' | 'medium' | 'high',
  ): void {
    candidates.push({
      id: buildRecommendationId(category, target ?? 'global', recIndex++),
      category,
      priority,
      title,
      message,
      action,
      target,
      estimatedImpact,
    });
  }

  // ── Consistency rules ─────────────────────────────────────────────────────
  // Rule: consistency < 30 — critical gap, biggest driver of missed gains
  // Rule: consistency < 50 — high priority, showing up is 80% of the battle
  const cv = result.consistencyScore.value;
  if (cv < 30) {
    pushRec(
      'consistency',
      'critical',
      'Critical consistency gap',
      'You are missing the majority of your planned workouts. Consistent training is the single greatest predictor of long-term gains.',
      'Reduce the number of planned days per week to a sustainable level and commit to hitting every session.',
      null,
      'high',
    );
  } else if (cv < 50) {
    pushRec(
      'consistency',
      'high',
      'Improve workout consistency',
      'Too many planned sessions are being missed. Consistent training is the foundation of progressive overload.',
      'Identify the main barriers preventing you from training and schedule sessions like non-negotiable appointments.',
      null,
      'high',
    );
  }

  // ── Progressive Overload rules ────────────────────────────────────────────
  // Rule: progressive_overload < 30 — active regression, needs immediate fix
  // Rule: progressive_overload < 50 — stall, common and addressable
  const pov = result.progressiveOverloadScore.value;
  if (pov < 30) {
    pushRec(
      'intensity',
      'critical',
      'Strength regression detected',
      'Multiple key lifts are declining. This indicates accumulated fatigue, inadequate recovery, or a programming issue.',
      'Consider a structured deload week, then reassess your working weights and rep targets.',
      null,
      'high',
    );
  } else if (pov < 50) {
    pushRec(
      'programming',
      'high',
      'Progressive overload has stalled',
      'Your lifts are not advancing. Without progressive overload, the body has no reason to adapt and grow.',
      'Apply double-progression: aim to add 1–2 reps per session before increasing weight. Track every set.',
      null,
      'high',
    );
  }

  // ── Weekly Volume rules ───────────────────────────────────────────────────
  // Rule: weekly_volume < 30 — very low, clearly insufficient stimulus
  // Rule: weekly_volume < 50 — below optimal, growth is slowed
  const wv = result.weeklyVolumeScore.value;
  if (wv < 30) {
    pushRec(
      'volume',
      'high',
      'Weekly volume is very low',
      'The total training stimulus across muscle groups is far below the minimum for consistent growth (10+ sets/muscle/week).',
      'Add 1–2 additional working sets per major muscle group and increase session frequency if possible.',
      null,
      'medium',
    );
  } else if (wv < 50) {
    pushRec(
      'volume',
      'medium',
      'Weekly volume below optimal',
      'Some muscle groups are receiving less than the optimal 10–20 sets per week needed for hypertrophy.',
      'Review which muscles are under-trained in your weekly volume breakdown and add targeted sets.',
      null,
      'medium',
    );
  }

  // ── Recovery rules ────────────────────────────────────────────────────────
  // Rule: recovery < 30 — severe overtraining, urgent intervention needed
  // Rule: recovery < 50 — chronic under-recovery reducing quality of sessions
  const rv = result.recoveryScore.value;
  if (rv < 30) {
    pushRec(
      'recovery',
      'high',
      'Severe fatigue accumulation',
      'Muscles are consistently under-recovered at the start of sessions. Training fatigued muscles reduces stimulus quality and raises injury risk.',
      'Insert at least 2 full rest days this week and ensure 7–9 hours of sleep per night.',
      null,
      'high',
    );
  } else if (rv < 50) {
    pushRec(
      'recovery',
      'medium',
      'Recovery quality is low',
      'You are frequently training before muscles have fully recovered, resulting in sub-optimal sessions.',
      'Restructure your weekly split to allow 48–72 hours between sessions targeting the same muscle group.',
      null,
      'medium',
    );
  }

  // ── Nutrition rules ───────────────────────────────────────────────────────
  // Rule: nutrition < 30 (with data) — significant nutritional deficit limiting growth
  // Rule: nutrition < 50 (with data) — nutritional gap holding back recovery/growth
  const nv = result.nutritionScore.value;
  const hasNutritionData = result.nutritionScore.confidenceLevel !== 'insufficient';
  if (hasNutritionData) {
    if (nv < 30) {
      pushRec(
        'nutrition',
        'medium',
        'Nutrition is limiting growth',
        'Your protein or calorie intake is significantly below what is needed to support training adaptation and muscle growth.',
        'Target 1.6–2.2g of protein per kg of bodyweight daily and ensure you are not in a severe caloric deficit.',
        null,
        'high',
      );
    } else if (nv < 50) {
      pushRec(
        'nutrition',
        'low',
        'Improve nutritional alignment',
        'Calorie or protein intake could be better aligned with your training goals, which may be limiting recovery.',
        'Track your daily protein intake and aim to meet the minimum 1.6g/kg target consistently.',
        null,
        'medium',
      );
    }
  }

  // ── Deload recommendation (if overload declining + recovery low) ──────────
  if (
    result.progressiveOverloadScore.trend === 'declining' &&
    result.recoveryScore.value < 60
  ) {
    pushRec(
      'deload',
      'medium',
      'Consider a deload week',
      'Declining strength combined with low recovery suggests accumulated fatigue is blunting your progress.',
      'Take a planned deload week at 50–60% of normal training volume before resuming progressive overload.',
      null,
      'medium',
    );
  }

  // ── Sort and cap ──────────────────────────────────────────────────────────
  const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
    critical: 0,
    high:     1,
    medium:   2,
    low:      3,
  };

  return candidates
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Metadata Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the `GrowthAnalysisMeta` block for a result.
 *
 * Centralised here so the `analyzeGrowth` orchestrator stays clean.
 *
 * @param input         - The original input.
 * @param sessionCount  - Number of completed sessions that were analysed.
 * @param overallScore  - The fully-computed overall score detail.
 * @param insufficient  - Whether data was insufficient.
 * @param reason        - Reason string when `insufficient` is true; null otherwise.
 * @returns A `GrowthAnalysisMeta` object stamped with the current time.
 */
function buildMeta(
  input: GrowthAnalysisInput,
  sessionCount: number,
  overallScore: ScoreDetail,
  insufficient: boolean,
  reason: string | null,
): GrowthAnalysisMeta {
  const trainingDays = new Set(
    input.sessions
      .filter((s) => s.status === 'completed')
      .map((s) => new Date(s.startedAt).toDateString()),
  ).size;

  let learningState: GrowthAnalysisMeta['learningState'];
  if (insufficient) {
    const progress = Math.min(100, Math.round((sessionCount / MIN_SESSIONS_FOR_ANALYSIS) * 100));
    
    // Estimate unlock date based on planned workout days
    const remaining = MIN_SESSIONS_FOR_ANALYSIS - sessionCount;
    const daysPerWeek = input.plannedWorkoutDaysPerWeek || 3;
    const weeksRemaining = Math.ceil(remaining / daysPerWeek);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + (weeksRemaining * 7));

    learningState = {
      status: 'learning',
      learningProgress: progress,
      workoutsCompleted: sessionCount,
      workoutsRequired: MIN_SESSIONS_FOR_ANALYSIS,
      estimatedUnlock: estimatedDate.toISOString(),
    };
  } else {
    learningState = {
      status: 'active',
      learningProgress: 100,
      workoutsCompleted: sessionCount,
      workoutsRequired: MIN_SESSIONS_FOR_ANALYSIS,
      estimatedUnlock: new Date().toISOString(),
    };
  }

  return {
    computedAt: new Date().toISOString(),
    windowStart: input.windowStart.toISOString(),
    windowEnd: input.windowEnd.toISOString(),
    sessionsAnalyzed: sessionCount,
    trainingDaysAnalyzed: trainingDays,
    overallConfidence: overallScore.confidence,
    overallConfidenceLevel: overallScore.confidenceLevel,
    engineVersion: GROWTH_ENGINE_VERSION,
    insufficientData: insufficient,
    insufficientDataReason: reason,
    learningState,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Primary Orchestrator — analyzeGrowth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the full Growth Intelligence analysis pipeline and returns a complete
 * `GrowthAnalysisResult`.
 *
 * This is the **only function callers should import** from this module.
 * All sub-computations are internal.
 *
 * Execution order:
 *   1. Validate input.
 *   2. Guard against insufficient data.
 *   3. Run the five scorers (can be parallelised in Phase 2 with Promise.all).
 *   4. Compute the weighted overall Growth Score.
 *   5. Run muscle, forecast, plateau, and recommendation sub-engines.
 *   6. Assemble and return the result with metadata.
 *
 * @param input - A validated `GrowthAnalysisInput`.
 * @returns A fully-typed `GrowthAnalysisResult`.
 *
 * @throws {Error} If `input` fails structural validation.
 *   Callers should call `validateInput()` first and handle the error state.
 *
 * @example
 * ```ts
 * const validation = validateInput(input);
 * if (!validation.valid) {
 *   console.error(validation.errors);
 *   return;
 * }
 * const result = analyzeGrowth(input);
 * console.log(result.overallGrowthScore.value); // 0 in Phase 1
 * ```
 */
export function analyzeGrowth(
  input: GrowthAnalysisInput,
): GrowthAnalysisResult {
  // ── Step 1: Validate ──────────────────────────────────────────────────────
  const validation = validateInput(input);
  if (!validation.valid) {
    throw new Error(
      `GrowthAnalysisInput validation failed:\n${validation.errors.join('\n')}`,
    );
  }

  // ── Step 2: Insufficient data guard ──────────────────────────────────────
  const completedSessions = input.sessions.filter(
    (s) => s.status === 'completed',
  );
  const sessionCount = completedSessions.length;

  if (sessionCount < MIN_SESSIONS_FOR_ANALYSIS) {
    // Return a minimal but type-safe result with all scores at 0.
    const insufficientScore: ScoreDetail = {
      key: 'overall_growth',
      label: 'Growth Score',
      value: 0,
      status: 'critical',
      confidence: 0,
      confidenceLevel: 'insufficient',
      trend: 'insufficient_data',
      explanation: `At least ${MIN_SESSIONS_FOR_ANALYSIS} completed sessions are required to generate a Growth Score. You have ${sessionCount}.`,
    };

    const subScoreDefaults = (key: string, label: string): ScoreDetail => ({
      key,
      label,
      value: 0,
      status: 'critical',
      confidence: 0,
      confidenceLevel: 'insufficient',
      trend: 'insufficient_data',
      explanation: `Insufficient data (${sessionCount}/${MIN_SESSIONS_FOR_ANALYSIS} sessions).`,
    });

    const result: GrowthAnalysisResult = {
      overallGrowthScore: insufficientScore,
      consistencyScore: subScoreDefaults('consistency', 'Consistency Score'),
      progressiveOverloadScore: subScoreDefaults('progressive_overload', 'Progressive Overload Score'),
      weeklyVolumeScore: subScoreDefaults('weekly_volume', 'Weekly Volume Score'),
      recoveryScore: subScoreDefaults('recovery', 'Recovery Score'),
      nutritionScore: subScoreDefaults('nutrition', 'Nutrition Score'),
      muscleDetails: [],
      strengthForecasts: [],
      plateauSignals: [],
      recommendations: [],
      insights: [],
      meta: buildMeta(
        input,
        sessionCount,
        insufficientScore,
        true,
        `Minimum ${MIN_SESSIONS_FOR_ANALYSIS} completed sessions required. Only ${sessionCount} found.`,
      ),
    };

    return result;
  }

  // ── Step 3: Run sub-scorers ───────────────────────────────────────────────
  // Phase 2: These can be executed concurrently in a server context.
  const consistencyScore         = calculateConsistencyScore(input);
  const progressiveOverloadScore = calculateProgressiveOverloadScore(input);
  const weeklyVolumeScore        = calculateWeeklyVolumeScore(input);
  const recoveryScore            = calculateRecoveryScore(input);
  const nutritionScore           = calculateNutritionScore(input);

  // ── Step 4: Compute overall score ─────────────────────────────────────────
  const overallGrowthScore = computeOverallGrowthScore([
    consistencyScore,
    progressiveOverloadScore,
    weeklyVolumeScore,
    recoveryScore,
    nutritionScore,
  ]);

  // ── Step 5: Run sub-engines ───────────────────────────────────────────────
  const muscleDetails    = analyzeMuscleGrowth(input);
  const strengthForecasts = generateStrengthForecasts(input);
  const plateauSignals   = detectPlateaus(input);

  // ── Step 6: Assemble result ───────────────────────────────────────────────
  const result: GrowthAnalysisResult = {
    overallGrowthScore,
    consistencyScore,
    progressiveOverloadScore,
    weeklyVolumeScore,
    recoveryScore,
    nutritionScore,
    muscleDetails,
    strengthForecasts,
    plateauSignals,
    recommendations: [], // Populated after result is assembled.
    insights: [],        // Populated after result is assembled.
    meta: buildMeta(input, sessionCount, overallGrowthScore, false, null),
  };

  // Recommendations and insights need the full result for cross-score signals.
  result.recommendations = generateRecommendations(result);
  result.insights = generateInsights(result);

  return result;
}
