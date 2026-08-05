/**
 * @file route.ts
 * @module app/api/growth-analysis
 * @description
 *   GET /api/growth-analysis
 *
 *   Production-ready API endpoint that exposes the Growth Intelligence engine
 *   to authenticated consumers (mobile clients, internal dashboards, future
 *   AI coaching systems).
 *
 *   ─── Authentication ──────────────────────────────────────────────────────
 *   Reuses the project-standard `auth()` pattern from `lib/auth.ts`.
 *   Unauthenticated requests receive 401 immediately — no DB access occurs.
 *
 *   ─── Query Parameters ────────────────────────────────────────────────────
 *   ?weeks=N   Analysis look-back window in weeks.
 *              Default: 8  |  Min: 2  |  Max: 52
 *              Example: /api/growth-analysis?weeks=12
 *
 *   ─── Response ────────────────────────────────────────────────────────────
 *   200  GrowthAnalysisApiResponse  — full analysis with scores + raw metrics
 *   400  { error: string }          — invalid query parameters
 *   401  { error: 'Unauthorized' }  — missing or invalid session
 *   500  { error: string }          — unexpected server error
 *
 *   ─── Architecture notes ──────────────────────────────────────────────────
 *   • Zero calculation logic lives here. All scoring is delegated to the
 *     existing `analyzeGrowth()` function in:
 *       lib/growth-intelligence/growth-analysis.service.ts
 *
 *   • This file's responsibility is:
 *       1. Auth guard
 *       2. DB queries (User, WorkoutSession, WeightLog)
 *       3. Input assembly (GrowthAnalysisInput)
 *       4. Engine call (analyzeGrowth)
 *       5. Response shaping (GrowthAnalysisResult → GrowthAnalysisApiResponse)
 *
 *   • The response shaping step promotes each scorer's `breakdown` field
 *     (typed as `Record<string, unknown>` internally) into explicit, named
 *     sub-objects (rawMetrics, calculatedValues, metadata) using safe coercion
 *     helpers that default gracefully when breakdown data is absent.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import {
  analyzeGrowth,
  PROGRESSIVE_OVERLOAD_SESSION_WINDOW,
} from '@/lib/growth-intelligence';
import { buildGrowthAnalysisInput } from '@/lib/growth-intelligence/input-builder';
import type {
  GrowthAnalysisApiResponse,
  OverallApiScore,
  ConsistencyApiScore,
  WeeklyVolumeApiScore,
  ProgressiveOverloadApiScore,
  RecoveryApiScore,
  NutritionApiScore,
  MuscleVolumeEntry,
  ExerciseOverloadEntry,
  ProteinMetrics,
  CalorieMetrics,
  OverallBreakdownEntry,
} from './growth-analysis.types';
import type { ScoreDetail } from '@/lib/growth-intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LOOKBACK_WEEKS = 8;
const MIN_LOOKBACK_WEEKS     = 2;
const MAX_LOOKBACK_WEEKS     = 52;

// ─────────────────────────────────────────────────────────────────────────────
// Response Shaping Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely reads a value from a `Record<string, unknown>` breakdown object.
 * Returns `fallback` when the key is absent or the value does not match the
 * expected type.
 */
function fromBreakdown<T>(
  breakdown: Record<string, unknown> | undefined,
  key: string,
  fallback: T,
): T {
  if (!breakdown) return fallback;
  const val = breakdown[key];
  return val !== undefined ? (val as T) : fallback;
}

/** Maps the overall ScoreDetail + meta.engineVersion → OverallApiScore. */
function shapeOverall(
  detail: ScoreDetail,
  engineVersion: string,
): OverallApiScore {
  const breakdown = detail.breakdown as Record<string, unknown> | undefined;
  const rawBreakdown = fromBreakdown<Record<string, unknown>>(
    breakdown,
    'consistency',
    {},
  );

  // The overall breakdown is a map of sub-score keys → { weight, value }
  // We reconstruct it from the breakdown object returned by computeOverallGrowthScore.
  const subKeys = [
    'consistency',
    'progressiveOverload',
    'weeklyVolume',
    'recovery',
    'nutrition',
  ] as const;

  const shapedBreakdown: Record<string, OverallBreakdownEntry> = {};
  for (const k of subKeys) {
    const entry = fromBreakdown<{ weight?: number; value?: number }>(
      breakdown,
      k,
      {},
    );
    shapedBreakdown[k] = {
      weight: typeof entry.weight === 'number' ? entry.weight : 0,
      value:  typeof entry.value  === 'number' ? entry.value  : 0,
    };
  }

  // Suppress unused variable warning — rawBreakdown is only relevant when
  // breakdown has a flat shape (e.g. insufficient-data path has no sub-keys).
  void rawBreakdown;

  return {
    score:       detail.value,
    status:      detail.status,
    trend:       detail.trend,
    explanation: detail.explanation,
    calculatedValues: {
      breakdown: shapedBreakdown,
    },
    metadata: {
      confidenceLevel: detail.confidenceLevel,
      confidence:      detail.confidence,
      engineVersion,
    },
  };
}

