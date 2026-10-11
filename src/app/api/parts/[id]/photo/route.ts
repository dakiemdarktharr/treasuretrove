import { NextRequest, NextResponse } from 'next/server';
import { getDb, type PartRecord } from '@/lib/db';
import { apiFailure, ApiError, requireUser } from '@/lib/security';
import { objectId } from '@/lib/parts-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const part = await (
      await getDb()
    )
      .collection<PartRecord>('parts')
      .findOne(
        { _id: objectId((await params).id), ownerId: user._id },
        { projection: { photo: 1 } },
      );
    if (!part) throw new ApiError(404, 'Picture not found.');
    const buffer = Buffer.isBuffer(part.photo) ? part.photo : part.photo.buffer;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
