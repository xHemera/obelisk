import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:opponent${ip}`, 200, 10);

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
        const currentUser = searchParams.get("pseudo");
        if (!currentUser)
            return Response.json({error: "User pseudo is required"}, {status: 400});
        const raw = await redis.hGet("inGamePlayers", currentUser);
        if (!raw)
            return Response.json({error: "Opponent not found - start a matchmaking first"}, {status: 404});
        const opponent = raw;
        return Response.json({name: opponent}, {status: 200});
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

    const allowed = await rateLimit(redis, `rl:pong${ip}`, 10, 3);

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
        const {userPseudo} = data;
        await redis.rPush("pong_queue", userPseudo);
        return Response.json({msg: "OK"}, {status: 200});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}

export async function DELETE(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:pong${ip}`, 10, 1);

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
        const userPseudo = searchParams.get("userPseudo");
        if (!userPseudo)
            return Response.json({error: "Internal server error"}, {status: 500});
        
        // Enlever le joueur de la queue
        await redis.lRem("pong_queue", 1, userPseudo);
        return Response.json({msg: "OK"}, {status: 200});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}
