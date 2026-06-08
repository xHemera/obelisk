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

    const allowed = await rateLimit(redis, `rl:home${ip}`, 20, 1);

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
        if (!currentUser)
            return Response.json({error: "Internal server error"}, {status: 500});
        const user = await prisma.user.findFirst({
            where: {
                name: currentUser,
            },
            select: {
                gameState: true,
            }
        });
        if (!user || !user.gameState)
            return Response.json({error: "Internal server error"}, {status: 500});
        return Response.json({team: user.gameState.team}, {status: 200});
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

    const allowed = await rateLimit(redis, `rl:home${ip}`, 10, 3);

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
        await redis.rPush("players_queue", userPseudo);
        return Response.json({msg: "OK"}, {status: 200});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}

export async function PUT(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:home${ip}`, 20, 1);

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
        const { userPseudo, char } = data;
        const user = await prisma.user.findFirst({
            where: { name: userPseudo },
            select: {
                gameState: true,
            }
        });
        if (!user || !user.gameState)
            return Response.json({error: "Internal server error"}, {status: 500});
        const cleanTeam = char.filter((c: string | null) => c !== null);
        await prisma.gameState.update({
            where: { id: user.gameState.id },
            data: {
                team: {
                    set: cleanTeam,
                }
            }
        });
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

    const allowed = await rateLimit(redis, `rl:home${ip}`, 10, 3);

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
        await redis.lRem("players_queue", 1, userPseudo);
        return Response.json({msg: "OK"}, {status: 200});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}