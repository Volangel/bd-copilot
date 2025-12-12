import { authOptions } from "@/lib/auth";
import { extractUrlsFromText } from "@/lib/discovery/urlFromText";
import { createOpportunities } from "@/lib/opportunity/createOpportunities";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const schema = z.object({ text: z.string().min(1), sourceLabel: z.string().optional() });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { text, sourceLabel } = schema.parse(body);
    const urls = extractUrlsFromText(text);
    const attempted = urls.length;

    if (urls.length === 0) {
      return NextResponse.json({ message: "No URLs detected", created: [] });
    }

    const result = await createOpportunities({
      userId: session.user.id,
      urls,
      sourceType: "TEXT_SCAN",
      sourceLabel,
      rawContext: text,
      maxCount: 10,
    });

    return NextResponse.json({
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
      attempted,
      created: result.created,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("API_ERROR: /api/discover/scan-text", {
      userId: session.user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to scan text" }, { status: 500 });
  }
}
