import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  twitterHandle: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  telegram: z.string().optional().nullable(),
  persona: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const payload = contactSchema.parse(body);

    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const existing = await prisma.contact.findMany({
      where: {
        projectId: project.id,
      },
      select: { name: true, email: true, linkedinUrl: true },
    });
    const dupKey = `${payload.name.toLowerCase()}-${(payload.email || "").toLowerCase()}-${(payload.linkedinUrl || "").toLowerCase()}`;
    const isDup = existing.some(
      (c) =>
        `${(c.name || "").toLowerCase()}-${(c.email || "").toLowerCase()}-${(c.linkedinUrl || "").toLowerCase()}` === dupKey,
    );
    if (isDup) {
      return NextResponse.json({ error: "Contact already exists for this project" }, { status: 400 });
    }

    const contact = await prisma.contact.create({
      data: {
        projectId: project.id,
        name: payload.name,
        role: payload.role || null,
        linkedinUrl: payload.linkedinUrl || null,
        twitterHandle: payload.twitterHandle || null,
        email: payload.email || null,
        telegram: payload.telegram || null,
        persona: payload.persona || null,
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors?.[0]?.message ?? "Invalid payload";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[api/projects/[id]/contacts] error", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { contactId, persona } = await request.json();
    if (!contactId) return NextResponse.json({ error: "Missing contactId" }, { status: 400 });

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, projectId: (await params).id, project: { userId: session.user.id } },
    });
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.contact.update({
      where: { id: contact.id },
      data: { persona: persona ? String(persona) : null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[api/projects/[id]/contacts] PATCH error", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}
