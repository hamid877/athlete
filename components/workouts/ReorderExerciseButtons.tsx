"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ReorderExerciseButtonsProps {
  workoutId: string;
  exerciseId: string;
  isFirst: boolean;
  isLast: boolean;
}

export function ReorderExerciseButtons({ workoutId, exerciseId, isFirst, isLast }: ReorderExerciseButtonsProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleReorder(direction: "up" | "down") {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/exercise/${exerciseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ direction }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to reorder exercise");
      }

      toast.success("Exercise reordered!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleReorder("up")}
        disabled={isUpdating || isFirst}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowUp className="h-4 w-4" />
        <span className="sr-only">Move Up</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleReorder("down")}
        disabled={isUpdating || isLast}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowDown className="h-4 w-4" />
        <span className="sr-only">Move Down</span>
      </Button>
    </>
  );
}
