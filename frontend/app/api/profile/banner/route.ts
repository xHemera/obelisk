import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const h = await headers();
  const ip = h
  .get("x-forwarded-for")
  ?.split(",")[0]
  .trim() || "unknown";

  const allowed = await rateLimit(redis, `rl:banner${ip}`, 20, 60);

  if (!allowed) {
      console.log("Too many requests");
      return Response.json({error: "Too many request"}, {status: 429});
  }

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type");

    // Handle FormData uploads
    if (contentType?.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return Response.json({ error: "Missing file" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type || "image/jpeg";

      // Delete old banner if exists
      await prisma.profileBanner.deleteMany({
        where: { userId: session.user.id },
      });

      // Create new banner
      const banner = await prisma.profileBanner.create({
        data: {
          userId: session.user.id,
          mimeType,
          data: buffer,
        },
      });

      // Return data URL for immediate preview
      const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

      return Response.json({
        id: banner.id,
        dataUrl,
      });
    }

    return Response.json({ error: "Unsupported content type" }, { status: 400 });
  } catch (error) {
    console.error("Banner upload error:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const h = await headers();
  const ip = h
  .get("x-forwarded-for")
  ?.split(",")[0]
  .trim() || "unknown";

  const allowed = await rateLimit(redis, `rl:banner${ip}`, 20, 60);

  if (!allowed) {
      console.log("Too many requests");
      return Response.json({error: "Too many request"}, {status: 429});
  }
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "Missing userId" }, { status: 400 });
    }

    const banner = await prisma.profileBanner.findUnique({
      where: { userId },
    });

    if (!banner) {
      return Response.json({ error: "Banner not found" }, { status: 404 });
    }

    return new Response(banner.data, {
      headers: {
        "Content-Type": banner.mimeType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Banner fetch error:", error);
    return Response.json({ error: "Fetch failed" }, { status: 500 });
  }
}
