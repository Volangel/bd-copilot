import { authOptions } from "@/lib/auth";
import { enrichExistingProjectFromUrl } from "@/lib/projects/enrichProject";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    if (!projectId) return NextResponse.json({ error: "Missing project id" }, { status: 400 });

    const result = await enrichExistingProjectFromUrl({ projectId, userId: session.user.id });

    return NextResponse.json({ project: result.project, score: result.score });
  } catch (error: unknown) {
    console.error("[PROJECT_ENRICH_ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to enrich project";
    const status = message.includes("no URL")
      ? 400
      : message.includes("not found or not owned")
      ? 404
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
