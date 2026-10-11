import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb, type SessionRecord, type UserRecord } from './db';
import { type NextRequest, NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, value] = hash.split(':');
  const actual = await derive(password, salt);
  const expected = Buffer.from(value, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const SESSION_COOKIE = 'tt_session';
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const db = await getDb();
  const session = await db
    .collection<SessionRecord>('sessions')
    .findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  return db
    .collection<UserRecord>('users')
    .findOne({ _id: session.userId }, { projection: { email: 1 } });
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new ApiError(401, 'Please sign in to continue.');
  return user;
}
export function checkOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowedHost = req.headers.get('host');
  if (!origin || new URL(origin).host !== allowedHost)
    throw new ApiError(403, 'Request not allowed. Refresh and try again.');
}
export async function readBody(req: NextRequest, max = 3_000_000) {
  if (!req.headers.get('content-type')?.startsWith('application/json'))
    throw new ApiError(415, 'Send JSON data.');
  if (Number(req.headers.get('content-length') || 0) > max)
    throw new ApiError(413, 'Image is too large. Choose a smaller picture.');
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, 'Missing request data.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new ApiError(413, 'Image is too large. Choose a smaller picture.');
    }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body');
    return body;
  } catch {
    throw new ApiError(400, 'Invalid request data.');
  }
}
export async function rateLimit(key: string, maximum: number, windowMs: number) {
  const db = await getDb();
  const bucket = Math.floor(Date.now() / windowMs);
  const id = hashToken(`${key}:${bucket}`);
  const result = await db
    .collection<{ _id: string; count: number; expiresAt: Date }>('limits')
    .findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) } },
      { upsert: true, returnDocument: 'after' },
    );
  if ((result?.count || 0) > maximum)
    throw new ApiError(429, 'Too many attempts. Please try again later.');
}
export function apiFailure(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  // Never log connection strings, request bodies, passwords or database error messages.
  console.error(
    'TreasureTrove request failed:',
    error instanceof Error ? error.name : 'UnknownError',
  );
  return NextResponse.json(
    { error: 'Could not reach your inventory. Please try again.' },
    { status: 503 },
  );
}
