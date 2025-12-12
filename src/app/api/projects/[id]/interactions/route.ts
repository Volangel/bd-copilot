import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

// Valid values for channel and type fields
const VALID_CHANNELS = ["email", "linkedin", "twitter", "telegram", "discord", "phone", "meeting", "other"];
const VALID_TYPES = ["outbound", "inbound"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const form = await request.formData();
    const channelRaw = (form.get("channel") as string) || "other";
    const typeRaw = (form.get("type") as string) || "outbound";

    // Validate channel and type values
    const channel = VALID_CHANNELS.includes(channelRaw) ? channelRaw : "other";
    const type = VALID_TYPES.includes(typeRaw) ? typeRaw : "outbound";
    const title = (form.get("title") as string) || null;
    const body = (form.get("body") as string) || null;
    const contactIdRaw = (form.get("contactId") as string) || "";
    const contactId = contactIdRaw || null;
    const occurredAtRaw = (form.get("occurredAt") as string) || "";
    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();

    const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, projectId: id, project: { userId: session.user.id } }
      });
      if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const interaction = await prisma.interaction.create({
      data: {
        userId: session.user.id,
        projectId: id,
        contactId,
        channel,
        type,
        title,
        body,
        occurredAt,
      },
    });

    return NextResponse.json(interaction);
  } catch (err) {
    console.error("API_ERROR: /api/projects/[id]/interactions", {
      userId: session.user.id,
      projectId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to log interaction" }, { status: 500 });
  }
}
