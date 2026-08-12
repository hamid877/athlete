import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit } from 'lucide-react';

interface ProgressLearningStateProps {
  learningState: {
    status: string;
    learningProgress: number;
    workoutsCompleted: number;
    workoutsRequired: number;
    estimatedUnlock: string;
  };
  message: string;
}

export function ProgressLearningState({ learningState, message }: ProgressLearningStateProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <BrainCircuit className="w-8 h-8 text-primary" />
          </div>
        </div>
        <CardTitle>Engine Calibrating</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>{learningState.workoutsCompleted} workouts</span>
            <span>{learningState.workoutsRequired} required</span>
          </div>
          <Progress value={learningState.learningProgress} className="h-2" />
        </div>
        <p className="text-sm text-center text-muted-foreground">
          The Growth Intelligence engine needs a minimum number of sessions to establish your baseline and provide accurate predictions.
        </p>
      </CardContent>
    </Card>
  );
}
