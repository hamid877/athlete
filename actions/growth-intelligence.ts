"use server";

/**
 * @file actions/growth-intelligence.ts
 * @description
 *   Server Action — Growth Intelligence public entry point.
 *
 *   Exposes a single public function:
 *
 *     generateGrowthAnalysis(userId)
 *
 *   which gathers all required data from the database and delegates every
 *   calculation to `analyzeGrowth()` from the Growth Intelligence engine.
 *
 *   ─────────────────────────────────────────────────────────────────────
 *   Why a Server Action and not an API route?
 *   ─────────────────────────────────────────────────────────────────────
 *   • Can be called directly from Server Components without an HTTP layer.
 *   • Stays close to the existing patterns in `actions/profile.actions.ts`.
 *   • Future pages / hooks simply import and call `generateGrowthAnalysis`.
 *   • The Growth Intelligence engine is framework-free — the action is the
 *     only place Next.js / Mongoose concerns appear.
 *   ─────────────────────────────────────────────────────────────────────
 *
 *   Data collected:
 *     • User profile    — experienceLevel, activityLevel, workoutDaysPerWeek,
 *                         weightKg (bodyweight), fitnessGoal
 *     • Workout sessions — last 8 weeks, completed only, exercises populated
 *     • Weight log       — last 8 weeks, for nutrition scoring context
 *
 *   No new DB fields are introduced. All data comes from existing collections.
 */

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import WorkoutSession from "@/models/WorkoutSession";
import WeightLog from "@/models/weight-log.model";
import {
  analyzeGrowth,
  validateInput,
} from "@/lib/growth-intelligence";
import type { GrowthAnalysisInput, GrowthAnalysisResult } from "@/lib/growth-intelligence";
import { serializeWorkoutSession } from "@/lib/serializers/workoutSession";
import type {
  PopulatedLeanWorkoutSession,
} from "@/lib/serializers/workoutSession";
import type { WeightLogDocument, ExperienceLevel, ActivityLevel, GoalType } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * How many weeks of history to pull for the analysis window.
 * 8 weeks aligns with CONSISTENCY_LOOKBACK_WEEKS (8) so the full window
 * is available for the Consistency scorer.
 */
const ANALYSIS_WINDOW_WEEKS = 8;

// ─── Public Entry Point ───────────────────────────────────────────────────────

/**
 * Generates a complete Growth Intelligence analysis for the given user.
 *
 * This is the **single public entry point** for the Growth Intelligence engine.
 * All database access and data assembly happens here; the engine itself is
 * pure and receives only typed DTOs.
 *
 * @param userId - The string ID of the authenticated user.
 * @returns A fully-typed `GrowthAnalysisResult`.
 *
 * @throws {Error} If the user is not found or input validation fails.
 *
 * @example
 * ```ts
 * // In a Server Component or another Server Action:
 * import { generateGrowthAnalysis } from '@/actions/growth-intelligence';
 *
 * const result = await generateGrowthAnalysis(session.user.id);
 * console.log(result.overallGrowthScore.value);
 * console.log(result.insights);
 * ```
 */
export async function generateGrowthAnalysis(
  userId: string,
): Promise<GrowthAnalysisResult> {
  await connectDB();

  // ── Step 1: Fetch user profile ────────────────────────────────────────────
  const userDoc = await User.findById(userId).lean();
  if (!userDoc) {
    throw new Error(`generateGrowthAnalysis: User not found (id: ${userId})`);
  }

  // Cast the lean document — User model stores these as typed fields.
  const user = userDoc as {
    experienceLevel?: string;
    activityLevel?: string;
    workoutDaysPerWeek?: number;
    weightKg?: number;
    fitnessGoal?: string;
  };

  // ── Step 2: Define analysis window ───────────────────────────────────────
  const windowEnd = new Date();
  const windowStart = new Date(
    windowEnd.getTime() - ANALYSIS_WINDOW_WEEKS * 7 * 24 * 60 * 60 * 1000,
  );

  // ── Step 3: Fetch completed workout sessions (last 8 weeks) ───────────────
  // Populate exercises.exerciseId so scorers can read primaryMuscle, name, equipment.
  const rawSessions = await WorkoutSession.find({
    userId,
    status: "completed",
    startedAt: { $gte: windowStart },
  })
    .sort({ startedAt: -1 })
    .populate({
      path: "exercises.exerciseId",
      select: "name primaryMuscle equipment isCompound isMachine isBodyweight",
    })
    .lean() as unknown as PopulatedLeanWorkoutSession[];

  // Serialize to plain DTOs — strips all Mongoose internals.
  const sessions = rawSessions.map((s) => serializeWorkoutSession(s));

  // ── Step 4: Fetch weight log (last 8 weeks) ───────────────────────────────
  const rawWeightLog = await WeightLog.find({
    userId,
    date: { $gte: windowStart },
  })
    .sort({ date: 1 })
    .lean() as unknown as WeightLogDocument[];

  const weightLog = rawWeightLog.map((entry) => ({
    date: new Date(entry.date),
    weightKg: entry.weightKg,
  }));

  // ── Step 5: Assemble GrowthAnalysisInput ──────────────────────────────────
  const input: GrowthAnalysisInput = {
    // User profile
    plannedWorkoutDaysPerWeek: user.workoutDaysPerWeek ?? 3,
    experienceLevel: (user.experienceLevel as ExperienceLevel) ?? "intermediate",
    activityLevel: (user.activityLevel as ActivityLevel) ?? "moderate",
    bodyweightKg: user.weightKg ?? null,
    fitnessGoal: (user.fitnessGoal as GoalType) ?? null,

    // Historical workout data
    sessions,

    // Analysis window
    windowStart,
    windowEnd,

    // Weight log for nutrition scoring
    weightLog,

    // Nutrition data — not stored in DB yet; defaults to null.
    // Phase 2: wire this up when a nutrition tracking feature is added.
    averageDailyProteinGrams: null,
    averageDailyCaloriesKcal: null,
  };

  // ── Step 6: Validate input ────────────────────────────────────────────────
  const validation = validateInput(input);
  if (!validation.valid) {
    throw new Error(
      `generateGrowthAnalysis: Invalid input for user ${userId}:\n` +
        validation.errors.join("\n"),
    );
  }

  // ── Step 7: Run the Growth Intelligence engine ────────────────────────────
  // `analyzeGrowth` is a pure, synchronous function — no I/O.
  return analyzeGrowth(input);
}
