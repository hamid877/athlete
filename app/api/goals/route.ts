import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Goal from "@/models/goal.model";
import { createGoalSchema } from "@/validators/goal.schema";

export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: Record<string, string> = { userId: session.user.id };
    if (status) {
      query.status = status;
    }

    const goals = await Goal.find(query).sort({ createdAt: -1 });
    return NextResponse.json(goals);
  } catch (error) {
    console.error("GET /api/goals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = createGoalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const goal = await Goal.create({
      ...validation.data,
      userId: session.user.id,
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error("POST /api/goals error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
