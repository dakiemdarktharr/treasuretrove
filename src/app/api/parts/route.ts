import { ObjectId, MongoServerError } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, type PartRecord } from '@/lib/db';
import {
  apiFailure,
  ApiError,
  checkOrigin,
  readBody,
  requireUser,
  rateLimit,
} from '@/lib/security';
import { parsePart, parsePhoto, publicPart } from '@/lib/parts-server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();
    const parts = await db
      .collection<PartRecord>('parts')
      .find({ ownerId: user._id }, { projection: { photo: 0 } })
      .sort({ partKey: 1 })
      .toArray();
    return NextResponse.json(
      { parts: parts.map(publicPart) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    await rateLimit(`create:${user._id}`, 100, 3600_000);
    const body = await readBody(req);
    const input = parsePart(body);
    const photo = await parsePhoto(body.photo);
    const db = await getDb();
    const now = new Date();
    const part: PartRecord = {
      _id: new ObjectId(),
      ownerId: user._id,
      ...input,
      ...photo,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await db.collection<PartRecord>('parts').insertOne(part);
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000)
        throw new ApiError(409, 'This ID is already in your inventory. Open it to add stock.');
      throw e;
    }
    return NextResponse.json({ part: publicPart(part) }, { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
