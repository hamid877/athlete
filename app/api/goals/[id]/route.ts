import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Goal from "@/models/goal.model";
import { updateGoalSchema } from "@/validators/goal.schema";
import { syncGoal } from "@/lib/goals/sync";
import { generateTrajectory } from "@/lib/goals/trajectory.service";
import {
  getWeightTimeSeries,
  getStrengthTimeSeries,
  getMuscleTimeSeries,
  getConsistencyTimeSeries,
} from "@/lib/goals/extractors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const goal = await Goal.findOne({ _id: id, userId: session.user.id }).lean();

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    let trajectory = null;
    if (goal.initialValue !== undefined) {
      let points: { date: Date; value: number }[] = [];
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      try {
        switch (goal.type) {
          case "weight":
          case "bodyFat":
            points = await getWeightTimeSeries(session.user.id, ninetyDaysAgo);
            break;
          case "strength":
            if (goal.exerciseId) {
              points = await getStrengthTimeSeries(
                session.user.id,
                goal.exerciseId.toString(),
                ninetyDaysAgo
              );
            }
            break;
          case "muscle_growth":
            if (goal.muscle) {
              points = await getMuscleTimeSeries(
                session.user.id,
                goal.muscle,
                ninetyDaysAgo
              );
            }
            break;
          case "consistency":
            points = await getConsistencyTimeSeries(
              session.user.id,
              goal.startDate
            );
            break;
        }

        trajectory = generateTrajectory(
          goal.initialValue,
          goal.currentValue,
          goal.targetValue,
          goal.startDate,
          points,
          goal.targetDate
        );
      } catch (e) {
        console.error("Failed to generate trajectory:", e);
      }
    }

    return NextResponse.json({ ...goal, trajectory });
  } catch (error) {
    console.error("GET /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = updateGoalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = await params;
    const goal = await Goal.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: validation.data },
      { new: true, runValidators: true }
    );

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    await syncGoal(goal);

    return NextResponse.json(goal);
  } catch (error) {
    console.error("PUT /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const goal = await Goal.findOneAndDelete({ _id: id, userId: session.user.id });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
