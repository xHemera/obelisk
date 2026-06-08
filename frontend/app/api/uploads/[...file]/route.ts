import { auth } from "@/lib/auth";
import fs from "fs";
import { headers } from "next/headers";
import path from "path";

const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".json": "application/json",
  ".pdf": "application/pdf",
};

export async function GET(req: Request, context: any) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Next may provide params as a Promise in the context; await if necessary
    const resolvedParams = context?.params && typeof context.params.then === "function"
      ? await context.params
      : context?.params;
    const fileParts = resolvedParams?.file ?? [];
    if (!fileParts || fileParts.length === 0) return new Response("Not found", { status: 404 });

    // Sanitize path by joining parts and preventing path traversal
    const safeParts = fileParts.map((p: string) => path.basename(p));

    let filePath: string;
    if (safeParts[0] === "profiles") {
      if (safeParts.length < 2) return new Response("Not found", { status: 404 });
      filePath = path.join(process.cwd(), "public", "profiles", ...safeParts.slice(1));
    } else {
      filePath = path.join(process.cwd(), "public", "images", ...safeParts);
    }

    if (!fs.existsSync(filePath)) return new Response("Not found", { status: 404 });

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] ?? "application/octet-stream";

    const data = await fs.promises.readFile(filePath);
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=0",
      },
    });
  } catch (err) {
    return new Response("Internal server error", { status: 500 });
  }
}
