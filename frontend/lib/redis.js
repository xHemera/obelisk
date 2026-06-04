import { createClient } from 'redis';
export const redis = createClient({
    url: "redis://obelisk-redis:6379"
});

redis.on('error', (err) => console.log('Redis Client Error', err));

if (!redis.isOpen)
    await redis.connect();
