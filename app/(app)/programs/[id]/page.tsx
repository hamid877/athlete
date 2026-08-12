"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Dumbbell, Coffee, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  hasStartedFirstSession?: boolean;
}

export default function ProgramDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<ProgramDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocalWeekday, setCurrentLocalWeekday] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentLocalWeekday(new Date().toLocaleDateString("en-US", { weekday: "long" }));
    
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

  const handleDelete = async () => {
    if (!program) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/programs/${program._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete program");
      }
      toast.success("Training program deleted successfully");
      router.push("/programs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete program");
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

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
      <div className="flex flex-col min-h-[100dvh] w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-1/4" />
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{program.name}</h1>
          <div className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-sm font-semibold text-secondary-foreground">
            {formatSplitType(program.splitType)}
          </div>
        </div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Program</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this training program?</DialogTitle>
              <DialogDescription>
                This will permanently remove this program and its schedule. Your completed workout history and other data will NOT be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Program"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
  const isToday = dayObj.day === currentLocalWeekday;
  const isFirstWorkoutRestrictionActive = program.hasStartedFirstSession === false;
  
  let isDisabled = false;
  if (isFirstWorkoutRestrictionActive && !isToday) {
    isDisabled = true;
  }

  // If today is a rest day, all workouts are disabled if restriction is active
  // Wait, if today is a rest day and restriction is active, the user CANNOT start a workout today.
  // We should just enforce: if restriction is active, only `isToday` can be selected.
  // And if `isToday` is a rest day, it won't be selectable anyway.

  const isInteractive = !isRest && dayObj.workoutId && !isDisabled;

  const card = (
    <Card
      className={`flex flex-col transition-colors ${
        isInteractive
          ? "cursor-pointer hover:border-primary/50"
          : "bg-muted/30"
      } ${isToday && isFirstWorkoutRestrictionActive ? "border-primary ring-1 ring-primary shadow-md bg-primary-subtle/30" : ""} ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {dayObj.day}
          {isToday && <span className="ml-2 text-xs font-semibold text-primary uppercase tracking-wider">Today</span>}
        </CardTitle>
        {isDisabled && <Lock className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>

      <CardContent>
        {isRest ? (
          <div className="flex flex-col">
            <div className="flex items-center text-muted-foreground">
              <Coffee className="mr-2 h-4 w-4" />
              <span className="font-medium">Rest Day</span>
            </div>
            {isToday && isFirstWorkoutRestrictionActive && (
              <p className="text-xs text-muted-foreground mt-2">Today&apos;s scheduled workout is a rest day.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center">
              <Dumbbell className={`mr-2 h-4 w-4 ${isDisabled ? 'text-muted-foreground' : 'text-primary'}`} />
              <span className="font-medium line-clamp-1">
                {dayObj.workoutId?.name}
              </span>
            </div>
            {isDisabled && (
              <p className="text-xs text-muted-foreground mt-2">Start with today&apos;s scheduled workout.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!isInteractive || !dayObj.workoutId) {
    return <div key={index} className={isDisabled ? 'cursor-not-allowed' : ''}>{card}</div>;
  }

  return (
    <Link
      key={index}
      href={`/workouts/${dayObj.workoutId._id}`}
      className="block"
      aria-disabled={isDisabled}
      tabIndex={isDisabled ? -1 : 0}
      onClick={(e) => {
        if (isDisabled) e.preventDefault();
      }}
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
