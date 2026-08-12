import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getFullGrowthIntelligence } from '@/lib/growth-intelligence/aggregator';
import { ProgressLearningState } from '@/components/progress/ProgressLearningState';
import { GrowthOverview } from '@/components/progress/GrowthOverview';
import { GrowthTrajectory } from '@/components/progress/GrowthTrajectory';
import { MuscleIntelligence } from '@/components/progress/MuscleIntelligence';
import { CoachInsights } from '@/components/progress/CoachInsights';

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const data = await getFullGrowthIntelligence(session.user.id);

  if (!data.hasData) {
    return (
      <div className="container max-w-4xl py-8">
        <ProgressLearningState 
          learningState={data.learningState || {
            status: 'learning',
            learningProgress: 0,
            workoutsCompleted: 0,
            workoutsRequired: 3,
            estimatedUnlock: ''
          }} 
          message={data.message || 'No growth data available yet.'} 
        />
      </div>
    );
  }


  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Intelligence</h1>
        <p className="text-muted-foreground mt-1">Your growth analysis and coaching insights.</p>
      </div>

      <GrowthOverview 
        growthIndex={data.growthIndex!} 
        confidence={data.confidence!} 
        velocity={data.velocity!} 
        trend={data.coachAnalysis!.weeklySummary.trend}
      />

      <GrowthTrajectory 
        history={data.history!} 
        forecast={data.forecast || null} 
      />

      <MuscleIntelligence 
        muscleIntelligence={data.muscleIntelligence!} 
      />

      <CoachInsights 
        coachAnalysis={data.coachAnalysis!} 
      />
    </div>
  );
}
