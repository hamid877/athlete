import { Construction } from "lucide-react";

export default function GoalsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-subtle)]">
        <Construction className="h-7 w-7 text-[var(--primary)]" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Goals</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Coming soon — track your fitness milestones here.</p>
      </div>
    </div>
  );
}
