import { MongoServerError } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, type PartRecord } from '@/lib/db';
import { apiFailure, ApiError, checkOrigin, readBody, requireUser } from '@/lib/security';
import { objectId, parsePart, parsePhoto, publicPart } from '@/lib/parts-server';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const _id = objectId((await params).id);
    const body = await readBody(req);
    const collection = (await getDb()).collection<PartRecord>('parts');
    if (Object.hasOwn(body, 'delta')) {
      if (!Number.isSafeInteger(body.delta) || body.delta === 0 || Math.abs(body.delta) > 1_000_000)
        throw new ApiError(400, 'Enter a whole number between 1 and 1,000,000.');
      const part = await collection.findOneAndUpdate(
        {
          _id,
          ownerId: user._id,
          quantity: body.delta < 0 ? { $gte: -body.delta } : { $lte: 1_000_000 - body.delta },
        },
        { $inc: { quantity: body.delta }, $set: { updatedAt: new Date() } },
        { returnDocument: 'after', projection: { photo: 0 } },
      );
      if (!part) {
        if (!(await collection.findOne({ _id, ownerId: user._id }, { projection: { _id: 1 } })))
          throw new ApiError(404, 'Component not found.');
        throw new ApiError(
          409,
          'Not enough stock, or quantity would exceed 1,000,000. Refresh and try again.',
        );
      }
      return NextResponse.json({ part: publicPart(part) });
    }
    const input = parsePart(body);
    const photo = body.photo ? await parsePhoto(body.photo) : {};
    // Metadata edits do not overwrite concurrent stock changes. Quantity is adjusted separately.
    const { quantity: _quantity, ...metadata } = input;
    let part;
    try {
      part = await collection.findOneAndUpdate(
        { _id, ownerId: user._id },
        { $set: { ...metadata, ...photo, updatedAt: new Date() } },
        { returnDocument: 'after', projection: { photo: 0 } },
      );
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000)
        throw new ApiError(409, 'This ID is already in your inventory.');
      throw e;
    }
    if (!part) throw new ApiError(404, 'Component not found.');
    return NextResponse.json({ part: publicPart(part) });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const result = await (
      await getDb()
    )
      .collection<PartRecord>('parts')
      .deleteOne({ _id: objectId((await params).id), ownerId: user._id });
    if (!result.deletedCount) throw new ApiError(404, 'Component not found.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiFailure(error);
  }
}
