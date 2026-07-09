"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <AlertCircle
        className="mb-4 h-10 w-10 text-[var(--danger)]"
        strokeWidth={1.75}
      />
      <h3 className="text-base font-medium text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
