import { Trophy } from "lucide-react";
import type { PersonalRecord } from "@/lib/types/api";

export function RecentPRsCard({
  prs,
  error,
}: {
  prs: PersonalRecord[] | null;
  error: boolean;
}) {
  return (
    <section aria-label="Recent Personal Records">
      <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        Recent PRs
      </h2>

      {error ? (
        <div className="rounded-2xl bg-[var(--surface)] border border-red-500/20 p-5 text-center">
          <p className="text-sm text-red-500">Unable to load personal records.</p>
        </div>
      ) : !prs || prs.length === 0 ? (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
          <p className="text-sm text-[var(--text-muted)]">No personal records yet. Keep lifting!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {prs.slice(0, 3).map((pr, idx) => (
            <div
              key={`${pr.exerciseId}-${pr.type}-${idx}`}
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {pr.exerciseName}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {new Date(pr.achievedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-500">
                  {pr.value}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">
                  {pr.type.replace("_", " ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
