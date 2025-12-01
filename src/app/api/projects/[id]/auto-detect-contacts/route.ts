import { authOptions } from "@/lib/auth";
import { autoDetectContacts } from "@/lib/contact-workbench/autoDetectContacts";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const schema = z.object({ url: z.string().url().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const { url } = schema.parse(body);

    const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const targetUrl = url || project.url;
    const contacts = await autoDetectContacts(targetUrl);
    return NextResponse.json({ candidates: contacts });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("API_ERROR: /api/projects/[id]/auto-detect-contacts", {
      userId: session.user.id,
      projectId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to auto-detect contacts" }, { status: 500 });
  }
}
