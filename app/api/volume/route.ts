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
import { analyzeWeeklyVolume } from "@/lib/performance/volume";
import type { MuscleVolume } from "@/lib/performance/types";

export interface VolumeAPIResponse {
  muscles: MuscleVolume[];
  generatedAt: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await connectDB();

    // 7 days ago
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

    const completedWorkouts = serializeSessionsForRecovery(rawSessions);
    const muscles = analyzeWeeklyVolume(completedWorkouts);

    const body: VolumeAPIResponse = {
      muscles,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error("GET /api/volume error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
