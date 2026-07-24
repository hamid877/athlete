import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";

import WorkoutSession from "@/models/WorkoutSession";
import "@/models/Workout";
import "@/models/exercise.model";

import {
  serializeWorkoutSession,
  type PopulatedLeanWorkoutSession,
} from "@/lib/serializers/workoutSession";

import { calculatePersonalRecords } from "@/lib/performance/records";

export async function GET() {
  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rawSessions = await WorkoutSession.find({
      userId: session.user.id,
      status: "completed",
    })
      .populate({
        path: "workoutId",
      })
      .populate({
        path: "exercises.exerciseId",
      })
      .sort({ startedAt: 1 })
      .lean();

    const sessions = rawSessions.map((session) =>
      serializeWorkoutSession(
        session as unknown as PopulatedLeanWorkoutSession
      )
    );

    const records = calculatePersonalRecords(sessions);

    return NextResponse.json({
      recent: records,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/records error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch personal records",
      },
      {
        status: 500,
      }
    );
  }
}
