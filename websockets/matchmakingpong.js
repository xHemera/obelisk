import { createClient } from 'redis';
import { io } from "./server.js"

export const redis = createClient({
    url: "redis://obelisk-redis:6379"
});

redis.on('error', (err) => console.log('Redis Client Error', err));

if (!redis.isOpen)
    await redis.connect();

redis.on("error", (err) => console.log("Redis error", err));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function matchmaking()
{
    while (true)
    {
        try {
            const count = await redis.lLen("pong_queue");
            if (count >= 2)
            {
                const p1 = await redis.lPop("pong_queue");
                const p2 = await redis.lPop("pong_queue");

                const test = await redis.hGetAll("online_users");
                const receiverSockP1 = await redis.hGet("online_users", p1);
                const receiverSockP2 = await redis.hGet("online_users", p2);

                if (!p1 || !p2 || !receiverSockP1 || !receiverSockP2)
                {
                    if (p1) await redis.lPush("pong_queue", p1);
                    if (p2) await redis.lPush("pong_queue", p2);
                    await sleep(1000);
                    continue;
                }
                await redis.hSet("inGamePlayers", p1, p2);
                await redis.hSet("inGamePlayers", p2, p1);
                
                // Clean up the finished match flag if this is a rematch
                const matchKey = [p1, p2].sort().join(":");
                const matchFinishedKey = `pong:finished:${matchKey}`;
                await redis.del(matchFinishedKey);
                console.log("[Pong Matchmaking] Cleaned up match flag for rematch:", matchKey);
                
                const users = await redis.hGetAll("inGamePlayers");
                console.log(users);
                io.to(receiverSockP1).emit("matchFoundPong");
                io.to(receiverSockP2).emit("matchFoundPong");
            }
            await sleep(1000);
        }
        catch (err) {
            console.log(err);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

matchmaking();