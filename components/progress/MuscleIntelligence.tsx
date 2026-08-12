import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Activity, Flame } from 'lucide-react';
import type { MuscleAnalysis } from '@/lib/growth-intelligence/muscle-analysis.service';

interface MuscleIntelligenceProps {
  muscleIntelligence: MuscleAnalysis[];
}

export function MuscleIntelligence({ muscleIntelligence }: MuscleIntelligenceProps) {
  if (!muscleIntelligence || muscleIntelligence.length === 0) {
    return null;
  }

  // Filter out completely inactive muscles (0 sets, not a bottleneck)
  const activeMuscles = muscleIntelligence.filter(m => m.weeklySets > 0 || m.isBottleneck);

  // Sort: Bottlenecks first, then by growth potential descending
  const sortedMuscles = [...activeMuscles].sort((a, b) => {
    if (a.isBottleneck && !b.isBottleneck) return -1;
    if (!a.isBottleneck && b.isBottleneck) return 1;
    return b.growthPotentialScore - a.growthPotentialScore;
  });

  if (sortedMuscles.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">3. What&apos;s limiting me?</h2>
        <Card>
          <CardHeader>
            <CardTitle>Muscle Intelligence</CardTitle>
            <CardDescription>Track per-muscle growth potential and bottlenecks.</CardDescription>
          </CardHeader>
          <CardContent className="h-32 flex items-center justify-center text-muted-foreground text-sm text-center">
            Log workouts targeting specific muscle groups to see detailed intelligence here.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">3. What&apos;s limiting me?</h2>
      <Card>
        <CardHeader>
          <CardTitle>Muscle Intelligence</CardTitle>
          <CardDescription>Per-muscle growth potential, recovery state, and active bottlenecks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sortedMuscles.map((muscle) => {
              // Determine status colors
              let statusColor = "text-muted-foreground";
              let progressColorClass = "bg-primary";
              let badgeVariant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" = "secondary";
              
              if (muscle.status === 'excellent' || muscle.status === 'good') {
                statusColor = "text-green-500";
                progressColorClass = "bg-green-500";
                badgeVariant = "success";
              } else if (muscle.status === 'fair') {
                statusColor = "text-yellow-500";
                progressColorClass = "bg-yellow-500";
                badgeVariant = "warning";
              } else if (muscle.status === 'poor' || muscle.status === 'critical') {
                statusColor = "text-destructive";
                progressColorClass = "bg-destructive";
                badgeVariant = "destructive";
              }

              return (
                <div key={muscle.muscle} className={`flex flex-col gap-3 p-4 rounded-lg border ${muscle.isBottleneck ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-secondary/20'}`}>
                  {/* Header Row */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{muscle.muscle}</h3>
                      {muscle.isBottleneck && (
                        <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-1.5 py-0 h-5">
                          <AlertTriangle className="w-3 h-3" />
                          Bottleneck
                        </Badge>
                      )}
                    </div>
                    <Badge variant={badgeVariant} className="capitalize text-xs">
                      {muscle.status}
                    </Badge>
                  </div>

                  {/* Growth Potential Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" /> Growth Potential
                      </span>
                      <span className={`font-bold ${statusColor}`}>{Math.round(muscle.growthPotentialScore)}/100</span>
                    </div>
                    {/* Using a standard div instead of Progress component to easily override color */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div 
                        className={`h-full ${progressColorClass} transition-all`} 
                        style={{ width: `${muscle.growthPotentialScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Sub-metrics */}
                  <div className="grid grid-cols-2 gap-4 mt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Recovery</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div 
                            className={`h-full ${muscle.recoveryPercent >= 80 ? 'bg-green-500' : muscle.recoveryPercent >= 50 ? 'bg-yellow-500' : 'bg-destructive'} transition-all`} 
                            style={{ width: `${muscle.recoveryPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{Math.round(muscle.recoveryPercent)}%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Weekly Sets</span>
                      <div className="flex items-center gap-1">
                        <Flame className={`w-3.5 h-3.5 ${muscle.weeklySets > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-medium">{muscle.weeklySets}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation / Insight */}
                  {muscle.recommendation && (
                    <div className="mt-2 pt-3 border-t border-border/50 flex gap-2 items-start">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {muscle.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
