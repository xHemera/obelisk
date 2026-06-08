import prisma from "@/lib/prisma";
import { PROFILE_ICONS } from "@/lib/profile-icons";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { auth } from "@/lib/auth";

export async function GET() {
  const h = await headers();
  const ip = h
  .get("x-forwarded-for")
  ?.split(",")[0]
  .trim() || "unknown";

  const allowed = await rateLimit(redis, `rl:avatars${ip}`, 5, 1);

  if (!allowed) {
      console.log("Too many requests");
      return Response.json({error: "Too many request"}, {status: 429});
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    let avatars = await prisma.avatar.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    if (avatars.length === 0) {
      await prisma.avatar.createMany({
        data: PROFILE_ICONS.map((icon) => ({
          id: icon.id,
          name: icon.name,
          type: icon.type,
          url: icon.url,
          accent: icon.accent,
          accentHover: icon.accentHover,
        })),
        skipDuplicates: true,
      });

      avatars = await prisma.avatar.findMany({
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });
    }

    return Response.json(avatars, {status: 200});
  } catch (error) {
    console.error("Error fetching avatars:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
