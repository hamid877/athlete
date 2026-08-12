import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TrainingProgram from "@/models/TrainingProgram";
import WorkoutSession from "@/models/WorkoutSession";
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

    let hasStartedFirstSession = true;
    if (program.isActive && program.activatedAt) {
      const sessionCount = await WorkoutSession.countDocuments({
        userId: session.user.id,
        startedAt: { $gte: program.activatedAt },
      });
      hasStartedFirstSession = sessionCount > 0;
    }

    return NextResponse.json({
      ...program,
      hasStartedFirstSession
    });
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Only support setting isActive for now
    if (typeof body.isActive === 'boolean') {
      const sessionDB = await TrainingProgram.startSession();
      sessionDB.startTransaction();

      try {
        if (body.isActive) {
          // Deactivate others
          await TrainingProgram.updateMany(
            { userId: session.user.id, isActive: true },
            { $set: { isActive: false } },
            { session: sessionDB }
          );
        }

        const updated = await TrainingProgram.findOneAndUpdate(
          { _id: id, userId: session.user.id },
          { 
            $set: { 
              isActive: body.isActive,
              ...(body.isActive ? { activatedAt: new Date() } : {})
            } 
          },
          { new: true, session: sessionDB }
        ).lean();

        if (!updated) {
          await sessionDB.abortTransaction();
          sessionDB.endSession();
          return NextResponse.json({ error: "Program not found" }, { status: 404 });
        }

        await sessionDB.commitTransaction();
        sessionDB.endSession();
        return NextResponse.json(updated);
      } catch (error) {
        await sessionDB.abortTransaction();
        sessionDB.endSession();
        throw error;
      }
    }

    return NextResponse.json({ error: "Invalid updates" }, { status: 400 });
  } catch (error) {
    console.error("Error updating program:", error);
    return NextResponse.json({ error: "Failed to update program" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const program = await TrainingProgram.findOne({
      _id: id,
      userId: session.user.id,
    }).lean();

    if (!program) {
      return NextResponse.json(
        { error: "Training program not found" },
        { status: 404 }
      );
    }

    // Get all workout IDs associated with this program
    const workoutIds = (program.workoutDays || [])
      .filter((day: { workoutId?: unknown }) => day.workoutId)
      .map((day: { workoutId?: unknown }) => day.workoutId);

    // Check for in-progress workout sessions
    const inProgressSession = await WorkoutSession.findOne({
      userId: session.user.id,
      workoutId: { $in: workoutIds },
      status: "in_progress"
    }).lean();

    if (inProgressSession) {
      return NextResponse.json(
        { error: "Finish or abandon your current workout before deleting this program." },
        { status: 409 }
      );
    }

    // CRITICAL DATA RETENTION RULE: ONLY DELETE THE TrainingProgram DOCUMENT
    await TrainingProgram.deleteOne({
      _id: id,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting program:", error);
    return NextResponse.json(
      { error: "Failed to delete program" },
      { status: 500 }
    );
  }
}