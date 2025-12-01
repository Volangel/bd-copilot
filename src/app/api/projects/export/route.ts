import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const statusRaw = searchParams.get("status") || "";
  const statusList = statusRaw.split(",").filter(Boolean);
  const minICP = searchParams.get("minICP");
  const minMQA = searchParams.get("minMQA");

  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { url: { contains: q } },
              { categoryTags: { contains: q } },
            ],
          }
        : {}),
      ...(statusList.length > 0 ? { status: { in: statusList } } : {}),
      ...(minICP ? { icpScore: { gte: Number(minICP) } } : {}),
      ...(minMQA ? { mqaScore: { gte: Number(minMQA) } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  const header = "name,url,icpScore,mqaScore,status,nextFollowUpAt\n";
  const rows = projects
    .map((p) => {
      const vals = [p.name || "", p.url, p.icpScore ?? "", p.mqaScore ?? "", p.status, p.nextFollowUpAt ?? ""];
      return vals
        .map((v) => {
          if (v === null) return "";
          const str = String(v);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",");
    })
    .join("\n");

  const csv = header + rows;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=projects.csv",
    },
  });
}
