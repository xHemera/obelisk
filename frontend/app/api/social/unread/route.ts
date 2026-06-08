import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";

export async function GET() {
  const h = await headers();
  const ip = h
  .get("x-forwarded-for")
  ?.split(",")[0]
  .trim() || "unknown";

  const allowed = await rateLimit(redis, `rl:unread${ip}`, 20, 1);

  if (!allowed) {
      console.log("Too many requests");
      return Response.json({error: "Too many request"}, {status: 429});
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.inbox_users.findMany({
      where: { user_id: session.user.id },
      select: { unread_messages: true },
    });

    const totalUnread = rows.reduce((sum, row) => sum + (row.unread_messages ?? 0), 0);

    return Response.json({ totalUnread }, {status: 200});
  } catch (error) {
    console.error("Error fetching social unread count:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request)
{
  const h = await headers();
  const ip = h
  .get("x-forwarded-for")
  ?.split(",")[0]
  .trim() || "unknown";

  const allowed = await rateLimit(redis, `rl:unread${ip}`, 5, 1);

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
    const {sender, receiver} = data;

    const user1 = await prisma.user.findFirst({
      where: { name: sender },
      select: {id: true}
    });
    const user2 = await prisma.user.findFirst({
        where: { name: receiver },
    select: {id: true}
    });

    if (!user1 || !user2) return Response.json({error: "Internal server error"}, {status: 500});

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
  });

  if (!inbox)
    return Response.json({error: "Internal server error"}, {status: 500});

    await prisma.inbox_users.updateMany({
        where: {
            inbox_id: inbox.id,
            user_id: user1.id
    },
        data: {
            unread_messages: 0
        }
    });
    return Response.json({message: "OK"}, {status: 200});
  }
  catch {
    return Response.json({error: "Internal server error"}, {status: 500});
  }
}
