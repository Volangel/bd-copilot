import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DiagnosticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const userId = session.user.id;

  const now = new Date();

  const [projects, opportunities] = await Promise.all([
    prisma.project.findMany({ where: { userId }, include: { contacts: true, sequences: { include: { steps: true } } } }),
    prisma.opportunity.findMany({ where: { userId, status: "NEW" } }),
  ]);

  type ProjectWithRelations = (typeof projects)[number];
  type SequenceWithSteps = ProjectWithRelations["sequences"][number];
  type StepType = SequenceWithSteps["steps"][number];
  type OpportunityType = (typeof opportunities)[number];

  const projectsMissingContacts = projects.filter((p: ProjectWithRelations) => p.contacts.length === 0);
  const projectsWithSeqNoPending = projects.filter((p: ProjectWithRelations) =>
    p.sequences.some((s: SequenceWithSteps) => s.steps.length > 0 && s.steps.every((st: StepType) => st.status !== "PENDING")),
  );
  const oldOpportunities = opportunities.filter((o: OpportunityType) => now.getTime() - o.createdAt.getTime() > 7 * 24 * 60 * 60 * 1000);
  const overdueNoPending = projects.filter((p: ProjectWithRelations) => {
    const overdueFollowUp = p.nextFollowUpAt && p.nextFollowUpAt < new Date();
    const hasPendingStep = p.sequences.some((s: SequenceWithSteps) => s.steps.some((st: StepType) => st.status === "PENDING"));
    return overdueFollowUp && !hasPendingStep;
  });

  const cards: Array<{ title: string; count: number; sample: (string | null)[] }> = [
    { title: "Projects missing contacts", count: projectsMissingContacts.length, sample: projectsMissingContacts.slice(0, 5).map((p: ProjectWithRelations) => p.name || p.url) },
    { title: "Projects with sequences but no pending steps", count: projectsWithSeqNoPending.length, sample: projectsWithSeqNoPending.slice(0, 5).map((p: ProjectWithRelations) => p.name || p.url) },
    { title: "Old NEW opportunities (>7d)", count: oldOpportunities.length, sample: oldOpportunities.slice(0, 5).map((o: OpportunityType) => o.title || o.url) },
    { title: "Overdue follow-ups with no pending sequence steps", count: overdueNoPending.length, sample: overdueNoPending.slice(0, 5).map((p: ProjectWithRelations) => p.name || p.url) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">Diagnostics</h1>
        <p className="text-sm text-slate-400">Dev-only health checks for BD flows.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-sm font-semibold text-white">{c.title}</p>
            <p className="text-2xl font-bold text-emerald-300">{c.count}</p>
            <ul className="mt-2 text-xs text-slate-300 space-y-1">
              {c.sample.map((s, idx) => (
                <li key={idx}>• {s}</li>
              ))}
              {c.sample.length === 0 ? <li className="text-slate-500">No samples</li> : null}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
