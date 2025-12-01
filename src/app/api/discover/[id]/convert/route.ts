import { authOptions } from "@/lib/auth";
import { convertOpportunityToProject } from "@/lib/discovery/convertOpportunityToProject";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = params;

  try {
    const project = await convertOpportunityToProject({ opportunityId: id, userId: session.user.id });
    return NextResponse.json(project);
  } catch (error) {
    console.error("convert opportunity failed", error);
    return NextResponse.json({ error: "Failed to convert opportunity" }, { status: 500 });
  }
}
