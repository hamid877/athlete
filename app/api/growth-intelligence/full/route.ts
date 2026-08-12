import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { getFullGrowthIntelligence } from '@/lib/growth-intelligence/aggregator';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const data = await getFullGrowthIntelligence(session.user.id);
    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('Error fetching full growth intelligence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth intelligence data' },
      { status: 500 }
    );
  }
}
