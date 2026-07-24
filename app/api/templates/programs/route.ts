import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ProgramTemplate from "@/models/ProgramTemplate";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const templates = await ProgramTemplate.find({}).sort({ createdAt: -1 });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch program templates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
