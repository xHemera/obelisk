import prisma from "@/lib/prisma";
import { authClient } from "@/lib/auth-client";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { CHARACTERS } from "@/public/gameResources/heroes";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(req: Request)
{
    const ip = req.headers
  .get("x-forwarded-for")
  ?.split(",")[0]
  .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:role${ip}`, 5, 10);

    if (!allowed) {
        return new Response("Too many requests", { status: 429 });
    }

    const data = await req.json();
    const { name, email, password } = data;
    const apiKey = req.headers.get('apiKey');
    if (apiKey !== process.env.API_KEY)
        return Response.json({error: "Unauthorized"}, {status: 401});
    try
    {
        const user = await prisma.user.findFirst({
            where: { name: name },
            select: { badges: true }
        });
        if (user && user.badges.includes("ADMIN"))
            return Response.json({error: "Not acceptable"}, {status: 406});

        await authClient.signUp.email({
            name: name,
            email: email,
            password: password,
        });
        await prisma.user.updateMany({
            where: { name: name },
            data: {
                badges: { push: "ADMIN" }
            },
        });
        const userId = await prisma.user.findFirst({
            where: { name: name },
            select: {
                id: true,
                gameState: true,
            }
        });
        if (!userId)
            return Response.json({error: "Internal server error"}, {status: 500});

        const gs = await prisma.gameState.create({
            data: {
                user_id: userId.id,
                rubis: 0,
            }
        });
        if (!gs)
            return Response.json({error: "Internal server error"}, {status: 500});

        for (const character of CHARACTERS)
        {
            const char = await prisma.character.create({
                data: {
                gameStateId: gs.id,
                name: character.identity.name,
                hp: character.baseStats.hp,
                level: 1,
                xp: 0,
                }
            });
            if (!char)
                return Response.json({error: "Internal server error"}, {status: 500});
            for (const spell of character.skills)
            {
                await prisma.spell.create({
                    data: {
                        characterId: char.id,
                        name: spell.info.name,
                        type: spell.type,
                        mpCost: spell.manaCost,
                        level: 1,
                        xp: 0,
                    }
                });
            }
        }
    }
    catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Internal server error";
        return Response.json({ error: message }, { status: 500 });
    }
    return Response.json({ status: 200 });
}

export async function PATCH(req: Request)
{
    const ip = req.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:role${ip}`, 5, 1);

    if (!allowed) {
        return new Response("Too many requests", { status: 429 });
    }

    const body = await req.json();
    const { user, isModo } = body;

    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!isModo)
        {
            await prisma.user.update({
                where: { id: user },
                data: {
                    badges: { push: "MODERATOR" }
                }
            });
        }
        else
        {
            await prisma.user.update({
                where: { id: user },
                data: {
                    badges: { set: [] }
                }
            });
        }
        return Response.json({success: true}, {status: 200})
    }
    catch (error: unknown)
    {
        const message = error instanceof Error ? error.message : "Internal server error";
        return Response.json({ error: message }, { status: 500 });
    }
}