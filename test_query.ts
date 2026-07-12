
import { connectDB } from './lib/db';
import WorkoutSession from './models/WorkoutSession';

async function test() {
  await connectDB();
  const session = await WorkoutSession.findOne().sort({ startedAt: -1 });
  if (!session) {
    console.log("No session");
    process.exit(0);
  }
  
  console.log("Current session startedAt:", session.startedAt);
  
  for (const ex of session.exercises) {
    const prev = await WorkoutSession.findOne(
      {
        userId: session.userId,
        "exercises.exerciseId": ex.exerciseId,
        startedAt: { $lt: session.startedAt },
        status: "completed",
      },
      { "exercises.$": 1, startedAt: 1 }
    ).sort({ startedAt: -1 });
    console.log("Exercise:", ex.exerciseId, "Prev:", prev?.exercises[0]?.performedSets);
  }
  process.exit(0);
}
test();
