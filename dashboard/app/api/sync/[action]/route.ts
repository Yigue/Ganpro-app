import type { NextRequest } from 'next/server';
import { handleSync } from '@/lib/sync/handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ action: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  return handleSync(request, (await params).action, null);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  return handleSync(request, (await params).action, null);
}
