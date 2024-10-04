import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/app/mongodb';

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('app');
    const collection = db.collection('legacy-metrics_monthly');
    
    // Filter data for BMU "Kenyatta" and project necessary fields
    const data = await collection.aggregate([
      {
        $match: {
          BMU: "Kenyatta"
        }
      },
      {
        $project: {
          date: 1,
          mean_trip_catch: 1,
          mean_trip_price: 1,
          mean_effort: 1,
          mean_cpue: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]).toArray();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching data:', (error as Error).message);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
