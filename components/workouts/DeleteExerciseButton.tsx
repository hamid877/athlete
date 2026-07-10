"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface DeleteExerciseButtonProps {
  workoutId: string;
  exerciseId: string;
}

export function DeleteExerciseButton({ workoutId, exerciseId }: DeleteExerciseButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this exercise from the workout?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workouts/${workoutId}/exercise/${exerciseId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to delete exercise");
      }

      toast.success("Exercise deleted successfully!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-[var(--danger)] hover:text-[var(--danger-hover)] hover:bg-[var(--danger-subtle)]"
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete Exercise</span>
    </Button>
  );
}
