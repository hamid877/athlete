import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, Activity, ShieldAlert, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import type { CoachAnalysis } from '@/lib/growth-intelligence/coach.service';

interface CoachInsightsProps {
  coachAnalysis: CoachAnalysis;
}

export function CoachInsights({ coachAnalysis }: CoachInsightsProps) {
  const { dailyBrief, weeklySummary, recommendations, recoveryAdvice } = coachAnalysis;

  // Readiness UI logic
  let readinessColor = "text-primary";
  let readinessBg = "bg-primary/10";
  let ReadinessIcon = Activity;

  if (dailyBrief.readinessLabel === 'Recovering') {
    readinessColor = "text-yellow-500";
    readinessBg = "bg-yellow-500/10";
    ReadinessIcon = Target;
  } else if (dailyBrief.readinessLabel === 'Fatigued') {
    readinessColor = "text-destructive";
    readinessBg = "bg-destructive/10";
    ReadinessIcon = ShieldAlert;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">Coach Insights</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Brief & Readiness */}
        <Card className="flex flex-col h-full border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Daily Brief</CardTitle>
              <Badge variant={dailyBrief.readinessLabel === 'Ready' ? 'success' : dailyBrief.readinessLabel === 'Fatigued' ? 'destructive' : 'warning'}>
                {dailyBrief.readinessLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-4 items-start">
              <div className={`p-3 rounded-full shrink-0 ${readinessBg} ${readinessColor}`}>
                <ReadinessIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{dailyBrief.primaryFocus}</p>
                <p className="text-sm text-muted-foreground">{dailyBrief.advice}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                Recovery Protocol
              </span>
              <p className="text-sm">{recoveryAdvice.details}</p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weeklySummary.topAchievements.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> Achievements
                </span>
                <ul className="space-y-1.5">
                  {weeklySummary.topAchievements.map((achievement, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {weeklySummary.focusAreas.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3 text-yellow-500" /> Focus Areas
                </span>
                <ul className="space-y-1.5">
                  {weeklySummary.focusAreas.map((focus, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                      <span>{focus}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations spanning full width if available */}
        {recommendations.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Actionable Recommendations</CardTitle>
              <CardDescription>Prioritized adjustments to optimize your growth.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {recommendations.slice(0, 4).map((rec) => (
                  <div key={rec.id} className="p-4 rounded-lg bg-secondary/50 border border-border/50 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-sm leading-tight">{rec.title}</h4>
                      {rec.priority === 'critical' && (
                        <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0">Critical</Badge>
                      )}
                      {rec.priority === 'high' && (
                        <Badge variant="warning" className="shrink-0 text-[10px] px-1.5 py-0">High</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.message}</p>
                    <div className="mt-auto pt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize bg-background">{rec.category}</Badge>
                      {rec.target && (
                        <Badge variant="secondary" className="text-[10px] capitalize">{rec.target}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
