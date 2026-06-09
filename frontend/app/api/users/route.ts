import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";
import { CHARACTERS } from "@/public/gameResources/heroes";

export async function GET() {
  const h = await headers();
  const ip = h
  .get("x-forwarded-for")
  ?.split(",")[0]
  .trim() || "unknown";

  const allowed = await rateLimit(redis, `rl:users${ip}`, 20, 1);

  if (!allowed) {
      console.log("Too many requests");
      return Response.json({error: "Too many request"}, {status: 429});
  }
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        badges: true,
        avatar: {
          select: {
            url: true,
          }
        },
      },
      orderBy: {
        name: "asc",
      }
    });

    const result = users.map((user) => ({
      id: user.id,
      pseudo: user.name,
      avatar: user.avatar?.url ?? user.image ?? null,
      badges: user.badges ?? [],
    }));

    return Response.json(result, {status: 200});
  } catch (error) {
    console.error("Error fetching users:", error);
    return Response.json(
      {
        error: `Internal server error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}

//ca ca doit disparaitre
export async function POST()
{
  try {
    const admin1 = await prisma.user.findFirst({
      where: {
        name: "Xoco"
      },
      select: {
        id: true,
        name: true,
      }
    })
    const admin2 = await prisma.user.findFirst({
      where: {
        name: "Hemera"
      },
      select: {
        id: true,
        name: true,
      }
    });

    if (!admin1 || !admin2) return Response.json({error: "admins not created"}, {status: 500});

    await prisma.user.updateMany({
      where: { name: { in: ["Xoco", "Hemera"] } },
      data: {
        badges: {
          set: [...new Set(["ADMIN"])]
        }
      }
    });

    await prisma.friends.createMany({
      data: [
        {
          userId: admin1.id,
          friendId: admin2.id,
          request_sent: false,
        },
        {
          userId: admin2.id,
          friendId: admin1.id,
          request_sent: false,
        }
      ]
    });
    await prisma.match_history.createMany({
      data: [
        {
          opponent: "Hemera",
          opponentTeam: ["Knight", "Assassin", "Healer"],
          playerTeam: ["Knight", "Assassin", "Healer"],
          result: "win",
          user_id: admin1.id
        },
        {
          opponent: "Xoco",
          playerTeam: ["Knight", "Assassin", "Healer"],
          opponentTeam: ["Knight", "Assassin", "Healer"],
          result: "lose",
          user_id: admin2.id
        },
        {
          opponent: "Hemera",
          playerTeam: ["Knight", "Assassin", "Healer"],
          opponentTeam: ["Knight", "Assassin", "Healer"],
          result: "lose",
          user_id: admin1.id
        },
        {
          opponent: "Xoco",
          playerTeam: ["Knight", "Assassin", "Healer"],
          opponentTeam: ["Knight", "Assassin", "Healer"],
          result: "win",
          user_id: admin2.id
        }
      ]
    });
    const admins = [admin1, admin2];
    for (const admin of admins)
    {
      const gs = await prisma.gameState.create({
        data: {
          user_id: admin.id,
          rubis: 0,
          team: ["archer, healer, assassin"],
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
        })
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
    return Response.json({msg: "Created"}, {status: 201});
  }
  catch (error)
  {
    return Response.json({error: "Internal server error"}, {status: 500});
  }
}
