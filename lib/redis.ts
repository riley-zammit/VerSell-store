import { Redis } from '@upstash/redis'

// Shared by the store and the eve agent, so no `server-only` or Next imports.
// Created on first use so importing this file never needs the Redis env vars.
// The Upstash connection uses the REDIS_STORAGE_ prefix, so Redis.fromEnv() wouldn't find it.
let client: Redis | undefined
export function redis() {
    if (!client) {
        client = new Redis({
            url: process.env.REDIS_STORAGE_KV_REST_API_URL!,
            token: process.env.REDIS_STORAGE_KV_REST_API_TOKEN!,
        })
    }
    return client
}
