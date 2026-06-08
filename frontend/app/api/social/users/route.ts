'use server'
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { headers } from "next/headers"

export async function GET()
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:usersSocial${ip}`, 20, 1);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                badges: true,
                blockedUsers: true,
                avatar: true,
                image: true,
                online: true,
            }
        });
        if (!users)
            return Response.json({error: "Internal server error"}, {status: 500});
        return Response.json({users: users}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}