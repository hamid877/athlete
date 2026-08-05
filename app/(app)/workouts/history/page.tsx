"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, Calendar, Clock, Dumbbell, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { calculateSetVolume } from "@/lib/performance/volume";

interface PerformedSet {
  weight: number;
  reps: number;
  completed: boolean;
}

interface Exercise {
  exerciseId: { _id: string; name: string; weightInputType?: string } | string;
  order: number;
  performedSets: PerformedSet[];
}

interface WorkoutSession {
  _id: string;
  workoutId: { _id: string; name: string } | null;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  status: string;
  exercises: Exercise[];
}

export default function WorkoutHistoryPage() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/workout-sessions?status=completed");
        if (!res.ok) {
          throw new Error("Failed to fetch workout history");
        }
        const data = await res.json();
        setSessions(data);
      } catch (err) {
        console.error("Failed to load workout history", err);
        setError("Failed to load workout history. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const calculateTotalVolume = (exercises: Exercise[]) => {
    let volume = 0;
    exercises.forEach((ex) => {
      ex.performedSets.forEach((set) => {
        if (set.completed) {
          const weightInputType =
            typeof ex.exerciseId === "object" && ex.exerciseId !== null
              ? ex.exerciseId.weightInputType
              : undefined;
          volume += calculateSetVolume(set.weight, set.reps, weightInputType);
        }
      });
    });
    return volume;
  };

  const calculateTotalSets = (exercises: Exercise[]) => {
    let sets = 0;
    exercises.forEach((ex) => {
      ex.performedSets.forEach((set) => {
        if (set.completed) sets++;
      });
    });
    return sets;
  };

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workout History</h1>
          <p className="text-muted-foreground mt-1">
            Review your completed training sessions
          </p>
        </div>
        <Button asChild>
          <Link href="/programs">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Start Workout</span>
            <span className="sm:hidden">Start</span>
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6 text-destructive" />}
          title="Error"
          description={error}
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-6 w-6" />}
          title="No completed workouts yet"
          description="Start logging your training to build your history."
          actionLabel="Start Workout"
          actionHref="/programs"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <Link key={session._id} href={`/workout-sessions/${session._id}/summary`} className="block">
              <Card className="h-full flex flex-col hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <CardTitle className="text-xl line-clamp-1">
                      {session.workoutId ? session.workoutId.name : "Unknown Workout"}
                    </CardTitle>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary shrink-0">
                      Completed
                    </span>
                  </div>
                  <CardDescription className="flex items-center text-sm">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    {session.finishedAt
                      ? format(new Date(session.finishedAt), "MMM d, yyyy 'at' h:mm a")
                      : "Unknown date"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="grid grid-cols-3 gap-2 pt-4 border-t text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Duration</span>
                      <div className="flex items-center font-medium">
                        <Clock className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        {session.duration ? formatDuration(session.duration) : "--"}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Volume</span>
                      <div className="flex items-center font-medium">
                        <Dumbbell className="mr-1.5 h-3.5 w-3.5 text-primary" />
                        {calculateTotalVolume(session.exercises)} kg
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Sets</span>
                      <div className="flex items-center font-medium">
                        <span className="w-3.5 h-3.5 flex items-center justify-center bg-primary/20 text-primary rounded-sm text-[9px] font-bold mr-1.5 border border-primary/30">#</span>
                        {calculateTotalSets(session.exercises)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
