import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";
import "@/models/Workout"; // Register Workout model for populate
import "@/models/exercise.model"; // Register Exercise model for populate
import { Card } from "@/components/ui/card";

/* ─── Local types ─────────────────────────────────────────────── */

interface ExerciseSummary {
  _id: string;
  name: string;
  equipment: string;
  primaryMuscle: string;
}

interface PlannedExercise {
  exerciseId: string;
  order: number;
  sets: number;
  repRange: { min: number; max: number };
  rest: number;
}

interface PopulatedWorkout {
  _id: string;
  name: string;
  exercises: PlannedExercise[];
}

interface PopulatedSessionExercise {
  exerciseId: ExerciseSummary | null;
  order: number;
  notes?: string;
  performedSets: unknown[];
}

interface WorkoutSessionData {
  _id: string;
  userId: string;
  workoutId: PopulatedWorkout | null;
  startedAt: string;
  finishedAt?: string;
  status: string;
  exercises: PopulatedSessionExercise[];
}

/* ─── Helpers ────────────────────────────────────────────────── */

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

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

/* ─── Page ───────────────────────────────────────────────────── */

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

  const session = rawSession as unknown as WorkoutSessionData;
  const workout = session.workoutId;

  if (!workout) {
    notFound();
  }

  const startedDate = new Date(session.startedAt);

  // Sort session exercises by order
  const sortedExercises = [...session.exercises].sort(
    (a, b) => a.order - b.order
  );

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {workout.name}
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Started:{" "}
          {startedDate.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>

        <span
          className={`mt-2 inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(session.status)}`}
        >
          {formatStatus(session.status)}
        </span>
      </div>

      {/* ─── Exercise list ─── */}
      {sortedExercises.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-secondary)] py-10">
          No exercises in this session.
        </p>
      ) : (
        <div className="space-y-4">
          {sortedExercises.map((sessionEx, index) => {
            // Match the planned exercise from the workout template by exerciseId
            const plannedEx = workout.exercises.find(
              (e) =>
                e.exerciseId.toString() ===
                sessionEx.exerciseId?._id?.toString()
            );

            return (
              <Card
                key={`${sessionEx.exerciseId?._id ?? index}`}
              >
                {/* Exercise name + planned summary */}
                <p className="font-semibold text-[var(--text-primary)]">
                  {sessionEx.exerciseId?.name ?? "Unknown exercise"}
                </p>

                {plannedEx && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                    <span>{plannedEx.sets} sets</span>
                    <span>
                      {plannedEx.repRange.min}–{plannedEx.repRange.max} reps
                    </span>
                    <span>{formatRest(plannedEx.rest)} rest</span>
                  </div>
                )}

                {/* Planned set rows */}
                {plannedEx && plannedEx.sets > 0 ? (
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: plannedEx.sets }).map(
                      (_, setIndex) => (
                        <div
                          key={`set-${setIndex}`}
                          className="flex items-center justify-between px-3 py-2.5 bg-[var(--background-subtle)] rounded-[var(--radius-sm)] border border-[var(--border)]"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-[var(--text-primary)] w-12">
                              Set {setIndex + 1}
                            </span>
                            <span className="text-sm text-[var(--text-secondary)]">
                              {plannedEx.repRange.min}–{plannedEx.repRange.max}{" "}
                              reps
                            </span>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]">
                            Planned
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--text-secondary)] text-center py-2">
                    No planned sets
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}