import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import "@/models/exercise.model"; // Register Exercise model for populate

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workout = await Workout.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate({
        path: "exercises.exerciseId",
      })
      .lean();

    if (!workout) {
      return NextResponse.json(
        { error: "Workout not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Error fetching workout:", error);

    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}