/** Maps the consistency ScoreDetail → ConsistencyApiScore. */
function shapeConsistency(detail: ScoreDetail): ConsistencyApiScore {
  const bd = detail.breakdown as Record<string, unknown> | undefined;

  const totalCompleted  = fromBreakdown<number>(bd, 'totalCompletedSessions', 0);
  const plannedPerWeek  = fromBreakdown<number>(bd, 'plannedDaysPerWeek', 0);
  const weeksInWindow   = fromBreakdown<number>(bd, 'weeksInWindow', 0);
  const weightedAdher   = fromBreakdown<number>(bd, 'weightedAdherence', 0);
  const adherByWeek     = fromBreakdown<Record<string, number>>(
    bd,
    'adherenceRatiosByWeek',
    {},
  );

  const scheduledWorkouts = plannedPerWeek * weeksInWindow;
  const completionRate =
    scheduledWorkouts > 0
      ? Math.min(1, Math.round((totalCompleted / scheduledWorkouts) * 1000) / 1000)
      : 0;

  return {
    score:       detail.value,
    status:      detail.status,
    trend:       detail.trend,
    explanation: detail.explanation,
    rawMetrics: {
      completedWorkouts: totalCompleted,
      scheduledWorkouts,
      completionRate,
      weeksInWindow,
      adherenceByWeek: adherByWeek,
    },
    calculatedValues: {
      weightedAdherence: weightedAdher,
    },
    metadata: {
      confidenceLevel:  detail.confidenceLevel,
      confidence:       detail.confidence,
      plannedDaysPerWeek: plannedPerWeek,
    },
  };
}

/** Maps the weekly volume ScoreDetail → WeeklyVolumeApiScore. */
function shapeWeeklyVolume(detail: ScoreDetail): WeeklyVolumeApiScore {
  const bd = detail.breakdown as Record<string, unknown> | undefined;

  const currentWeekSessions = fromBreakdown<number>(bd, 'currentWeekSessions', 0);
  const musclesAnalyzed     = fromBreakdown<number>(bd, 'musclesAnalyzed', 0);
  const optimalMuscleCount  = fromBreakdown<number>(bd, 'optimalMuscleCount', 0);
  const diversityBonus      = fromBreakdown<boolean>(bd, 'diversityBonusApplied', false);
  const optimalSetsRange    = fromBreakdown<{ min: number; max: number }>(
    bd,
    'optimalSetsRange',
    { min: 10, max: 20 },
  );
  const rawMuscleBreakdown  = fromBreakdown<
    Array<{ muscle: string; weeklySets: number; status: string; subScore: number }>
  >(bd, 'muscleBreakdown', []);

  // Coerce to the strictly typed MuscleVolumeEntry array.
  const muscleBreakdown: MuscleVolumeEntry[] = rawMuscleBreakdown.map((m) => ({
    muscle:    m.muscle,
    weeklySets: m.weeklySets,
    status: m.status as MuscleVolumeEntry['status'],
    subScore:  m.subScore,
  }));

  const weeklySets = muscleBreakdown.reduce((sum, m) => sum + m.weeklySets, 0);

  return {
    score:       detail.value,
    status:      detail.status,
    trend:       detail.trend,
    explanation: detail.explanation,
    rawMetrics: {
      weeklySets,
      optimalRange: optimalSetsRange,
      muscleBreakdown,
      currentWeekSessions,
    },
    calculatedValues: {
      optimalMuscleCount,
      diversityBonusApplied: diversityBonus,
      musclesAnalyzed,
    },
    metadata: {
      confidenceLevel: detail.confidenceLevel,
      confidence:      detail.confidence,
    },
  };
}

