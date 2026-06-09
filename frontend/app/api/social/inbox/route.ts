import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { headers } from "next/headers"

export async function GET(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:inbox${ip}`, 20, 1);

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
        const username = searchParams.get("username");
        if (!username)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
    
        const user = await prisma.user.findFirst({
            where: { name: username },
            select: { id: true }
        })

        if (!user)
            return Response.json({error: "Internal server error"}, {status: 500});

        const inboxes = await prisma.inbox.findMany({
            where: {
                inboxUser: {
                    some: {user_id: user.id}
                }
            },
            select: {
                id: true,
                inboxUser: true,
            }
        })
        if (!inboxes)
            return Response.json({error: "Internal server error"}, {status: 500});
        return Response.json({inboxes: inboxes}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}