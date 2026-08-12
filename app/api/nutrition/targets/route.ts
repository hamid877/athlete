import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { updateNutritionTargetsSchema } from "@/validators/nutrition.schema";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateNutritionTargetsSchema.parse(body);

    await dbConnect();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { nutritionTargets: validatedData },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user.nutritionTargets);
  } catch (error) {
    console.error("Error updating nutrition targets:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update nutrition targets" },
      { status: 500 }
    );
  }
}
