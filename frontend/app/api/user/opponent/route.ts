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

    const allowed = await rateLimit(redis, `rl:opponent${ip}`, 200, 10);

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
        const currentUser = searchParams.get("pseudo");
        if (!currentUser)
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        const raw = await redis.hGet("inGamePlayers", currentUser);
        if (!raw)
            return Response.json({error: "Internal server error"}, {status: 500});
        const data = JSON.parse(raw);
        const opponent = data.opp;
        const roomId = data.roomId;
        if (opponent)
        {
            const user = await prisma.user.findFirst({
                where: {
                    name: opponent,
                },
                select: {
                    image: true,
                    gameState: {select: {
                        team: true,
                    }}
                }
            });
            if (!user || !user.gameState)
                return Response.json({error: "Internal server error"}, {status: 500});
            let team: string[] = [];
            for (const i of user.gameState.team)
            {
                if (!i) continue;
                const name = i.charAt(0).toUpperCase() + i.slice(1);
                team.push(name);
            }
            return Response.json({name: opponent, team: team, avatar: user.image, roomId: roomId}, {status: 200});
        }
        return Response.json({error: "Internal server error"}, {status: 500});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}
