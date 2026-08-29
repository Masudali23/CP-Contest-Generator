import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on("error", (err) => {
    console.log("Redis Client Error:", err);
});

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log("Redis connected!");
    } catch (error) {
        console.log("Redis connection error:", error);
        process.exit(1);
    }
};

export { redisClient };
export default connectRedis;