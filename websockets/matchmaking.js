import { createClient } from 'redis';
import { io } from "./server.js"
import { randomInt } from 'node:crypto';

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
            const count = await redis.lLen("players_queue");
            if (count >= 2)
            {
                const p1 = await redis.lPop("players_queue");
                const p2 = await redis.lPop("players_queue");

                const receiverSockP1 = await redis.hGet("online_users", p1);
                const receiverSockP2 = await redis.hGet("online_users", p2);

                if (!p1 || !p2 || !receiverSockP1 || !receiverSockP2)
                {
                    if (p1) await redis.lPush("players_queue", p1);
                    if (p2) await redis.lPush("players_queue", p2);
                    await sleep(1000);
                    continue;
                }
                const roomId = randomInt(0, 1000);
                await redis.hSet("inGamePlayers", p1, JSON.stringify({opp: p2, roomId: roomId}));
                await redis.hSet("inGamePlayers", p2, JSON.stringify({opp: p1, roomId: roomId}));
                const users = await redis.hGetAll("inGamePlayers");
                console.log(users);
                io.to(receiverSockP1).emit("matchFound");
                io.to(receiverSockP2).emit("matchFound");
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