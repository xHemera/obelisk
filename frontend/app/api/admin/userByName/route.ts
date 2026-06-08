import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";

export async function GET(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:userByName${ip}`, 5, 1);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    try {
        const {searchParams} = new URL(req.url);
        const reporter = searchParams.get("reporter");
        const reported = searchParams.get("reported");
        if (!reporter || !reported)
            return Response.json({error: "Internal server error"}, {status: 500});
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const results: Record<string, string> = {};
        const user1 = await prisma.user.findFirst({
            where: { name: reporter },
            select: {
                id: true,
            }
        });
        const user2 = await prisma.user.findFirst({
            where: { name: reported },
            select: {
                id: true,
            }
        });
        if (!user1 || !user2) return Response.json({error: "Internal server error"}, {status: 500});
        results[user1.id] = reporter;
        results[user2.id] = reported;
        return Response.json({results: results}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}