import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workout from "@/models/Workout";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkoutDetailsPage({
  params,
}: Props) {
  await connectDB();

  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const { id } = await params;

  const workout = await Workout.findOne({
    _id: id,
    userId: session.user.id,
  }).lean();

  if (!workout) {
    notFound();
  }

  return (
    <main className="min-h-screen p-4">
      <div className="mx-auto max-w-md">

        <h1 className="text-3xl font-bold">
          {workout.name}
        </h1>

        <p className="mt-2 text-muted-foreground">
          {workout.day}
        </p>

      </div>
    </main>
  );
}