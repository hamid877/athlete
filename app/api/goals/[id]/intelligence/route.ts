import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Goal from "@/models/goal.model";
import { generateGoalIntelligence } from "@/lib/goals/intelligence.service";
import mongoose from "mongoose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    await connectDB();

    const goal = await Goal.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const intelligence = await generateGoalIntelligence(goal);
    return NextResponse.json(intelligence);
  } catch (error) {
    console.error("GET /api/goals/[id]/intelligence error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
