import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";

const BASE_XP = 125;
const BASE_RUBIS = 100;
const WINNER_SHARE = 0.8;
const LOSER_SHARE = 0.2;
const XP_PER_LEVEL = 100;

export async function POST(req: Request) {
  const h = await headers();
  const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

  const allowed = await rateLimit(redis, `rl:game_reward${ip}`, 3, 1);

  if (!allowed) {
    return Response.json({ error: "Too many request" }, { status: 429 });
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { name, isWinner, team } = await req.json();

    if (!name || typeof isWinner !== "boolean") {
      return Response.json(
        { error: "Invalid name or isWinner" },
        { status: 400 }
      );
    }

    const teamNames: string[] = Array.isArray(team) ? team : [];

    const share = isWinner ? WINNER_SHARE : LOSER_SHARE;
    const xpGained = Math.round(BASE_XP * share);
    const rubisGained = Math.round(BASE_RUBIS * share);

    const user = await prisma.user.findFirst({
      where: { name },
      select: {
        id: true,
        gameState: {
          select: {
            id: true,
            rubis: true,
            characters: {
              select: { id: true, name: true, xp: true, level: true },
            },
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

    const battleChars = user.gameState.characters.filter((c) =>
      teamNames.length > 0 ? teamNames.includes(c.name) : true
    );

    const updatedChars = await Promise.all(
      battleChars.map(async (character) => {
        const newXpTotal = character.xp + xpGained;
        const levelUps = Math.floor(newXpTotal / XP_PER_LEVEL);
        const newLevel = character.level + levelUps;
        const xpInCurrentLevel = newXpTotal % XP_PER_LEVEL;

        const updated = await prisma.character.update({
          where: { id: character.id },
          data: {
            xp: xpInCurrentLevel,
            level: newLevel,
          },
          select: { name: true, level: true, xp: true },
        });

        return {
          ...updated,
          leveledUp: levelUps > 0,
          levelsGained: levelUps,
        };
      })
    );

    await prisma.gameState.update({
      where: { id: user.gameState.id },
      data: { rubis: user.gameState.rubis + rubisGained },
    });

    return Response.json(
      {
        message: "Rewards distributed successfully",
        xpGained,
        rubisGained,
        isWinner,
        characters: updatedChars,
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
