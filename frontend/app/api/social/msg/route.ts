'use server'
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

    const allowed = await rateLimit(redis, `rl:msg${ip}`, 20, 1);

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
        const user = searchParams.get("user");
        const otherUser = searchParams.get("otherUser");
        const skip = parseInt(searchParams.get("skip") || "0", 10);
        const take = parseInt(searchParams.get("take") || "20", 10);
        
        if (!user || !otherUser)
            return Response.json({error: "Internal server error"}, {status: 500});

        const user1 = await prisma.user.findFirst({
            where: { name: user },
            select: { id: true }
        })
        const user2 = await prisma.user.findFirst({
            where: { name: otherUser },
            select: { id: true }
        })

        if (!user1 || !user2) return Response.json({error: "Internal server error"}, {status: 500});

        const msgs = await prisma.inbox.findFirst({
            where: {
                inboxUser: {
                    some: {user_id: user1.id}
                },
                AND: {
                    inboxUser: {
                        some: {user_id: user2.id}
                    }
                }
            },
            select: {messages: { 
                include: { attachments: true },
                orderBy: { createdAt: "desc" },
                skip: skip,
                take: take
            } }
        })
        if (!msgs) return Response.json({error: "Internal server error"}, {status: 500});
        return Response.json({msgs: msgs.messages.reverse()}, {status: 200});
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

    const allowed = await rateLimit(redis, `rl:msg${ip}`, 5, 1);

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
        const {sender, receiver, msg, draftIds} = data;

        const user1 = await prisma.user.findFirst({
            where: { name: sender },
            select: {id: true}
        })
        const user2 = await prisma.user.findFirst({
            where: { name: receiver },
            select: {id: true}
        })

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
            },
            select: { id: true }
        })

        if (!inbox)
            return Response.json({error: "Internal server error"}, {status: 500});

        const message = await prisma.messages.create({
            data: {
                message: msg,
                user: {
                    connect: { id: user1.id }
                },
                inbox: {
                    connect: { id: inbox.id }
                }
            },
            select: {
                attachments: true,
                id: true
            }
        });

        for (const id of draftIds)
        {
            await prisma.attachment.update({
                where: { id: id },
                data: {
                    msg_id: message.id
                }
            })
        }

        await prisma.inbox_users.updateMany({
            where: {
                inbox_id: inbox.id,
                user_id: user2.id
            },
            data: {
                unread_messages: {increment: 1}
            }
        })

        if (!message)
            return Response.json({error: "Internal server error"}, {status: 500});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }

    return Response.json({message: "Created"}, {status: 201});
}