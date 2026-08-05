/**
 * @file scorers/nutrition.ts
 * @module lib/growth-intelligence/scorers
 * @description
 *   Nutrition Score — estimates how well the user's nutrition supports their
 *   training stimulus, based on protein intake, caloric context, and goal
 *   alignment.
 *
 * ─── Scoring Formula ─────────────────────────────────────────────────────────
 *
 *   Guard: If neither protein nor calorie data is provided →
 *     Return NUTRITION_NO_DATA_SCORE (50) with confidence = 0.
 *     This prevents missing data from unfairly penalising the overall Growth Score.
 *
 *   1. Protein Score (weight: 70 % of final score):
 *
 *        targetMin = bodyweightKg × NUTRITION_MIN_PROTEIN_GRAMS_PER_KG  (1.6 g/kg)
 *        targetMax = bodyweightKg × NUTRITION_MAX_PROTEIN_GRAMS_PER_KG  (2.2 g/kg)
 *
 *        If bodyweightKg is null → use a neutral protein score of 50 with note.
 *
 *        ratio = actualProtein / targetMin
 *        ratio ≥ (targetMax / targetMin):  proteinScore = 100         (at or above max)
 *        ratio ≥ 1.0:                      proteinScore = lerp(80, 100, (ratio−1)/(maxRatio−1))
 *        ratio ≥ 0.5:                      proteinScore = lerp(30, 80, (ratio−0.5)/0.5)
 *        ratio < 0.5:                      proteinScore = lerp(0, 30, ratio/0.5)
 *
 *        Interpretation:
 *          100 = at or above ISSN optimal range (2.2 g/kg)
 *           80 = meets minimum 1.6 g/kg target
 *           50 = ~0.8 g/kg (half of minimum)
 *            0 = zero protein
 *
 *   2. Caloric Adequacy Score (weight: 30 % of final score, only if provided):
 *
 *        Estimate TDEE based on activityLevel × bodyweightKg (Mifflin-like approximation):
 *          sedentary   → bodyweightKg × 26
 *          light       → bodyweightKg × 30
 *          moderate    → bodyweightKg × 33
 *          active      → bodyweightKg × 37
 *          very_active → bodyweightKg × 40
 *
 *        surplus_ratio = actualCalories / estimatedTDEE
 *
 *        Goal alignment:
 *          fitnessGoal = 'strength' or 'hypertrophy':
 *            surplus_ratio ≥ 1.05 → 100  (slight surplus — optimal for growth)
 *            0.95–1.05            → 90   (maintenance — acceptable)
 *            0.85–0.95            → 65   (mild deficit — some growth limiting)
 *            < 0.85               → 30   (significant deficit — growth limited)
 *            > 1.20               → 70   (excessive surplus — fat gain risk)
 *          fitnessGoal = 'weight' (loss) or null:
 *            0.75–0.95            → 100  (controlled deficit — ideal)
 *            0.95–1.05            → 80   (maintenance — acceptable)
 *            < 0.75               → 50   (aggressive deficit — muscle loss risk)
 *            ≥ 1.05               → 60   (surplus — may not align with goal)
 *
 *        If bodyweightKg is null → caloricScore = 50 (neutral).
 *
 *   3. Final Score:
 *        If calories provided:
 *          finalScore = proteinScore × 0.70 + caloricScore × 0.30
 *        If only protein provided:
 *          finalScore = proteinScore
 *
 * ─── Trend Calculation ───────────────────────────────────────────────────────
 *   Nutrition data is a static snapshot (single average value), so trend is
 *   always 'stable'. Weight-log trend correlation is deferred to Phase 2.
 *
 * ─── Confidence ─────────────────────────────────────────────────────────────
 *   Has nutrition data → derived from session count (standard confidence table).
 *   No nutrition data  → 'insufficient' with confidence = 0.
 *
 * ─── Inputs consumed ─────────────────────────────────────────────────────────
 *   averageDailyProteinGrams (optional)
 *   averageDailyCaloriesKcal (optional)
 *   bodyweightKg
 *   fitnessGoal
 *   activityLevel
 *   sessions[].status === 'completed' (for confidence)
 */

