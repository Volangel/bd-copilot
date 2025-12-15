import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    // Use updateMany to avoid race condition - it won't throw if record doesn't exist
    const result = await prisma.opportunity.updateMany({
      where: { id, userId: session.user.id },
      data: { status: "DISCARDED" },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("discard opportunity failed", error);
    return NextResponse.json({ error: "Failed to discard" }, { status: 500 });
  }
}
