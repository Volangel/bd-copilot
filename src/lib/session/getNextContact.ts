import { prisma } from "@/lib/prisma";
import { pickNextSequenceStep } from "@/lib/sequences/nextStep";

// Inline types to avoid Prisma import issues
type Contact = {
  id: string;
  projectId: string;
  name: string;
  role: string | null;
  persona: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  telegram: string | null;
  email: string | null;
  channelPreference: string | null;
  createdAt: Date;
};

type Project = {
  id: string;
  userId: string;
  name: string | null;
  url: string;
  summary: string | null;
  categoryTags: string | null;
  stage: string | null;
  targetUsers: string | null;
  painPoints: string | null;
  icpScore: number | null;
  icpExplanation: string | null;
  bdAngles: string | null;
  mqaScore: number | null;
  mqaReasons: string | null;
  playbookSummary: string | null;
  playbookPersonas: string | null;
  playbookAngles: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
  github: string | null;
  medium: string | null;
  status: string;
  lastContactAt: Date | null;
  nextFollowUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

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

  type StepType = (typeof steps)[number];
  const picked = pickNextSequenceStep(
    steps.map((s: StepType) => ({ id: s.id, stepNumber: s.stepNumber, status: s.status, scheduledAt: s.scheduledAt })),
    new Date(),
  );
  if (!picked) return null;

  const full = steps.find((s: StepType) => s.id === picked.id);
  if (!full || !full.sequence.contact || !full.sequence.project) return null;

  return { project: full.sequence.project, contact: full.sequence.contact };
}
