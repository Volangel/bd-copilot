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
  const minICPRaw = searchParams.get("minICP");
  const minMQARaw = searchParams.get("minMQA");

  // Validate numeric parameters - only use if they're valid numbers
  const minICP = minICPRaw && !isNaN(Number(minICPRaw)) ? Number(minICPRaw) : null;
  const minMQA = minMQARaw && !isNaN(Number(minMQARaw)) ? Number(minMQARaw) : null;

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
      ...(minICP !== null ? { icpScore: { gte: minICP } } : {}),
      ...(minMQA !== null ? { mqaScore: { gte: minMQA } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  const header = "name,url,icpScore,mqaScore,status,nextFollowUpAt\n";
  // Helper to escape CSV values and prevent formula injection
  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    let str = String(value);
    // Escape formula injection characters by prefixing with single quote
    // This prevents Excel/Sheets from interpreting =, +, -, @, tab, CR as formulas
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    // Escape double quotes and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = projects
    .map((p) => {
      const vals = [p.name || "", p.url, p.icpScore ?? "", p.mqaScore ?? "", p.status, p.nextFollowUpAt ?? ""];
      return vals.map(escapeCSV).join(",");
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
