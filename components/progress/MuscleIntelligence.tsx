import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MuscleIntelligenceProps {
  muscleIntelligence: unknown[];
}

export function MuscleIntelligence({ muscleIntelligence }: MuscleIntelligenceProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">3. What&apos;s limiting me?</h2>
      <Card>
        <CardHeader>
          <CardTitle>Muscle Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Placeholder for Muscle Focus (Milestone 4)</p>
          <div className="hidden">{Array.isArray(muscleIntelligence) && muscleIntelligence.length}</div>
        </CardContent>
      </Card>
    </div>
  );
}
