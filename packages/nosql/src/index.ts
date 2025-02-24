import type Mongoose from "mongoose";
import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: typeof Mongoose | null;
    promise: Promise<typeof Mongoose> | null;
  };
}

const databaseUrl = process.env.MONGODB_URI;
if (!databaseUrl) throw new Error("DATABASE_URL is not defined");

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function getDb() {
  if (process.env.NODE_ENV !== 'production') {
    cached.conn = null;
    cached.promise = null;
  }

  if (cached.conn) {
    // Check if connection is ready
    if (cached.conn.connection?.readyState === 1) {
      return cached.conn;
    }
    // If not ready, clear the cache
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true, // Change to true to allow buffering
      serverSelectionTimeoutMS: 5000, // Add timeout
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose
      .connect(databaseUrl as string, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to establish MongoDB connection:', e);
    throw e;
  }

  return cached.conn;
}

export default getDb;
