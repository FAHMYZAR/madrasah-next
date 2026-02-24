import mongoose from "mongoose";
import { assertEnv, env } from "./env";

declare global {
  var mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global.mongooseConn || { conn: null, promise: null };
global.mongooseConn = cached;

export async function connectDb() {
  assertEnv();
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "madrasah",
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
