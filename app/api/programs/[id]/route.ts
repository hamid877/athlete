import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TrainingProgram from "@/models/TrainingProgram";
import "@/models/Workout"; // Register Workout model for populate

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

    const program = await TrainingProgram.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate({
        path: "workoutDays.workoutId",
        select: "name isRestDay",
      })
      .lean();

    if (!program) {
      return NextResponse.json(
        { error: "Training program not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(program);
  } catch (error) {
    console.error("Error fetching training program:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch training program",
      },
      {
        status: 500,
      }
    );
  }
}