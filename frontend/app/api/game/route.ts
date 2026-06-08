import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";

export async function POST(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:friend${ip}`, 20, 1);

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
        const { pseudo, team, oppName, oppTeam, winner } = data;
        const user = await prisma.user.findFirst({
            where: { name: pseudo },
            select: {
                id: true,
            }
        })
        if (!user)
            return Response.json({error: "Internal Server Error"}, {status: 500});
        if (winner)
        {
            await prisma.match_history.create({
                data: {
                    result: "win",
                    playerTeam: team,
                    opponentTeam: oppTeam,
                    opponent: oppName,
                    user_id: user.id,
                }
            });
        }
        else
        {
            await prisma.match_history.create({
                data: {
                    result: "lose",
                    playerTeam: team,
                    opponentTeam: oppTeam,
                    opponent: oppName,
                    user_id: user.id,
                }
            });
        }
        return Response.json({msg: "Created"}, {status: 201});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal Server Error"}, {status: 500});
    }
}