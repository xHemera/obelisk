import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";

//ban users
export async function PUT(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rlban:${ip}`, 5, 1);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const data = await req.json();
        const {username} = data;
        if (!session || !session.user || session.user.name !== username) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.user.updateMany({
            where: { name: username,
                NOT: { badges: { has: "ADMIN" } }
            },
            data: { banned: true }
        });
        return Response.json({message: "OK"}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}

//unban users
export async function PATCH(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:ban${ip}`, 5, 1);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    try {
        const data = await req.json();
        const {username} = data;
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user || session.user.name !== username) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.user.updateMany({
            where: { name: username },
            data: { banned: false }
        });
        return Response.json({message: "OK"}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}
