import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";
import { writeFile } from "fs/promises";
import { headers } from "next/headers";
import path from "path";

export async function POST(req: Request)
{
    const h = await headers();
    const ip = h
    .get("x-forwarded-for")
    ?.split(",")[0]
    .trim() || "unknown";

    const allowed = await rateLimit(redis, `rl:upload${ip}`, 5, 1);

    if (!allowed) {
        console.log("Too many requests");
        return Response.json({error: "Too many request"}, {status: 429});
    }

    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const formData = await req.formData();
        const files = formData.getAll("file");
        const type = formData.get("type") as string | null;

        if (!files) {
        return new Response("No file uploaded", { status: 400 });
        }
        
        const uploadDir = 
          type === "profile" ? "public/profiles" :
          type === "background" ? "public/backgrounds" :
          "public/images";

        for (const file of files)
        {
            if (!(file instanceof File)) continue;

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const safeName = file.name.replace(/\s+/g, "-");
            const fileName = `${Date.now()}-${safeName}`;
            const filePath = path.join(process.cwd(), uploadDir, fileName);
            await writeFile(filePath, buffer);

            return Response.json({
                name: fileName,
                status: 200
            });
        }
    }
    catch (error) {
        console.error(error);
        return new Response("Upload failed", { status: 500 });
    }
}