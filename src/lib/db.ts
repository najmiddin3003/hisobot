import mongoose from "mongoose";

export class MissingDatabaseUriError extends Error {
  constructor() {
    super("MONGODB_URI .env.local faylida ko'rsatilmagan");
    this.name = "MissingDatabaseUriError";
  }
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Dev rejimida (hot reload) va serverless'da ulanish qayta-qayta ochilmasligi uchun global keshlanadi
const globalForMongoose = globalThis as unknown as { _mongoose?: MongooseCache };
const cache = (globalForMongoose._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new MissingDatabaseUriError();

    cache.promise = mongoose
      .connect(uri, {
        dbName: process.env.MONGODB_DB || "hisob-nazorat",
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      })
      .catch((error) => {
        cache.promise = null;
        throw error;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  if (!cache.conn) return;
  await cache.conn.disconnect();
  cache.conn = null;
  cache.promise = null;
}
