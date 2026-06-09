import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { authClient } from "@/lib/auth-client";

export async function GET(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:game${ip}`, 200, 10);

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
        const pseudo = searchParams.get("pseudo");
        if (!pseudo)
            return Response.json({error: "Internal server error"}, {status: 500});

        const user = await prisma.user.findFirst({
            where: { name: pseudo },
            select: {
                gameState: {
                    select: {
                        characters : {
                            select: {
                                spells: {
                                    select: { level: true } 
                                },
                                name: true,
                                level: true,
                            },
                        },
                        team: true,
                    } 
                }
            }
        });
        if (!user || !user.gameState || !user.gameState.characters)
            return Response.json({error: "Internal server error"}, {status: 500});
        let team: string[] = [];
        for (const i of user.gameState.team)
        {
            const name = i.charAt(0).toUpperCase() + i.slice(1);
            team.push(name);
        }
        let levels: number[] = [];
        for (const c of team)
        {
            levels.push(user.gameState.characters.find((i) => i.name === c)?.level!);
        }

        let spellsLevels: number[] = [];
        for (const c of team)
        {
            const char = user.gameState.characters.find((i) => i.name === c);
            if (!char)
                return Response.json({error: "Internal server error"}, {status: 500});
            char.spells.map((i) => (spellsLevels.push(i.level)));
        }
        return Response.json({team: team, levels: levels, spellsLevels: spellsLevels}, {status: 200});
    }
    catch (e) {
        console.log(e);
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

    const allowed = await rateLimit(redis, `rl:user${ip}`, 20, 60);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    try {
        const data = await req.json();
        const { name, email, password } = data;
        await authClient.signUp.email({
            name,
            email,
            password,
        });
        return Response.json({msg: "Created"}, {status: 201});
    }
    catch (e) {
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}

export async function PUT(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:user${ip}`, 20, 60);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const reqData = await req.json();
        const { email, password } = reqData;
        const { data } = await authClient.signIn.email({
            email,
            password,
        });
        return Response.json({data: data}, {status: 200});
    }
    catch (e) {
        console.log(e);
        return Response.json({error: "Internal server error"}, {status: 500});
    }
}

export async function PATCH()
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:user${ip}`, 20, 60);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    const session = await auth.api.getSession({ headers: h });
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
        where: {
            id: session.user.id
        },
        select: { banned: true }
    })
    if (!user) return Response.json({error: "User not found"}, {status: 404});
    if (user.banned === true) return Response.json({error: "Forbidden"}, {status: 403});

    const userUpdate = await prisma.user.update({
        where: { id: session.user.id },
        data: {
            online: true
        }
    });
    if (userUpdate) return Response.json(null, {status: 201});
    return Response.json({error: "Unprocessable entity"}, {status: 422});
}