/** Maps the progressive overload ScoreDetail → ProgressiveOverloadApiScore. */
function shapeProgressiveOverload(detail: ScoreDetail): ProgressiveOverloadApiScore {
  const bd = detail.breakdown as Record<string, unknown> | undefined;

  const experienceLevel = fromBreakdown<string>(bd, 'experienceLevel', 'intermediate');
  const exercisesAnalyzed = fromBreakdown<number>(bd, 'exercisesAnalyzed', 0);
  const effectiveMinRate  = fromBreakdown<number>(bd, 'effectiveMinImprovementRate', 0);
  const rawExercises = fromBreakdown<
    Array<{ name: string; score: number; slope: number; improvementRate: number }>
  >(bd, 'exercises', []);

  const exerciseBreakdown: ExerciseOverloadEntry[] = rawExercises.map((e) => ({
    name:            e.name,
    score:           e.score,
    slope:           e.slope,
    improvementRate: e.improvementRate,
  }));

  const improvedExercises   = exerciseBreakdown.filter((e) => e.score >= 70).length;
  const stalledExercises    = exerciseBreakdown.filter((e) => e.score >= 40 && e.score < 70).length;
  const regressingExercises = exerciseBreakdown.filter((e) => e.score < 40).length;

  return {
    score:       detail.value,
    status:      detail.status,
    trend:       detail.trend,
    explanation: detail.explanation,
    rawMetrics: {
      improvedExercises,
      stalledExercises,
      regressingExercises,
      exerciseBreakdown,
      experienceLevel,
    },
    calculatedValues: {
      effectiveMinImprovementRate: effectiveMinRate,
      exercisesAnalyzed,
    },
    metadata: {
      confidenceLevel: detail.confidenceLevel,
      confidence:      detail.confidence,
      sessionWindow:   PROGRESSIVE_OVERLOAD_SESSION_WINDOW,
    },
  };
}

/** Maps the recovery ScoreDetail → RecoveryApiScore. */
function shapeRecovery(detail: ScoreDetail): RecoveryApiScore {
  const bd = detail.breakdown as Record<string, unknown> | undefined;

  const totalSessions         = fromBreakdown<number>(bd, 'totalCompletedSessions', 0);
  const goodThresholdPct      = fromBreakdown<number>(bd, 'goodRecoveryThresholdPct', 70);
  const sessionsWellRecovered = fromBreakdown<number>(bd, 'sessionsWellRecovered', 0);
  const meanRecovery          = fromBreakdown<number>(bd, 'meanSessionRecoveryScore', 0);
  const deloadBonus           = fromBreakdown<boolean>(bd, 'deloadBonusApplied', false);

  return {
    score:       detail.value,
    status:      detail.status,
    trend:       detail.trend,
    explanation: detail.explanation,
    rawMetrics: {
      averageRecovery:          meanRecovery,
      sessionsWellRecovered,
      totalSessions,
      goodRecoveryThresholdPct: goodThresholdPct,
    },
    calculatedValues: {
      deloadBonusApplied: deloadBonus,
    },
    metadata: {
      confidenceLevel: detail.confidenceLevel,
      confidence:      detail.confidence,
    },
  };
}

