import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userSession = await auth();
    if (!userSession?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const workoutSession = await WorkoutSession.findOne({
      _id: id,
      userId: userSession.user.id,
    }).populate("workoutId");

    if (!workoutSession) {
      return NextResponse.json(
        { error: "Workout session not found" },
        { status: 404 }
      );
    }

    if (workoutSession.status !== "in_progress") {
      return NextResponse.json(
        { error: "Session is not in progress" },
        { status: 400 }
      );
    }

    const finishedAt = new Date();
    const duration = Math.floor(
      (finishedAt.getTime() - workoutSession.startedAt.getTime()) / 1000
    );

    workoutSession.status = "completed";
    workoutSession.finishedAt = finishedAt;
    workoutSession.duration = duration;

    await workoutSession.save();

    // Calculate stats to return
    let totalCompletedSets = 0;
    let totalVolume = 0;
    let completedExercises = 0;

    const workout = workoutSession.workoutId as {
      name: string;
      exercises: { exerciseId: { toString(): string }; sets: number }[];
    } | undefined;
    const plannedExercises = workout?.exercises || [];

    workoutSession.exercises.forEach(
      (sessionEx: {
        exerciseId: { toString(): string };
        performedSets: { completed: boolean; weight?: number; reps?: number }[];
      }) => {
        let completedSetsCount = 0;

        sessionEx.performedSets.forEach((set) => {
          if (set.completed) {
            totalCompletedSets++;
            completedSetsCount++;
            totalVolume += (set.weight || 0) * (set.reps || 0);
          }
        });

        // Check if this exercise was fully completed
        const plannedEx = plannedExercises.find(
          (e) => e.exerciseId.toString() === sessionEx.exerciseId.toString()
        );

        if (plannedEx && completedSetsCount >= plannedEx.sets) {
          completedExercises++;
        }
      }
    );

    return NextResponse.json({
      duration,
      totalCompletedSets,
      totalVolume,
      completedExercises
    }, { status: 200 });
  } catch (error) {
    console.error("Finish workout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
