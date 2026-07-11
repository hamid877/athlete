import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkoutSession from "@/models/WorkoutSession";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function WorkoutSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userSession = await auth();
  if (!userSession?.user?.id) {
    return null;
  }

  const { id } = await params;
  await connectDB();

  const workoutSession = await WorkoutSession.findOne({
    _id: id,
    userId: userSession.user.id,
  }).populate("workoutId");

  if (!workoutSession || workoutSession.status !== "completed") {
    return notFound();
  }

  const workout = workoutSession.workoutId as {
    name: string;
    exercises: { exerciseId: { toString(): string }; sets: number }[];
  } | undefined;
  const plannedExercises = workout?.exercises || [];

  let totalCompletedSets = 0;
  let totalVolume = 0;
  let completedExercises = 0;

  workoutSession.exercises.forEach(
    (sessionEx: {
      exerciseId: { toString(): string };
      performedSets: { completed: boolean; weight?: number; reps?: number }[];
    }) => {
      let completedSetsCount = 0;

      sessionEx.performedSets.forEach((set) => {
        if (set.completed) {
          totalCompletedSets++;
          completedSetsCount++;
          totalVolume += (set.weight || 0) * (set.reps || 0);
        }
      });

      const plannedEx = plannedExercises.find(
        (e) => e.exerciseId.toString() === sessionEx.exerciseId.toString()
      );

    if (plannedEx && completedSetsCount >= plannedEx.sets) {
      completedExercises++;
    }
  });

  return (
    <div className="container max-w-md mx-auto p-4 flex flex-col gap-6 pt-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Workout Complete!</h1>
        <p className="text-muted-foreground">{workout?.name}</p>
      </div>

      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-xl">Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-semibold text-lg">{formatDuration(workoutSession.duration || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-semibold text-lg">{totalVolume.toLocaleString()} lbs</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Sets Completed</span>
            <span className="font-semibold text-lg">{totalCompletedSets}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Exercises Completed</span>
            <span className="font-semibold text-lg">{completedExercises}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Finished At</span>
            <span className="font-medium">
              {workoutSession.finishedAt ? new Date(workoutSession.finishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button asChild className="w-full text-lg h-14 font-bold mt-4" size="lg">
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
