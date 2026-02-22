import { NextResponse } from 'next/server';

export async function GET(req) {
  // stats explorer logic requires complex queries to static tables, 
  // keeping this minimal for Phase 3
  return NextResponse.json({ message: 'Stats Explorer Endpoint OK' });
}
