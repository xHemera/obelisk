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
