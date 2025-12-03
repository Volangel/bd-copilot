import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { buildContactDedupWhere } from "@/lib/contacts/dedupe";

const bodySchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  projectId: z.string().optional(),
  projectUrl: z.string().optional(),
  companyName: z.string().optional(),
  linkedinUrl: z.string().optional().nullable(),
  twitterUrlOrHandle: z.string().optional().nullable(),
  telegram: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function normalizeTwitter(handle?: string | null) {
  if (!handle) return null;
  let h = handle.trim();
  if (!h) return null;
  if (h.startsWith("http")) {
    try {
      const u = new URL(h);
      const parts = u.pathname.split("/").filter(Boolean);
      h = parts[0] ? `@${parts[0]}` : h;
    } catch {
      return null;
    }
  }
  if (!h.startsWith("@")) h = `@${h}`;
  return h;
}

function normalizeLinkedIn(url?: string | null) {
  if (!url) return null;
  let u = url.trim();
  if (!u) return null;
  if (!u.startsWith("http")) {
    u = `https://${u}`;
  }
  return u;
}

function normalizeUrlMaybe(url?: string | null) {
  if (!url) return null;
  let val = url.trim();
  if (!val) return null;
  if (!val.startsWith("http")) val = `https://${val}`;
  return val;
}

function stubUrlFromName(name?: string | null) {
  if (!name) return "https://placeholder.invalid";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `https://${slug || "placeholder"}.invalid`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = bodySchema.parse(await request.json());

    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    const role = body.role?.trim() || null;
    const linkedinUrl = normalizeLinkedIn(body.linkedinUrl);
    const twitterHandle = normalizeTwitter(body.twitterUrlOrHandle);
    const telegram = body.telegram?.trim() || null;
    const email = body.email?.trim() || null;

    // resolve project
    let projectId = body.projectId || null;
    let projectName: string | undefined;
    if (projectId) {
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: session.user.id } });
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      projectName = project.name || project.url;
    } else if (body.projectUrl) {
      const normalizedUrl = normalizeUrlMaybe(body.projectUrl);
      const existing = normalizedUrl
        ? await prisma.project.findFirst({ where: { userId: session.user.id, url: normalizedUrl } })
        : null;
      if (existing) {
        projectId = existing.id;
        projectName = existing.name || existing.url;
      } else if (normalizedUrl) {
        let hostname = normalizedUrl;
        try {
          hostname = new URL(normalizedUrl).hostname;
        } catch {
          hostname = normalizedUrl.replace(/^https?:\/\//, "");
        }
        const created = await prisma.project.create({
          data: {
            userId: session.user.id,
            url: normalizedUrl,
            name: hostname,
            status: "NOT_CONTACTED",
          },
        });
        projectId = created.id;
        projectName = created.name || created.url;
      }
    } else if (body.companyName && body.companyName.trim().length > 0) {
      const existingByName = await prisma.project.findFirst({
        where: { userId: session.user.id, name: body.companyName.trim() },
      });
      if (existingByName) {
        projectId = existingByName.id;
        projectName = existingByName.name || existingByName.url;
      } else {
        const created = await prisma.project.create({
          data: {
            userId: session.user.id,
            name: body.companyName.trim(),
            url: stubUrlFromName(body.companyName),
            status: "NOT_CONTACTED",
          },
        });
        projectId = created.id;
        projectName = created.name || created.url;
      }
    } else {
      return NextResponse.json({ error: "Provide project selection, URL, or company name." }, { status: 400 });
    }

    if (!projectId) return NextResponse.json({ error: "Project resolution failed" }, { status: 400 });

    const dedupWhere = buildContactDedupWhere(projectId, { email, linkedinUrl, twitterHandle, telegram });

    const existing = dedupWhere
      ? await prisma.contact.findFirst({
          where: dedupWhere,
        })
      : null;

    let contactId: string;
    let created = false;
    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: {
          role: existing.role || role,
          linkedinUrl: existing.linkedinUrl || linkedinUrl,
          twitterHandle: existing.twitterHandle || twitterHandle,
          telegram: existing.telegram || telegram,
          email: existing.email || email,
        },
      });
      contactId = existing.id;
    } else {
      const persona = role
        ? /founder|ceo|cto|co[- ]founder/i.test(role)
          ? "Technical founder"
          : /engineer|developer|dev|protocol/i.test(role)
            ? "Protocol engineer"
            : /bd|business|growth|ecosystem/i.test(role)
              ? "BD / ecosystem lead"
              : null
        : null;

      const contact = await prisma.contact.create({
        data: {
          projectId,
          name,
          role,
          linkedinUrl,
          twitterHandle,
          telegram,
          email,
          persona,
        },
      });
      contactId = contact.id;
      created = true;
    }

    if (body.notes) {
      await prisma.note.create({ data: { projectId, content: body.notes } });
    }

    return NextResponse.json({ projectId, contactId, projectName, contactName: name, created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || "Invalid payload" }, { status: 400 });
    }
    console.error("[QUICK_CONTACT_CAPTURE]", error);
    return NextResponse.json({ error: "Failed to quick-capture contact" }, { status: 500 });
  }
}
