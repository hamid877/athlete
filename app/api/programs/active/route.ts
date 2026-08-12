import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TrainingProgram from "@/models/TrainingProgram";
import WorkoutSession from "@/models/WorkoutSession";
import "@/models/Workout"; // Register Workout model for populate

interface PopulatedWorkout {
  _id: { toString(): string };
  name: string;
  exercises: unknown[];
}

interface LeanWorkoutDay {
  day: string;
  isRestDay: boolean;
  workoutId: unknown;
}

export async function GET() {
  try {
    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const program = await TrainingProgram.findOne({
      userId: session.user.id,
      isActive: true,
    })
      .populate({
        path: "workoutDays.workoutId",
        select: "name exercises",
      })
      .lean();

    if (!program) {
      return NextResponse.json(
        { error: "No active training program" },
        { status: 404 }
      );
    }

    // Check if any workout session has been started since the program was activated
    let hasStartedFirstSession = true;
    if (program.activatedAt) {
      const sessionCount = await WorkoutSession.countDocuments({
        userId: session.user.id,
        startedAt: { $gte: program.activatedAt },
      });
      hasStartedFirstSession = sessionCount > 0;
    }

    // Cast to a typed array so filter/map have proper types
    const days = program.workoutDays as unknown as LeanWorkoutDay[];

    const workoutDays = days
      .filter((wd) => !wd.isRestDay && wd.workoutId != null)
      .map((wd) => {
        // workoutId is populated after .populate()
        const workout = wd.workoutId as PopulatedWorkout;

        return {
          day: wd.day,
          workoutId: workout._id.toString(),
          workoutName: workout.name,
          exerciseCount: workout.exercises.length,
        };
      });

    return NextResponse.json({ 
      workoutDays, 
      hasStartedFirstSession,
      activatedAt: program.activatedAt
    });
  } catch (error) {
    console.error("GET /api/programs/active error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active program" },
      { status: 500 }
    );
  }
}

