import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";

//remove the other user from the blocked list
export async function PUT(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:block${ip}`, 20, 1);

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
        const {currentUser, otherUser} = data;

        const cUser = await prisma.user.findFirst({
            where: {name: currentUser},
            select: {id: true, blockedUsers: true}
        });
        const oUser = await prisma.user.findFirst({
            where: {name: otherUser},
            select: {id: true}
        });
        if (!cUser || !oUser) return Response.json({error: "Internal server error"}, {status: 500});

        await prisma.user.update({
            where: {id: cUser.id},
            data: {
                blockedUsers: {
                    set: cUser.blockedUsers.filter(id => id !== oUser.id),
                }
            }
        });

        return Response.json({message: "OK"}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}

//adds the other user to the blocked list
export async function PATCH(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:block${ip}`, 20, 1);

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
        const {currentUser, otherUser} = data;

        const cUser = await prisma.user.findFirst({
            where: {name: currentUser},
            select: {id: true}
        });
        const oUser = await prisma.user.findFirst({
            where: {name: otherUser},
            select: {id: true}
        });
        if (!cUser || !oUser) return Response.json({error: "Internal server error"}, {status: 500});

        await prisma.user.update({
            where: {id: cUser.id},
            data: {
                blockedUsers: {
                    push: oUser.id
                }
            }
        });

        return Response.json({message: "OK"}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}

//adds the other user to the blocked list and remove from each their friend relation
export async function DELETE(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:block${ip}`, 20, 1);

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
            return Response.json({ error: "Unauthorized" }, { status: 401 });

        const cUser = await prisma.user.findFirst({
            where: {name: currentUser},
            select: {id: true}
        });
        const oUser = await prisma.user.findFirst({
            where: {name: otherUser},
            select: {id: true}
        });
        if (!cUser || !oUser) return Response.json({error: "Internal server error"}, {status: 500});

        await prisma.friends.deleteMany({
            where: {
                OR: [
                    { userId: cUser.id, friendId: oUser.id },
                    { userId: oUser.id, friendId: cUser.id },
                ]
            }
        });
        await prisma.user.update({
            where: {id: cUser.id},
            data: {
                blockedUsers: {
                    push: oUser.id
                }
            }
        });
        return Response.json({message: "OK"}, {status: 200});
    }
    catch {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}