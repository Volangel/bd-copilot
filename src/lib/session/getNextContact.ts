import { prisma } from "@/lib/prisma";
import { Contact, Project } from "@prisma/client";
import { pickNextSequenceStep } from "@/lib/sequences/nextStep";

export type NextContactCandidate = {
  project: Project;
  contact: Contact;
};

export async function getNextContact(userId: string): Promise<NextContactCandidate | null> {
  const steps = await prisma.sequenceStep.findMany({
    where: { status: "PENDING", sequence: { userId } },
    include: { sequence: { include: { project: true, contact: true } } },
  });
  if (steps.length === 0) return null;

  const picked = pickNextSequenceStep(
    steps.map((s) => ({ id: s.id, stepNumber: s.stepNumber, status: s.status, scheduledAt: s.scheduledAt })),
    new Date(),
  );
  if (!picked) return null;

  const full = steps.find((s) => s.id === picked.id);
  if (!full || !full.sequence.contact || !full.sequence.project) return null;

  return { project: full.sequence.project, contact: full.sequence.contact };
}
