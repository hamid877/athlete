import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    await connectDB();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid exercise ID" },
        { status: 400 }
      );
    }

    // Find all completed workout sessions for the user that contain this exercise
    const workoutSessions = await WorkoutSession.find({
      userId,
      status: "completed",
      "exercises.exerciseId": id,
    })
      .sort({ startedAt: 1 }) // Chronological order
      .lean();

    const history = workoutSessions.map((ws) => {
      // Find the specific exercise within the session
      const exerciseData = ws.exercises.find(
        (e) => e.exerciseId.toString() === id
      );

      if (!exerciseData || exerciseData.performedSets.length === 0) {
        return null;
      }

      // Calculate max weight and volume
      let maxWeight = 0;
      let volume = 0;
      let estimated1RM = 0;

      exerciseData.performedSets.forEach((set) => {
        if (!set.completed) return;
        
        maxWeight = Math.max(maxWeight, set.weight);
        volume += set.weight * set.reps;

        // Calculate 1RM using Brzycki formula: Weight × (36 / (37 - Reps))
        let set1RM = set.weight;
        if (set.reps > 1) {
          set1RM = set.weight * (36 / (37 - set.reps));
        }
        estimated1RM = Math.max(estimated1RM, set1RM);
      });

      return {
        sessionId: ws._id.toString(),
        date: ws.startedAt,
        maxWeight,
        volume,
        estimated1RM: Math.round(estimated1RM),
      };
    }).filter(Boolean); // Remove nulls if no valid sets were found

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching exercise history:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching exercise history" },
      { status: 500 }
    );
  }
}
