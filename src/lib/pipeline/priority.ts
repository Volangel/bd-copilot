export type ProjectWithSequenceMeta = {
  id: string;
  name?: string | null;
  url: string;
  updatedAt: Date;
  hasOverdueSequenceStep: boolean;
  nextSequenceStepDueAt: Date | null;
  icpScore?: number | null;
  mqaScore?: number | null;
};

export function sortProjectsByPriority(projects: ProjectWithSequenceMeta[]): ProjectWithSequenceMeta[] {
  return [...projects].sort((a, b) => {
    // 1. Overdue steps first (by earliest due date)
    if (a.hasOverdueSequenceStep && b.hasOverdueSequenceStep) {
      const aDue = a.nextSequenceStepDueAt ? a.nextSequenceStepDueAt.getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.nextSequenceStepDueAt ? b.nextSequenceStepDueAt.getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
    }
    if (a.hasOverdueSequenceStep !== b.hasOverdueSequenceStep) {
      return a.hasOverdueSequenceStep ? -1 : 1;
    }

    // 2. Upcoming sequence steps (by scheduled date)
    if (a.nextSequenceStepDueAt && b.nextSequenceStepDueAt) {
      const timeDiff = a.nextSequenceStepDueAt.getTime() - b.nextSequenceStepDueAt.getTime();
      if (timeDiff !== 0) return timeDiff;
    }
    if (a.nextSequenceStepDueAt) return -1;
    if (b.nextSequenceStepDueAt) return 1;

    // 3. ICP score tiebreaker (higher ICP = higher priority)
    const aIcp = a.icpScore ?? 0;
    const bIcp = b.icpScore ?? 0;
    if (aIcp !== bIcp) return bIcp - aIcp;

    // 4. MQA score tiebreaker (higher MQA = higher priority)
    const aMqa = a.mqaScore ?? 0;
    const bMqa = b.mqaScore ?? 0;
    if (aMqa !== bMqa) return bMqa - aMqa;

    // 5. Final fallback: most recently updated
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
