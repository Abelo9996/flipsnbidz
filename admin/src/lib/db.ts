import mongoose from "mongoose";

function getMongoURI(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please define the MONGODB_URI environment variable");
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };
if (!global.mongoose) global.mongoose = cached;

export default async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoURI()).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
