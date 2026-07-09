import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signUpSchema } from "@/validators/auth.schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate request body
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // 2. Connect to the gymtracker database
    await connectDB();

    // 3. Check for existing user (case-insensitive email match)
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 4. Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Create new user document
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      onboardingCompleted: false,
    });

    // Return success without sensitive data
    return NextResponse.json(
      {
        message: "User registered successfully",
        userId: newUser._id.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}
