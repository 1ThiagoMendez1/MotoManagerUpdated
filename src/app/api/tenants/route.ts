import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Return empty array since we don't have tenants anymore
  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  // Return not implemented since we don't support tenant creation
  return NextResponse.json(
    { error: 'Tenant creation not supported in single-tenant mode' },
    { status: 501 }
  );
}