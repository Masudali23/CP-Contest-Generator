import { createClient } from "redis";
import env from "./env.js";

/*
 * Pluggable cache.
 *
 * Two problems with the original implementation:
 *   1. A Redis outage called process.exit(1) and took the whole API down, even
 *      though every cache read already had an HTTP fallback behind it.
 *   2. redisClient.set(key, value, "EX", ttl) is the ioredis signature. node-redis
 *      v4/v5 expects an options object, so the TTL was silently dropped and the
 *      Codeforces problemset stayed cached forever.
 *
 * It also makes the Windows story simple: Redis has no supported native Windows
 * build, so when REDIS_URL is empty the API transparently uses an in-process
 * TTL cache instead of forcing WSL, Docker or Memurai on the user.
 */

const memoryStore = new Map();

const memoryCache = {
    kind: "memory",
    async get(key) {
        const entry = memoryStore.get(key);
        if (!entry) return null;
        if (entry.expiresAt <= Date.now()) {
            memoryStore.delete(key);
            return null;
        }
        return entry.value;
    },
    async set(key, value, ttlSeconds) {
        memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async del(key) {
        memoryStore.delete(key);
    },
    async quit() {
        memoryStore.clear();
    },
};

// Evict expired keys so a long-lived process does not grow without bound.
const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore) {
        if (entry.expiresAt <= now) memoryStore.delete(key);
    }
}, 60_000);
sweeper.unref?.();

let redisClient = null;
let cache = memoryCache;

const buildRedisCache = (client) => ({
    kind: "redis",
    async get(key) {
        try {
            return await client.get(key);
        } catch (error) {
            console.error("Redis GET failed, ignoring cache:", error.message);
            return null;
        }
    },
    async set(key, value, ttlSeconds) {
        try {
            await client.set(key, value, { EX: ttlSeconds });
        } catch (error) {
            console.error("Redis SET failed, ignoring cache:", error.message);
        }
    },
    async del(key) {
        try {
            await client.del(key);
        } catch (error) {
            console.error("Redis DEL failed, ignoring cache:", error.message);
        }
    },
    async quit() {
        try {
            await client.quit();
        } catch {
            /* already closed */
        }
    },
});

const connectCache = async () => {
    if (!env.REDIS_URL) {
        console.log("REDIS_URL not set - using the in-memory cache (fine for local development).");
        cache = memoryCache;
        return cache;
    }

    try {
        redisClient = createClient({
            url: env.REDIS_URL,
            socket: {
                // Give up reconnecting after a handful of tries instead of looping forever.
                reconnectStrategy: (retries) => (retries > 5 ? false : Math.min(retries * 200, 2000)),
            },
        });

        redisClient.on("error", (error) => {
            console.error("Redis client error:", error.message);
        });

        await redisClient.connect();
        console.log("Redis connected.");
        cache = buildRedisCache(redisClient);
    } catch (error) {
        console.warn(`Redis unavailable (${error.message}) - falling back to the in-memory cache.`);
        redisClient = null;
        cache = memoryCache;
    }

    return cache;
};

const disconnectCache = async () => {
    clearInterval(sweeper);
    await cache.quit();
};

// Proxy so importers always talk to the currently active backend.
const cacheClient = {
    get kind() {
        return cache.kind;
    },
    get: (key) => cache.get(key),
    set: (key, value, ttlSeconds) => cache.set(key, value, ttlSeconds),
    del: (key) => cache.del(key),
};

export { cacheClient, redisClient, disconnectCache };
export default connectCache;
