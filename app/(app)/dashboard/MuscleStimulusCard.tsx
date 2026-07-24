"use client";

import { Zap } from "lucide-react";

import type {
StimulusAPIResponse
} from "@/lib/types/api.ts";

interface MuscleStimulusCardProps {
  data: StimulusAPIResponse | null;
  error: boolean;
}

export function MuscleStimulusCard({ data, error }: MuscleStimulusCardProps) {
  return (
    <section aria-label="Muscle Stimulus">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-[var(--primary)]" />
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
          Recent Stimulus
        </h2>
      </div>

      {error ? (
        <div className="rounded-2xl bg-[var(--surface)] border border-red-500/20 p-5 text-center">
          <p className="text-sm text-red-500">Unable to load stimulus data.</p>
        </div>
      ) : !data || data.stimulus.length === 0 ? (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No recent stimulus data. Log a workout to see muscle activation!
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 flex flex-col gap-4">
          {data.stimulus.map((item) => {
            let barColor = "bg-[var(--primary)]";
            if (item.quality === "Very Low" || item.quality === "Low") {
              barColor = "bg-amber-500";
            } else if (item.quality === "Good") {
              barColor = "bg-green-500";
            } else if (item.quality === "High") {
              barColor = "bg-blue-500";
            } else if (item.quality === "Excellent") {
              barColor = "bg-purple-500";
            }

            return (
              <div key={item.muscle} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--text-primary)] capitalize">
                    {item.muscle}
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {item.stimulusScore} / 100
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-[var(--background-subtle)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(100, Math.max(0, item.stimulusScore))}%` }}
                  />
                </div>

                <div className="flex flex-col gap-1 mt-1 text-xs text-[var(--text-muted)]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--text-secondary)]">
                      {item.quality}
                    </span>
                  </div>
                  <p className="opacity-80 leading-tight text-[10px]">
                    {item.recommendation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
