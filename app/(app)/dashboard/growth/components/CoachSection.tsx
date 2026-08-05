import { MessageSquare, HeartPulse, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { CoachAnalysis } from "@/lib/growth-intelligence";

export default function CoachSection({ analysis }: { analysis: CoachAnalysis }) {
  const { dailyBrief, trainingReadiness, recoveryAdvice, weeklySummary } = analysis;

  const readinessColor = 
    trainingReadiness.status === 'optimal' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
    trainingReadiness.status === 'moderate' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' :
    'text-red-500 bg-red-500/10 border-red-500/20';

  const readinessIcon =
    trainingReadiness.status === 'optimal' ? <CheckCircle2 className="h-5 w-5" /> :
    trainingReadiness.status === 'moderate' ? <HeartPulse className="h-5 w-5" /> :
    <ShieldAlert className="h-5 w-5" />;

  return (
    <div className="flex flex-col gap-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 md:p-8 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
        <MessageSquare className="h-48 w-48 text-[var(--primary)]" />
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-subtle)]">
          <MessageSquare className="h-5 w-5 text-[var(--primary)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Coach Briefing</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        {/* Daily Brief */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs">Today&apos;s Focus</h3>
            <div className={`px-3 py-1 flex items-center gap-1.5 rounded-full border text-xs font-semibold ${readinessColor}`}>
              {readinessIcon}
              {dailyBrief.readinessLabel}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[var(--text-primary)] font-medium text-lg leading-snug">
              {dailyBrief.primaryFocus}
            </p>
            <p className="text-[var(--text-muted)] text-sm">
              {dailyBrief.advice}
            </p>
          </div>
          
          <div className="mt-2 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-1 block">Recovery Protocol</span>
            <p className="text-sm text-[var(--text-primary)]">{recoveryAdvice.details}</p>
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-xs flex items-center gap-2">
            Weekly Summary
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${weeklySummary.weeklyVelocity >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {weeklySummary.weeklyVelocity > 0 ? '+' : ''}{weeklySummary.weeklyVelocity.toFixed(1)}/wk
            </span>
          </h3>
          
          <div className="flex flex-col gap-3">
            {weeklySummary.topAchievements.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-[var(--text-muted)]">Highlights</span>
                <ul className="flex flex-col gap-2">
                  {weeklySummary.topAchievements.map((achievement, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      {achievement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {weeklySummary.focusAreas.length > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-xs text-[var(--text-muted)]">Areas to Improve</span>
                <ul className="flex flex-col gap-2">
                  {weeklySummary.focusAreas.map((area, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
