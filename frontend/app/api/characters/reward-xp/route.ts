import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import type { PlayerResources } from "@/components/organisms/characters/types";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const h = await headers();
  const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

  const allowed = await rateLimit(redis, `rl:reward_xp${ip}`, 10, 1);

  if (!allowed) {
    console.log("Too many requests");
    return Response.json({ error: "Too many request" }, { status: 429 });
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await req.json();
    const { name, xpGained } = data;

    if (!name || typeof xpGained !== "number" || xpGained < 0) {
      return Response.json(
        { error: "Invalid name or xpGained" },
        { status: 400 }
      );
    }

    // Trouver l'utilisateur et ses personnages
    const user = await prisma.user.findFirst({
      where: { name: name },
      select: {
        id: true,
        gameState: {
          select: {
            id: true,
            characters: {
              select: { id: true },
            },
            rubis: true,
          },
        },
      },
    });

    if (!user || !user.gameState) {
      return Response.json(
        { error: "User or gameState not found" },
        { status: 404 }
      );
    }

    // Ajouter XP à tous les personnages et gérer les level ups
    await Promise.all(
      user.gameState.characters.map(async (character) => {
        const char = await prisma.character.findUnique({
          where: { id: character.id },
          select: { xp: true, level: true }
        });
        
        if (!char) return;
        
        const newXpTotal = char.xp + xpGained;
        const XP_PER_LEVEL = 100;
        const levelUps = Math.floor(newXpTotal / XP_PER_LEVEL);
        const newLevel = char.level + levelUps;
        const xpInCurrentLevel = newXpTotal % XP_PER_LEVEL;
        
        return prisma.character.update({
          where: { id: character.id },
          data: {
            xp: xpInCurrentLevel,
            level: newLevel
          },
        });
      })
    );

    const resources: PlayerResources = { ruby: user.gameState.rubis };

    return Response.json(
      {
        message: "XP rewarded successfully",
        xpGained,
        resources,
      },
      { status: 200 }
    );
  } catch (e) {
    console.log(e);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
