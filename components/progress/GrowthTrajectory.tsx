import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GrowthTrajectoryProps {
  history: any[];
  forecast: any;
}

export function GrowthTrajectory({ history, forecast }: GrowthTrajectoryProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">2. Am I improving?</h2>
      <Card>
        <CardHeader>
          <CardTitle>Growth Trajectory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Placeholder for Trajectory Chart (Milestone 3)</p>
        </CardContent>
      </Card>
    </div>
  );
}
