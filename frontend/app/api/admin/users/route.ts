import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";

export async function GET()
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:users${ip}`, 20, 1);

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
                banned: true,
                image: true,
            }
        });
        return Response.json({users: users}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}