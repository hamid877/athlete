import { notFound } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";
import "@/models/exercise.model"; // Register Exercise model for populate
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { DeleteExerciseButton } from "@/components/workouts/DeleteExerciseButton";
import { ReorderExerciseButtons } from "@/components/workouts/ReorderExerciseButtons";

/* ─── Local types for populated lean result ──────────────────── */

interface ExerciseSummary {
  _id: string;
  name: string;
}

interface PopulatedExerciseEntry {
  exerciseId: ExerciseSummary | null;
  order: number;
  sets: number;
  repRange: { min: number; max: number };
  rest: number;
}

interface WorkoutData {
  _id: string;
  name: string;
  exercises: PopulatedExerciseEntry[];
}

/* ─── Helper ─────────────────────────────────────────────────── */

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/* ─── Page ───────────────────────────────────────────────────── */

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WorkoutDetailsPage({ params }: Props) {
  await connectDB();

  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { id } = await params;

  const raw = await Workout.findOne({
    _id: id,
    userId: session.user.id,
  })
    .populate({ path: "exercises.exerciseId",
      select: "name equipment primaryMuscle",
     })
    .lean();

  if (!raw) {
    notFound();
  }

  const workout = raw as unknown as WorkoutData;

  const sorted = [...workout.exercises].sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* ─── Header ─── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {workout.name}
        </h1>
    
      </div>

      {/* ─── Exercises ─── */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-10 w-10" strokeWidth={1.5} />}
          title="No exercises yet"
          description="Start building your workout by adding your first exercise."
          actionLabel="+ Add Exercise"
          actionHref={`/workouts/${id}/add-exercise`}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {sorted.length} exercise{sorted.length !== 1 ? "s" : ""}
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/workouts/${id}/add-exercise`}>+ Add Exercise</Link>
            </Button>
          </div>
          {sorted.map((entry, index) => (
            <Card key={entry.exerciseId?._id ?? index} className="relative">
              <div className="pr-10">
                <p className="font-semibold text-[var(--text-primary)]">
                  {entry.exerciseId?.name ?? "Unknown exercise"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--text-secondary)]">
                  <span>{entry.sets} sets</span>
                  <span>
                    {entry.repRange.min}–{entry.repRange.max} reps
                  </span>
                  <span>{formatRest(entry.rest)} rest</span>
                </div>
              </div>
              {entry.exerciseId && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <ReorderExerciseButtons 
                    workoutId={id} 
                    exerciseId={entry.exerciseId._id} 
                    isFirst={index === 0} 
                    isLast={index === sorted.length - 1} 
                  />
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Link href={`/workouts/${id}/configure-exercise/${entry.exerciseId._id}`}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit {entry.exerciseId.name}</span>
                    </Link>
                  </Button>
                  <DeleteExerciseButton workoutId={id} exerciseId={entry.exerciseId._id} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}