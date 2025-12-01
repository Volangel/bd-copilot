import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = params;

  try {
    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result = await prisma.opportunity.updateMany({
      where: { id, userId: session.user.id },
      data: { status: "SNOOZED", nextReviewAt },
    });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, nextReviewAt });
  } catch (error) {
    console.error("snooze opportunity failed", error);
    return NextResponse.json({ error: "Failed to snooze" }, { status: 500 });
  }
}