import type { GrowthAnalysisInput, ScoreDetail } from '../types';
import {
  CONFIDENCE_LEVEL_TO_VALUE,
  NUTRITION_MIN_PROTEIN_GRAMS_PER_KG,
  NUTRITION_MAX_PROTEIN_GRAMS_PER_KG,
  NUTRITION_NO_DATA_SCORE,
} from '../constants';
import {
  clampScore,
  resolveConfidenceLevel,
  resolveScoreStatus,
} from '../helpers';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Activity-level → calories per kg bodyweight (TDEE approximation). */
const TDEE_FACTOR: Record<string, number> = {
  sedentary:   26,
  light:       30,
  moderate:    33,
  active:      37,
  very_active: 40,
};

/** Goals that benefit from a caloric surplus. */
const SURPLUS_GOALS = new Set(['strength', 'hypertrophy']);

/** Weight of protein score in the final nutrition score. */
const PROTEIN_WEIGHT = 0.70;

/** Weight of caloric adequacy score when calorie data is available. */
const CALORIC_WEIGHT = 0.30;

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Linearly interpolates `value` in [min, max] to a score in [scoreMin, scoreMax].
 */
function lerp(
  value: number,
  inMin: number,
  inMax: number,
  scoreMin: number,
  scoreMax: number,
): number {
  if (inMax === inMin) return scoreMin;
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return scoreMin + t * (scoreMax - scoreMin);
}

/**
 * Calculates the protein sub-score [0, 100].
 *
 * @param actualGrams    - Daily protein intake in grams.
 * @param bodyweightKg   - Body weight in kg.
 * @returns Protein sub-score.
 */
function scoreProtein(actualGrams: number, bodyweightKg: number): number {
  // Protein Score
  // 100 = at or above 2.2 g/kg (ISSN upper optimal)
  //  80 = exactly 1.6 g/kg (ISSN lower optimal)
  //  30 = 0.8 g/kg (half of minimum)
  //   0 = 0 g protein
  const targetMin = bodyweightKg * NUTRITION_MIN_PROTEIN_GRAMS_PER_KG;
  const targetMax = bodyweightKg * NUTRITION_MAX_PROTEIN_GRAMS_PER_KG;
  const ratio = targetMin > 0 ? actualGrams / targetMin : 0;
  const maxRatio = targetMin > 0 ? targetMax / targetMin : 1;

  if (ratio >= maxRatio) return 100;
  if (ratio >= 1.0) return lerp(ratio, 1.0, maxRatio, 80, 100);
  if (ratio >= 0.5) return lerp(ratio, 0.5, 1.0, 30, 80);
  return lerp(ratio, 0, 0.5, 0, 30);
}

/**
 * Calculates the caloric adequacy sub-score [0, 100] based on goal alignment.
 *
 * @param actualKcal    - Daily caloric intake.
 * @param bodyweightKg  - Body weight in kg.
 * @param activityLevel - User's activity level.
 * @param fitnessGoal   - User's primary fitness goal (or null).
 * @returns Caloric adequacy sub-score.
 */
function scoreCaloricAdequacy(
  actualKcal: number,
  bodyweightKg: number,
  activityLevel: string,
  fitnessGoal: string | null,
): number {
  // Caloric Adequacy Score
  // For growth goals (strength/hypertrophy):
  //   100 = 5%+ surplus (optimal anabolic environment)
  //    90 = maintenance (0–5% variance)
  //    65 = mild deficit (5–15%)
  //    30 = significant deficit (>15%)
  //    70 = excessive surplus (>20%)
  //
  // For weight-loss / unspecified goals:
  //   100 = controlled deficit (5–25%)
  //    80 = maintenance (acceptable)
  //    50 = aggressive deficit (>25%)
  //    60 = surplus (may not align with goal)
  const tdeePerKg = TDEE_FACTOR[activityLevel] ?? TDEE_FACTOR.moderate;
  const estimatedTDEE = bodyweightKg * tdeePerKg;
  if (estimatedTDEE <= 0) return 50;

  const surplusRatio = actualKcal / estimatedTDEE;
  const isGrowthGoal = fitnessGoal !== null && SURPLUS_GOALS.has(fitnessGoal);

  if (isGrowthGoal) {
    if (surplusRatio > 1.20) return 70;   // Excessive surplus
    if (surplusRatio >= 1.05) return 100; // Optimal growth surplus
    if (surplusRatio >= 0.95) return 90;  // Maintenance — acceptable
    if (surplusRatio >= 0.85) return 65;  // Mild deficit
    return 30;                            // Significant deficit
  } else {
    // Neutral / weight-loss goal
    if (surplusRatio < 0.75) return 50;  // Aggressive deficit
    if (surplusRatio < 0.95) return 100; // Controlled deficit — ideal
    if (surplusRatio <= 1.05) return 80; // Maintenance
    return 60;                           // Surplus — not aligned with weight-loss
  }
}

