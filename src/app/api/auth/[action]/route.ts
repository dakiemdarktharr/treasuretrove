import { randomBytes } from 'node:crypto';
import { ObjectId, MongoServerError } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, type UserRecord, type SessionRecord } from '@/lib/db';
import {
  apiFailure,
  ApiError,
  checkOrigin,
  hashPassword,
  verifyPassword,
  hashToken,
  rateLimit,
  readBody,
  SESSION_COOKIE,
} from '@/lib/security';

export const runtime = 'nodejs';
const credentials = z.object({
  email: z
    .email('Enter a valid email.')
    .max(254)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(12, 'Use at least 12 characters.').max(128),
  remember: z.boolean().default(false),
  recovery: z.string().max(100).optional(),
});

export async function POST(req: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    checkOrigin(req);
    const { action } = await context.params;
    if (!['login', 'register', 'logout', 'recover'].includes(action))
      throw new ApiError(404, 'Not found.');
    const db = await getDb();
    if (action === 'logout') {
      const token = req.cookies.get(SESSION_COOKIE)?.value;
      if (token)
        await db.collection<SessionRecord>('sessions').deleteOne({ _id: hashToken(token) });
      const response = NextResponse.json({ ok: true });
      response.cookies.set(SESSION_COOKIE, '', {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }
    const input = credentials.safeParse(await readBody(req, 4096));
    if (!input.success) throw new ApiError(400, input.error.issues[0].message);
    const { email, password, remember, recovery } = input.data;
    const ip =
      req.headers.get('x-vercel-forwarded-for') ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      'local';
    await rateLimit(`auth:ip:${ip}`, 40, 15 * 60 * 1000);
    await rateLimit(`auth:${action}:${email}`, action === 'register' ? 5 : 12, 15 * 60 * 1000);
    let user = await db.collection<UserRecord>('users').findOne({ email });
    let recoveryKey: string | undefined;
    if (action === 'register') {
      await rateLimit(`register:${ip}`, 8, 60 * 60 * 1000);
      if (user)
        throw new ApiError(
          409,
          'Unable to create this account. Try signing in or using another email.',
        );
      recoveryKey = randomBytes(24).toString('hex');
      user = {
        _id: new ObjectId(),
        email,
        passwordHash: await hashPassword(password),
        recoveryHash: hashToken(recoveryKey),
        createdAt: new Date(),
      };
      try {
        await db.collection<UserRecord>('users').insertOne(user);
      } catch (e) {
        if (e instanceof MongoServerError && e.code === 11000)
          throw new ApiError(409, 'Unable to create this account. Try signing in.');
        throw e;
      }
    } else if (action === 'recover') {
      if (!user || !recovery || hashToken(recovery.trim()) !== user.recoveryHash)
        throw new ApiError(401, 'Email or recovery key is incorrect.');
      recoveryKey = randomBytes(24).toString('hex');
      const updated = await db
        .collection<UserRecord>('users')
        .updateOne(
          { _id: user._id, recoveryHash: user.recoveryHash },
          {
            $set: {
              passwordHash: await hashPassword(password),
              recoveryHash: hashToken(recoveryKey),
            },
          },
        );
      if (!updated.modifiedCount)
        throw new ApiError(401, 'This recovery key has already been used.');
      await db.collection<SessionRecord>('sessions').deleteMany({ userId: user._id });
    } else {
      // Match the expensive hash check even for an unknown account.
      const hash =
        user?.passwordHash || '00000000000000000000000000000000:'.concat('00'.repeat(64));
      const valid = await verifyPassword(password, hash);
      if (!user || !valid) throw new ApiError(401, 'Email or password is incorrect.');
    }
    const token = randomBytes(32).toString('hex');
    const lifetime = remember ? 30 * 86400 : 12 * 3600;
    await db
      .collection<SessionRecord>('sessions')
      .insertOne({
        _id: hashToken(token),
        userId: user!._id,
        expiresAt: new Date(Date.now() + lifetime * 1000),
      });
    const response = NextResponse.json({ ok: true, recoveryKey });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(remember ? { maxAge: lifetime } : {}),
    });
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
