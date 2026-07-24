import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";
import { evaluateAchievements } from "@/lib/achievements/evaluator";
import type { IWorkoutSession } from "@/models/WorkoutSession";
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Fetch all completed workout sessions for this user
    const workoutSessions = await WorkoutSession.find({
      userId: session.user.id,
      status: 'completed'
    }).sort({ startedAt: 1 }).lean();

    // Evaluate achievements dynamically based on history
const evaluated = evaluateAchievements(
  workoutSessions as IWorkoutSession[]
);

    return NextResponse.json(evaluated);
  } catch (error: unknown) {
    console.error('Error in achievements API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