// ─── Public Scorer ───────────────────────────────────────────────────────────

/**
 * Calculates the Nutrition Score for a given analysis input.
 *
 * @param input - The full GrowthAnalysisInput context.
 * @returns A fully-shaped ScoreDetail for the 'nutrition' dimension.
 */
export function calculateNutritionScore(
  input: GrowthAnalysisInput,
): ScoreDetail {
  const {
    sessions,
    averageDailyProteinGrams,
    averageDailyCaloriesKcal,
    bodyweightKg,
    fitnessGoal,
    activityLevel,
  } = input;

  const hasProtein = averageDailyProteinGrams != null && averageDailyProteinGrams > 0;
  const hasCalories = averageDailyCaloriesKcal != null && averageDailyCaloriesKcal > 0;
  const hasNutritionData = hasProtein || hasCalories;

  const sessionCount = sessions.filter((s) => s.status === 'completed').length;

  // ── Guard: No nutrition data ───────────────────────────────────────────────
  if (!hasNutritionData) {
    return {
      key: 'nutrition',
      label: 'Nutrition Score',
      value: NUTRITION_NO_DATA_SCORE,
      status: resolveScoreStatus(NUTRITION_NO_DATA_SCORE),
      confidence: 0,
      confidenceLevel: 'insufficient',
      trend: 'insufficient_data',
      explanation:
        'No nutrition data provided. Log your protein and calorie intake to unlock this score.',
      breakdown: {
        hasProteinData: false,
        hasCalorieData: false,
        bodyweightKg,
        targetProteinRange: bodyweightKg != null
          ? {
              minGrams: Math.round(bodyweightKg * NUTRITION_MIN_PROTEIN_GRAMS_PER_KG),
              maxGrams: Math.round(bodyweightKg * NUTRITION_MAX_PROTEIN_GRAMS_PER_KG),
            }
          : null,
      },
    };
  }

  // ── Confidence: based on session count when data is present ───────────────
  const confidenceLevel = resolveConfidenceLevel(sessionCount);
  const confidence = CONFIDENCE_LEVEL_TO_VALUE[confidenceLevel];

  // ── Protein Score ─────────────────────────────────────────────────────────
  let proteinScore = 50; // neutral default when protein or bodyweight missing
  let proteinSubDetails: Record<string, unknown> = { status: 'no_data' };

  if (hasProtein && bodyweightKg != null && bodyweightKg > 0) {
    const actualProtein = averageDailyProteinGrams!;
    proteinScore = scoreProtein(actualProtein, bodyweightKg);

    const targetMin = Math.round(bodyweightKg * NUTRITION_MIN_PROTEIN_GRAMS_PER_KG);
    const targetMax = Math.round(bodyweightKg * NUTRITION_MAX_PROTEIN_GRAMS_PER_KG);
    proteinSubDetails = {
      actualGrams: actualProtein,
      targetMinGrams: targetMin,
      targetMaxGrams: targetMax,
      proteinScore: Math.round(proteinScore),
    };
  } else if (hasProtein && bodyweightKg == null) {
    // Protein data available but no bodyweight → use absolute threshold heuristic
    // 150g is a reasonable baseline for a ~80-kg athlete.
    const fallbackMin = 128; // 1.6 g × 80 kg
    // Upper bound: 176g = 2.2 g × 80 kg (not used for scoring, informational only)
    const actualProtein = averageDailyProteinGrams!;
    const ratio = actualProtein / fallbackMin;
    proteinScore = ratio >= 1 ? Math.min(100, 80 + (ratio - 1) * 50) : Math.max(0, ratio * 80);
    proteinSubDetails = {
      actualGrams: actualProtein,
      note: 'bodyweight unknown — using 80 kg reference',
      proteinScore: Math.round(proteinScore),
    };
  }

  // ── Caloric Adequacy Score ────────────────────────────────────────────────
  let caloricScore = 50;
  let caloricSubDetails: Record<string, unknown> = { status: 'no_data' };

  if (hasCalories && bodyweightKg != null && bodyweightKg > 0) {
    const actualKcal = averageDailyCaloriesKcal!;
    const tdeePerKg = TDEE_FACTOR[activityLevel] ?? TDEE_FACTOR.moderate;
    const estimatedTDEE = Math.round(bodyweightKg * tdeePerKg);
    caloricScore = scoreCaloricAdequacy(actualKcal, bodyweightKg, activityLevel, fitnessGoal);
    caloricSubDetails = {
      actualKcal,
      estimatedTDEE,
      surplusRatio: Math.round((actualKcal / estimatedTDEE) * 100) / 100,
      goalAlignment: fitnessGoal ?? 'unspecified',
      caloricScore: Math.round(caloricScore),
    };
  }

  // ── Combined Score ────────────────────────────────────────────────────────
  // Protein Score formula:
  // 100 = ≥ 2.2 g/kg  (full ISSN upper range)
  //  80 = 1.6 g/kg    (ISSN minimum)
  //  30 = 0.8 g/kg    (half of minimum)
  //   0 = no protein
  //
  // If calories are available, blend at 70/30 (protein is the primary driver).
  // If only protein → finalScore = proteinScore.
  let rawScore: number;
  if (hasCalories) {
    rawScore = proteinScore * PROTEIN_WEIGHT + caloricScore * CALORIC_WEIGHT;
  } else {
    rawScore = proteinScore;
  }

  const value = clampScore(rawScore);
  const status = resolveScoreStatus(value);

  // ── Explanation ────────────────────────────────────────────────────────────
  const parts: string[] = [];
  if (hasProtein && bodyweightKg != null) {
    const targetMin = Math.round(bodyweightKg * NUTRITION_MIN_PROTEIN_GRAMS_PER_KG);
    const actualProtein = averageDailyProteinGrams!;
    if (actualProtein >= targetMin) {
      parts.push(`Protein intake (${actualProtein}g) meets the minimum target.`);
    } else {
      parts.push(`Protein intake (${actualProtein}g) is below the target of ${targetMin}g.`);
    }
  }
  if (hasCalories && caloricSubDetails.estimatedTDEE) {
    const actualKcal = averageDailyCaloriesKcal!;
    const tdee = caloricSubDetails.estimatedTDEE as number;
    const delta = actualKcal - tdee;
    parts.push(
      delta >= 0
        ? `Calorie intake is ${delta} kcal above estimated TDEE (${tdee} kcal).`
        : `Calorie intake is ${Math.abs(delta)} kcal below estimated TDEE (${tdee} kcal).`,
    );
  }

  const explanation = parts.length > 0 ? parts.join(' ') : 'Nutrition score calculated from available data.';

  return {
    key: 'nutrition',
    label: 'Nutrition Score',
    value,
    status,
    confidence,
    confidenceLevel,
    trend: 'stable', // Static snapshot — no time-series for nutrition data
    explanation,
    breakdown: {
      hasProteinData: hasProtein,
      hasCalorieData: hasCalories,
      bodyweightKg,
      protein: proteinSubDetails,
      calories: caloricSubDetails,
      weightApplied: hasCalories
        ? { protein: PROTEIN_WEIGHT, calories: CALORIC_WEIGHT }
        : { protein: 1.0, calories: 0 },
    },
  };
}
