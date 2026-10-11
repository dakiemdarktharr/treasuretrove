import { MongoClient, type Db, type ObjectId, type Binary } from 'mongodb';
import type { GroupName } from './inventory';

export type UserRecord = {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  recoveryHash: string;
  createdAt: Date;
};
export type SessionRecord = { _id: string; userId: ObjectId; expiresAt: Date };
export type PartRecord = {
  _id: ObjectId;
  ownerId: ObjectId;
  partId: string;
  partKey: string;
  quantity: number;
  name: string;
  type: string;
  usage: string;
  group: GroupName;
  location: string;
  notes: string;
  photo: Binary | Buffer;
  photoVersion: string;
  createdAt: Date;
  updatedAt: Date;
};
declare global {
  var treasureDb: Promise<Db> | undefined;
}

export function getDb(): Promise<Db> {
  if (!global.treasureDb) {
    global.treasureDb = (async () => {
      const uri = process.env.MONGODB_URI;
      if (!uri) throw new Error('Database configuration missing');
      const client = new MongoClient(uri, { maxPoolSize: 8, serverSelectionTimeoutMS: 10000 });
      try {
        await client.connect();
        const db = client.db(process.env.MONGODB_DB || 'treasuretrove');
        await Promise.all([
          db.collection('users').createIndex({ email: 1 }, { unique: true }),
          db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
          db.collection('sessions').createIndex({ userId: 1 }),
          db.collection('parts').createIndex({ ownerId: 1, partKey: 1 }, { unique: true }),
          db.collection('limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        ]);
        return db;
      } catch (error) {
        await client.close();
        throw error;
      }
    })().catch((error) => {
      global.treasureDb = undefined;
      throw error;
    });
  }
  return global.treasureDb;
}
