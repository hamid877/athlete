import { Dumbbell, AlertTriangle } from "lucide-react";
import type { MuscleAnalysis } from "@/lib/growth-intelligence";

export default function MuscleIntelligenceSection({ muscles }: { muscles: MuscleAnalysis[] }) {
  if (!muscles || muscles.length === 0) return null;

  // Sort by growth potential descending, but put bottlenecks first if they are critical
  const sortedMuscles = [...muscles].sort((a, b) => {
    if (a.isBottleneck && !b.isBottleneck) return -1;
    if (!a.isBottleneck && b.isBottleneck) return 1;
    return b.growthPotentialScore - a.growthPotentialScore;
  });

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
            <Dumbbell className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Muscle Intelligence</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Individual muscle group analysis and bottlenecks</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedMuscles.map((m, idx) => {
          const statusColor = 
            m.status === 'excellent' ? 'bg-green-500' :
            m.status === 'good' ? 'bg-green-400' :
            m.status === 'fair' ? 'bg-yellow-500' :
            m.status === 'poor' ? 'bg-orange-500' :
            'bg-red-500';

          return (
            <div key={idx} className={`flex flex-col gap-3 p-4 rounded-2xl border ${m.isBottleneck ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--border)] bg-[var(--background)]'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">{m.muscle}</h3>
                  {m.isBottleneck && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 uppercase tracking-wide">
                      <AlertTriangle className="h-3 w-3" />
                      Bottleneck
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1">
                  <span className="font-bold text-lg leading-none">{m.growthPotentialScore.toFixed(0)}</span>
                  <span className="text-[10px] text-[var(--text-muted)] mb-0.5">GI</span>
                </div>
              </div>

              <div className="h-1.5 w-full bg-[var(--border)] rounded-full overflow-hidden">
                <div className={`h-full ${statusColor}`} style={{ width: `${m.growthPotentialScore}%` }}></div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] font-semibold">Volume</span>
                  <span className="text-sm font-medium">{m.weeklySets} sets</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] font-semibold">Stimulus</span>
                  <span className="text-sm font-medium">{m.stimulusScore.toFixed(0)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] font-semibold">Recovery</span>
                  <span className="text-sm font-medium">{m.recoveryPercent.toFixed(0)}%</span>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] mt-1 bg-[var(--surface)] p-2 rounded-lg border border-[var(--border)]">
                {m.recommendation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
