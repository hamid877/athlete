import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GrowthOverviewProps {
  growthIndex: number;
  confidence: number;
  velocity: number;
}

export function GrowthOverview({ growthIndex, confidence, velocity }: GrowthOverviewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">1. Where am I?</h2>
      <Card>
        <CardHeader>
          <CardTitle>Growth Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Placeholder for Growth Overview (Milestone 2)</p>
          <pre className="mt-2 text-xs p-2 bg-secondary rounded-md overflow-x-auto">
            {JSON.stringify({ growthIndex, confidence, velocity }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
