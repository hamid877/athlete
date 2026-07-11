"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Calendar, Dumbbell, Coffee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Workout {
  _id: string;
  name: string;
}

interface WorkoutDay {
  day: string;
  isRestDay: boolean;
  workoutId: Workout | null;
}

interface ProgramDetails {
  _id: string;
  name: string;
  splitType: string;
  workoutDays: WorkoutDay[];
}

export default function ProgramDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<ProgramDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In Next.js App Router, params is unwrapped asynchronously in newer versions, 
    // but typically accessed synchronously. If params.id is missing, abort.
    const id = params?.id;
    if (!id || typeof id !== "string") return;

    async function fetchProgram() {
      try {
        const res = await fetch(`/api/programs/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Program not found");
          }
          throw new Error("Failed to fetch program details");
        }
        const data = await res.json();
        setProgram(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgram();
  }, [params]);

  const formatSplitType = (type: string) => {
    const splits: Record<string, string> = {
      push_pull_legs: "Push Pull Legs",
      bro_split: "Bro Split",
      upper_lower: "Upper Lower",
      full_body: "Full Body",
      arnold: "Arnold Split",
      custom: "Custom Split",
    };
    return splits[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Oops!</h2>
        <p className="text-muted-foreground mb-6">{error || "Program not found"}</p>
        <Button onClick={() => router.push("/programs")}>
          Back to Programs
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{program.name}</h1>
        <div className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-sm font-semibold text-secondary-foreground">
          {formatSplitType(program.splitType)}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            Weekly Schedule
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
{program.workoutDays.map((dayObj, index) => {
  const isRest = dayObj.isRestDay;

  const card = (
    <Card
      className={`flex flex-col transition-colors ${
        !isRest && dayObj.workoutId
          ? "cursor-pointer hover:border-primary/50"
          : "bg-muted/30"
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{dayObj.day}</CardTitle>
      </CardHeader>

      <CardContent>
        {isRest ? (
          <div className="flex items-center text-muted-foreground">
            <Coffee className="mr-2 h-4 w-4" />
            <span className="font-medium">Rest Day</span>
          </div>
        ) : (
          <div className="flex items-center">
            <Dumbbell className="mr-2 h-4 w-4 text-primary" />
            <span className="font-medium line-clamp-1">
              {dayObj.workoutId?.name}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isRest || !dayObj.workoutId) {
    return <div key={index}>{card}</div>;
  }

  return (
    <Link
      key={index}
      href={`/workouts/${dayObj.workoutId._id}`}
      className="block"
    >
      {card}
    </Link>
  );
})}
          </div>
        </div>
      </div>
    </div>
  );
}
