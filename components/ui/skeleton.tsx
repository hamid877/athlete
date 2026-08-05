import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-md)] bg-[var(--border)]/60 dark:bg-[var(--border)]", className)}
      {...props}
    />
  );
}

export { Skeleton };
