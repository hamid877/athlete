/**
 * @file app/api/stimulus/route.ts
 * @description GET /api/stimulus — Sprint 7.4
 *
 * Responsibilities:
 *  1. Authenticate the requesting user.
 *  2. Fetch completed WorkoutSessions from the last 7 days with exerciseId populated.
 *  3. Serialize Mongoose documents → CompletedWorkout[] DTOs.
 *  4. Delegate calculations to the Stimulus Engine (calculateAllStimulus).
 *  5. Return the result as JSON.
 */
import "@/models/exercise.model";
import "@/models/Workout";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";
import {
  serializeSessionsForRecovery,
  type LeanRecoverySession,
} from "@/lib/serializers/recovery";
import { calculateAllStimulus } from "@/lib/performance/stimulus";

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Connect and fetch completed sessions from last 7 days
    await connectDB();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const rawSessions = await WorkoutSession.find({
      userId,
      status: "completed",
      finishedAt: { $gte: sevenDaysAgo },
    })
      .populate({
        path: "exercises.exerciseId",
        select: "name primaryMuscle secondaryMuscles",
      })
      .lean() as unknown as LeanRecoverySession[];

    // 3. Serialize Mongoose documents → CompletedWorkout[] DTOs
    const completedWorkouts = serializeSessionsForRecovery(rawSessions);

    // 4. Delegate calculations to the Stimulus Engine
    const stimulusResults = calculateAllStimulus(completedWorkouts);

    return NextResponse.json({
      stimulus: stimulusResults,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/stimulus error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
