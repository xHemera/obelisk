import prisma from "@/lib/prisma";
import { headers } from "next/headers";
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

    const allowed = await rateLimit(redis, `rl:contact${ip}`, 20, 1);

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
        const addUser = searchParams.get("addUser");
        if (!currentUser || !addUser)
            return Response.json({ error: "Unauthorized" }, { status: 401 });

        const user1 = await prisma.user.findFirst({
            where: { name: currentUser }
        });
        const user2 = await prisma.user.findFirst({
            where: { name: addUser }
        });

        if (!user1 || !user2)
            return Response.json({error: "Internal server error"}, {status: 500});

        const inbox = await prisma.inbox.findFirst({
            where: {
                inboxUser: {
                    some: { user_id: user1.id }
                },
                AND: { 
                    inboxUser: {
                        some: { user_id: user2.id }
                    }
                }
            }
        });
        if (inbox) return Response.json({result: false}, {status: 200});
        return Response.json({message: "OK"}, {status: 200});
    }
    catch {
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

    const allowed = await rateLimit(redis, `rl:contact${ip}`, 20, 1);

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
        const {currentUser, addUser} = data;

        const user1 = await prisma.user.findFirst({
            where: { name: currentUser }
        });
        const user2 = await prisma.user.findFirst({
            where: { name: addUser }
        });

        if (!user1 || !user2) return Response.json({error: "Internal server error"}, {status: 500});

        await prisma.inbox.create({
            data: {
                user: { connect:
                    { id: user1.id }
                },
                inboxUser: {
                    create: [
                        {user_id: user1.id, unread_messages: 0},
                        {user_id: user2.id, unread_messages: 0},
                    ]
                }
            }
        });
        return Response.json({message: "Created"}, {status: 201});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}
