import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string(),
  role: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  twitterHandle: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telegram: z.string().optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const contacts = z.array(contactSchema).parse(body.contacts ?? []);
    if (contacts.length === 0) return NextResponse.json({ error: "No contacts provided" }, { status: 400 });

    const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const existing = await prisma.contact.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true, email: true, linkedinUrl: true },
    });
    const seen = new Set(
      existing.map((c) => `${(c.name || "").toLowerCase()}-${(c.email || "").toLowerCase()}-${(c.linkedinUrl || "").toLowerCase()}`),
    );

    const toCreate = contacts.filter((c) => {
      const key = `${c.name.toLowerCase()}-${(c.email || "").toLowerCase()}-${(c.linkedinUrl || "").toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (toCreate.length === 0) {
      return NextResponse.json({ created: [], message: "Nothing to import (all duplicates)" });
    }

    const created = await Promise.all(
      toCreate.map((c) =>
        prisma.contact.create({
          data: {
            projectId: project.id,
            name: c.name,
            role: c.role || null,
            linkedinUrl: c.linkedinUrl || null,
            twitterHandle: c.twitterHandle || null,
            email: c.email || null,
            telegram: c.telegram || null,
          },
        }),
      ),
    );

    return NextResponse.json({ created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/projects/[id]/contacts/bulk] error", error);
    return NextResponse.json({ error: "Failed to import contacts" }, { status: 500 });
  }
}
