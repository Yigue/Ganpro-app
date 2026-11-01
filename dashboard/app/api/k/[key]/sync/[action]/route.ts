import type { NextRequest } from 'next/server';
import { handleSync } from '@/lib/sync/handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ key: string; action: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { key, action } = await params;
  return handleSync(request, action, key);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const { key, action } = await params;
  return handleSync(request, action, key);
}
