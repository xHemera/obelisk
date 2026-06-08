import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { randomInt } from "crypto";
import { auth } from "@/lib/auth";

export async function GET(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:otherFriend${ip}`, 20, 1);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const {searchParams} = new URL(req.url);
        const currentUser = searchParams.get("currentUser");
        const otherUser = searchParams.get("otherUser");
        if (!currentUser || !otherUser)
            return Response.json({error: "Internal server error"}, {status: 500});

        const cUser = await prisma.user.findFirst({
            where: {name: currentUser},
            select: {id: true}
        });
        const oUser = await prisma.user.findFirst({
            where: {name: otherUser},
            select: {id: true},
        });
        if (!cUser || !oUser) return Response.json({error: "Internal server error"}, {status: 500});

        const friend = await prisma.friends.findUnique({
            where: {
                userId_friendId: {
                    userId: oUser.id,
                    friendId: cUser.id
                },
            }
        });
        return Response.json({friend: friend}, {status: 200});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}

export async function POST(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:duel${ip}`, 5, 3);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const data = await req.json();
        const { currentUser, opponent } = data;
        const roomId = randomInt(0, 1000);
        await redis.hSet("inGamePlayers", currentUser, JSON.stringify({opp: opponent, roomId: roomId}));
        await redis.hSet("inGamePlayers", opponent, JSON.stringify({opp: currentUser, roomId: roomId}));
        return Response.json({msg: "Created"}, {status: 201});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}
