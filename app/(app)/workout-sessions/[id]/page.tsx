
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";
import "@/models/Workout"; // Register Workout model for populate
import "@/models/exercise.model"; // Register Exercise model for populate
import { ActiveWorkoutClient } from "./ActiveWorkoutClient";
import { serializeWorkoutSession, PopulatedLeanWorkoutSession } from "@/lib/serializers/workoutSession";


function formatStatus(status: string): string {
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "in_progress":
      return "bg-[var(--primary-subtle)] text-[var(--primary)]";
    case "completed":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";
    case "cancelled":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";
    default:
      return "bg-[var(--background-subtle)] text-[var(--text-secondary)]";
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkoutSessionPage({ params }: Props) {
  await connectDB();

  const userSession = await auth();

  if (!userSession?.user?.id) {
    notFound();
  }

  const { id } = await params;

  const rawSession = await WorkoutSession.findOne({
    _id: id,
    userId: userSession.user.id,
  })
    .populate({
      path: "workoutId",
      select: "name exercises",
    })
    .populate({
      path: "exercises.exerciseId",
      select: "name equipment primaryMuscle",
    })
    .lean();

  if (!rawSession) {
    notFound();
  }

if (!rawSession.workoutId) {
  notFound();
}

const serializedSession = serializeWorkoutSession(rawSession as unknown as PopulatedLeanWorkoutSession);

if (!serializedSession.workoutId) {
  notFound();
}

const serializedWorkout = serializedSession.workoutId;

  const startedDate = new Date(serializedSession.startedAt);

  return (
    <div className="flex flex-col h-full">
      {/* ─── Header ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {serializedWorkout.name}
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Started:{" "}
          {startedDate.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>

        <span
          className={`mt-2 inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(serializedSession.status)}`}
        >
          {formatStatus(serializedSession.status)}
        </span>
      </div>

      {/* ─── Client Workout Flow ─── */}
      <div className="flex-1">
        <ActiveWorkoutClient session={serializedSession} workout={serializedWorkout} />
      </div>
    </div>
  );
}