/** Maps the nutrition ScoreDetail → NutritionApiScore. */
function shapeNutrition(detail: ScoreDetail): NutritionApiScore {
  const bd = detail.breakdown as Record<string, unknown> | undefined;

  const hasProteinData  = fromBreakdown<boolean>(bd, 'hasProteinData', false);
  const hasCalorieData  = fromBreakdown<boolean>(bd, 'hasCalorieData', false);
  const bodyweightKg    = fromBreakdown<number | null>(bd, 'bodyweightKg', null);
  const weightApplied   = fromBreakdown<{ protein: number; calories: number }>(
    bd,
    'weightApplied',
    { protein: 1.0, calories: 0 },
  );

  // ── Protein ───────────────────────────────────────────────────────────────
  let protein: ProteinMetrics | null = null;
  let proteinScore: number | null = null;

  if (hasProteinData) {
    const rawProtein = fromBreakdown<Record<string, unknown>>(bd, 'protein', {});
    const ps = fromBreakdown<number>(rawProtein, 'proteinScore', 0);
    proteinScore = ps;

    if (typeof rawProtein.actualGrams === 'number') {
      protein = {
        actualGrams:   rawProtein.actualGrams as number,
        targetMinGrams: fromBreakdown<number>(rawProtein, 'targetMinGrams', 0),
        targetMaxGrams: fromBreakdown<number>(rawProtein, 'targetMaxGrams', 0),
        proteinScore:  ps,
      };
    }
  }

  // ── Calories ──────────────────────────────────────────────────────────────
  let calories: CalorieMetrics | null = null;
  let caloricScore: number | null = null;

  if (hasCalorieData) {
    const rawCalories = fromBreakdown<Record<string, unknown>>(bd, 'calories', {});
    const cs = fromBreakdown<number>(rawCalories, 'caloricScore', 0);
    caloricScore = cs;

    if (typeof rawCalories.actualKcal === 'number') {
      calories = {
        actualKcal:     rawCalories.actualKcal as number,
        estimatedTDEE:  fromBreakdown<number>(rawCalories, 'estimatedTDEE', 0),
        surplusRatio:   fromBreakdown<number>(rawCalories, 'surplusRatio', 0),
        goalAlignment:  fromBreakdown<string>(rawCalories, 'goalAlignment', 'unspecified'),
        caloricScore:   cs,
      };
    }
  }

  return {
    score:       detail.value,
    status:      detail.status,
    trend:       detail.trend,
    explanation: detail.explanation,
    rawMetrics: {
      protein,
      calories,
      bodyweightKg,
    },
    calculatedValues: {
      proteinScore,
      caloricScore,
      weightApplied,
    },
    metadata: {
      confidenceLevel: detail.confidenceLevel,
      confidence:      detail.confidence,
      hasProteinData,
      hasCalorieData,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/growth-analysis
 *
 * Returns a full growth analysis for the authenticated user.
 * No request body is required — all inputs are derived from the user's
 * profile and workout history stored in MongoDB.
 */
export async function GET(req: Request): Promise<NextResponse> {
  try {
    // ── Step 1: Authenticate ────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // ── Step 2: Parse & validate query parameters ───────────────────────────
    const { searchParams } = new URL(req.url);
    const weeksParam = searchParams.get('weeks');
    let lookbackWeeks = DEFAULT_LOOKBACK_WEEKS;

    if (weeksParam !== null) {
      const parsed = parseInt(weeksParam, 10);
      if (isNaN(parsed) || parsed < MIN_LOOKBACK_WEEKS || parsed > MAX_LOOKBACK_WEEKS) {
        return NextResponse.json(
          {
            error: `Invalid 'weeks' parameter. Must be an integer between ${MIN_LOOKBACK_WEEKS} and ${MAX_LOOKBACK_WEEKS}.`,
          },
          { status: 400 },
        );
      }
      lookbackWeeks = parsed;
    }

    // ── Step 3: Connect to DB and fetch data ────────────────────────────────
    await connectDB();
    
    // ── Step 4: Assemble GrowthAnalysisInput ────────────────────────────────
    const input = await buildGrowthAnalysisInput(userId, lookbackWeeks);

    // ── Step 8: Run the analysis engine ────────────────────────────────────
    const result = analyzeGrowth(input);

    // ── Step 9: Shape the response ──────────────────────────────────────────
    const response: GrowthAnalysisApiResponse = {
      overall:             shapeOverall(result.overallGrowthScore, result.meta.engineVersion),
      consistency:         shapeConsistency(result.consistencyScore),
      weeklyVolume:        shapeWeeklyVolume(result.weeklyVolumeScore),
      progressiveOverload: shapeProgressiveOverload(result.progressiveOverloadScore),
      recovery:            shapeRecovery(result.recoveryScore),
      nutrition:           shapeNutrition(result.nutritionScore),
      insights:            result.insights,
      recommendations:     result.recommendations,
      muscleDetails:       result.muscleDetails,
      strengthForecasts:   result.strengthForecasts,
      plateauSignals:      result.plateauSignals,
      confidence: {
        level:                  result.meta.overallConfidenceLevel,
        value:                  result.meta.overallConfidence,
        insufficientData:       result.meta.insufficientData,
        insufficientDataReason: result.meta.insufficientDataReason,
      },
      meta: result.meta,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[growth-analysis] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to compute growth analysis' },
      { status: 500 },
    );
  }
}
