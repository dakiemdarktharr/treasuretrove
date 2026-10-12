import sharp from 'sharp';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { ApiError } from './security';
import { partSchema, normalizeId, suggestGroup, resolveGroup } from './inventory';
import type { PartRecord } from './db';

export const publicPart = (p: PartRecord) => ({
  id: p._id.toHexString(),
  partId: p.partId,
  name: p.name,
  type: p.type,
  usage: p.usage,
  group: resolveGroup(p.group, p.usage, p.type, p.partId),
  location: p.location,
  notes: p.notes,
  quantity: p.quantity,
  photoVersion: p.photoVersion,
  updatedAt: p.updatedAt.toISOString(),
});
export function objectId(value: string) {
  if (!/^[0-9a-f]{24}$/i.test(value)) throw new ApiError(404, 'Component not found.');
  return new ObjectId(value);
}
export function parsePart(body: unknown) {
  const parsed = partSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
  const data = parsed.data;
  return {
    ...data,
    partKey: normalizeId(data.partId),
    group: data.group || suggestGroup(data.usage, data.type, data.partId),
  };
}
export async function parsePhoto(photo: unknown) {
  if (typeof photo !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(photo))
    throw new ApiError(400, 'Add a JPG, PNG or WebP picture.');
  const buffer = Buffer.from(photo.split(',')[1], 'base64');
  if (buffer.length > 2_000_000) throw new ApiError(413, 'Use a picture smaller than 2 MB.');
  try {
    const result = await sharp(buffer, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    if (result.length > 1_000_000) throw new Error('Too large');
    return { photo: result, photoVersion: randomUUID() };
  } catch {
    throw new ApiError(400, 'This picture could not be read. Try a smaller JPG, PNG or WebP.');
  }
}
