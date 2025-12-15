import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const followUpSchema = z.object({
  contactId: z.string(),
  days: z.enum(["1", "3", "7"]),
  channel: z.string().default("email"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { contactId, days, channel } = followUpSchema.parse(body);

    const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const contact = await prisma.contact.findFirst({ where: { id: contactId, projectId: id } });
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(days));

    const content = `Follow-up (${days}-day) to ${contact.name}: Quick nudge on ${project.name || project.url}. Ready to sync next steps?`;

    const message = await prisma.outreachMessage.create({
      data: {
        projectId: id,
        contactId,
        channel,
        content,
      },
    });

    await prisma.project.update({
      where: { id, userId: session.user.id },
      data: { nextFollowUpAt: dueDate },
    });

    await prisma.note.create({
      data: {
        projectId: id,
        content: `Scheduled ${days}-day follow-up for ${contact.name} on ${channel}.`,
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("Failed to schedule follow-up", error);
    return NextResponse.json({ error: "Failed to schedule follow-up" }, { status: 500 });
  }
}
