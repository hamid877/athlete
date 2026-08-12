import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CoachInsightsProps {
  coachAnalysis: any;
}

export function CoachInsights({ coachAnalysis }: CoachInsightsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">4. What should I do?</h2>
      <Card>
        <CardHeader>
          <CardTitle>Coach Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Placeholder for Coach Insights (Milestone 2)</p>
        </CardContent>
      </Card>
    </div>
  );
}
