"use client";

import { useState } from "react";
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

  async function handleStartWorkout() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workoutId }),
      });

      if (!response.ok) {
        throw new Error("Failed to start workout");
      }

      const session = await response.json();
      toast.success("Workout started!");
      router.push(`/workout-sessions/${session._id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to start workout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={handleStartWorkout} disabled={isLoading} className="w-full sm:w-auto">
      <Play className="mr-2 h-4 w-4" />
      {isLoading ? "Starting..." : "Start Workout"}
    </Button>
  );
}
