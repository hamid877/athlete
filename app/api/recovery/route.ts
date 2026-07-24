/**
 * @file app/api/recovery/route.ts
 * @description GET /api/recovery — Sprint 7.1 (Phase B)
 *
 * Responsibilities (in order):
 *  1. Authenticate the requesting user.
 *  2. Fetch all *completed* WorkoutSessions with exerciseId populated.
 *  3. Serialize Mongoose documents → CompletedWorkout[] DTOs.
 *  4. Delegate all calculations to the Recovery Engine.
 *  5. Return the result as JSON.
 *
 * This route performs NO recovery calculations.
 * No database writes are made.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";
import {
  serializeSessionsForRecovery,
  type LeanRecoverySession,
} from "@/lib/serializers/recovery";
import { calculateAllRecovery } from "@/lib/performance/recovery";
import type { RecoveryMuscle, WorkoutRecommendation } from "@/lib/performance/types";

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

interface RecoveryMuscleFatigue extends RecoveryMuscle {
  fatigue: number;
}

interface RecoveryAPIResponse {
  muscles: RecoveryMuscleFatigue[];
  recommendation: WorkoutRecommendation;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Connect and fetch completed sessions with Exercise data populated
    await connectDB();

    const rawSessions = await WorkoutSession.find({
      userId,
      status: "completed",
    })
      .populate({
        path: "exercises.exerciseId",
        select: "name primaryMuscle secondaryMuscles",
      })
      .lean() as unknown as LeanRecoverySession[];

    // 3. Serialize Mongoose documents → CompletedWorkout[] DTOs
    //    All Mongoose types, ObjectIds, and Buffers are stripped here.
    //    The Recovery Engine receives only plain TypeScript objects.
    const completedWorkouts = serializeSessionsForRecovery(rawSessions);

    // 4. Delegate ALL calculations to the Recovery Engine
    const { muscles, recommendation } = calculateAllRecovery(completedWorkouts);

    // 5. Build response — add `fatigue` field derived from the recovery %
    const now = new Date();

    const musclesWithFatigue: RecoveryMuscleFatigue[] = muscles.map((m) => ({
      ...m,
      fatigue: Math.round(100 - m.recovery),
    }));

    const body: RecoveryAPIResponse = {
      muscles: musclesWithFatigue,
      recommendation,
      generatedAt: now.toISOString(),
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/recovery error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
