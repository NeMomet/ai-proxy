import crypto from "crypto";
import { redis } from "./redis.js";

export function generateApiKey() {
  return "user_pk_" + crypto.randomBytes(24).toString("hex");
}

export async function createUser(userId, dailyLimit = 20000) {
  const apiKey = generateApiKey();

  await redis.set(`user:${apiKey}:exists`, 1);
  await redis.set(`user:${apiKey}:daily_limit`, dailyLimit);
  await redis.set(`user:${apiKey}:daily_used`, 0);
  await redis.set(`user:${apiKey}:user_id`, userId);

  return apiKey;
}

export async function verifyApiKey(apiKey) {
  const exists = await redis.get(`user:${apiKey}:exists`);
  if (!exists) return null;

  const userId = await redis.get(`user:${apiKey}:user_id`);

  return { apiKey, userId };
}