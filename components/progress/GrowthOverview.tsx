import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, ArrowRight, Activity, Zap, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface GrowthOverviewProps {
  growthIndex: number;
  confidence: number;
  velocity: number;
  trend: string;
}

export function GrowthOverview({ growthIndex, confidence, velocity, trend }: GrowthOverviewProps) {
  // Format velocity
  const isPositive = velocity > 0;
  const isNegative = velocity < 0;
  const velocityText = `${isPositive ? '+' : ''}${velocity.toFixed(1)}/wk`;

  // Determine trend UI
  let TrendIcon = ArrowRight;
  let trendBadgeVariant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" = "secondary";
  let trendLabel = "Stable";

  if (trend === 'improving') {
    TrendIcon = ArrowUpRight;
    trendBadgeVariant = "success";
    trendLabel = "Improving";
  } else if (trend === 'declining') {
    TrendIcon = ArrowDownRight;
    trendBadgeVariant = "destructive";
    trendLabel = "Declining";
  } else if (trend === 'insufficient_data') {
    TrendIcon = Info;
    trendBadgeVariant = "secondary";
    trendLabel = "Calibrating";
  }

  // Determine Growth Index Color
  let scoreColor = "text-foreground";
  if (growthIndex >= 80) scoreColor = "text-primary";
  else if (growthIndex >= 65) scoreColor = "text-green-500";
  else if (growthIndex >= 50) scoreColor = "text-yellow-500";
  else scoreColor = "text-destructive";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">Growth Overview</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Zap className="w-32 h-32" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start mb-6">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Growth Index
              </span>
              <Badge variant={trendBadgeVariant} className="flex items-center gap-1 shadow-sm">
                <TrendIcon className="w-3 h-3" />
                {trendLabel}
              </Badge>
            </div>
            
            <div className="flex items-baseline gap-3">
              <span className={`text-6xl font-bold tracking-tighter ${scoreColor}`}>
                {Math.round(growthIndex)}
              </span>
              <span className="text-lg font-medium text-muted-foreground">/ 100</span>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className={`font-medium ${isPositive ? 'text-green-500' : isNegative ? 'text-destructive' : 'text-muted-foreground'}`}>
                {velocityText}
              </span>
              <span className="text-muted-foreground">based on recent workouts</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-center h-full space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Confidence Score</span>
                <span className="text-sm font-bold">{Math.round(confidence)}%</span>
              </div>
              <Progress value={confidence} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Higher confidence means the engine has more consistent data to analyze.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
                <p className="font-medium">{trendLabel}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Velocity</span>
                <p className="font-medium">{velocityText}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
