"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface StartWorkoutButtonProps {
  workoutId: string;
}

export function StartWorkoutButton({ workoutId }: StartWorkoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [disableReason, setDisableReason] = useState("");

  useEffect(() => {
    async function checkRestriction() {
      try {
        const res = await fetch("/api/programs/active");
        if (res.ok) {
          const data = await res.json();
          if (data.hasStartedFirstSession === false && Array.isArray(data.workoutDays)) {
            const currentLocalWeekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
            const requestedDay = data.workoutDays.find((wd: { workoutId: string; day: string }) => wd.workoutId === workoutId);
            
            if (requestedDay && requestedDay.day !== currentLocalWeekday) {
              setIsDisabled(true);
              setDisableReason(`New programs must begin with today's scheduled workout (${currentLocalWeekday}).`);
            }
          }
        }
      } catch (err) {
        console.error("Failed to check active program for restrictions", err);
      }
    }
    checkRestriction();
  }, [workoutId]);

  async function handleStartWorkout() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({ workoutId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start workout");
      }

      const session = await response.json();
      toast.success("Workout started!");
      router.push(`/workout-sessions/${session._id}`);
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Failed to start workout. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full sm:w-auto">
      <Button 
        onClick={handleStartWorkout} 
        disabled={isLoading || isDisabled} 
        className="w-full"
        title={disableReason}
      >
        <Play className="mr-2 h-4 w-4" />
        {isLoading ? "Starting..." : "Start Workout"}
      </Button>
      {isDisabled && disableReason && (
        <span className="text-xs text-red-400 mt-1 text-center max-w-[250px]">{disableReason}</span>
      )}
    </div>
  );
}
