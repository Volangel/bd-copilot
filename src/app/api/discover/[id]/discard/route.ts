import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = params;

  try {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.opportunity.update({
      where: { id, userId: session.user.id },
      data: { status: "DISCARDED" },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("discard opportunity failed", error);
    return NextResponse.json({ error: "Failed to discard" }, { status: 500 });
  }
}
