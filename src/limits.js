import { redis } from "./redis.js";

export async function checkLimit(apiKey) {
  const used = Number(await redis.get(`user:${apiKey}:used`)) || 0;
  const limit = Number(await redis.get(`user:${apiKey}:limit`)) || 100;

  if (used >= limit) {
    return { allowed: false, used, limit };
  }

  return { allowed: true, used, limit };
}

export async function addUsage(apiKey, usage = 1) {
  await redis.incrby(`user:${apiKey}:used`, usage);
}