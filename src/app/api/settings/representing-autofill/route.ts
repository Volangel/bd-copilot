import { authOptions } from "@/lib/auth";
import { analyzeProject } from "@/lib/ai/aiService";
import { prisma } from "@/lib/prisma";
import fetchHtml from "@/lib/scraper/fetchHtml";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

const schema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { url } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const userPlan = user?.plan ?? "free";
    const icp = await prisma.iCPProfile.findUnique({ where: { userId: session.user.id } });

    const html = await fetchHtml(url).catch((err) => {
      console.error("[api/settings/representing-autofill] fetch failed", { message: (err as Error).message });
      return { html: "", text: "" };
    });

    const analysis = await analyzeProject({
      html: html.text,
      url,
      icpProfile: icp ?? null,
      userPlan,
      representingProject: null,
    });

    const suggestion = {
      name: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      website: url,
      oneLiner: analysis.summary?.slice(0, 180) ?? "",
      productCategory: (analysis.categoryTags?.[0] as string | undefined) || "",
      primaryValueProp: analysis.painPoints || "",
      idealCustomer: analysis.targetUsers || "",
      keyDifferentiators: (analysis.bdAngles || []).join(" | "),
      toneGuidelines: "",
    };

    return NextResponse.json({ suggestion });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[api/settings/representing-autofill] error", error);
    return NextResponse.json({ error: "Failed to autofill" }, { status: 500 });
  }
}
