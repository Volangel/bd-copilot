export type PendingStepLike = {
  scheduledAt: Date | null;
  sequence: { projectId: string };
};

export type ProjectStepMeta = {
  nextSequenceStepDueAt: Date | null;
  hasOverdueSequenceStep: boolean;
  overdueCount: number;
};

export function buildStepMeta(
  steps: PendingStepLike[],
  projectIds: string[],
  now: Date = new Date(),
): Map<string, ProjectStepMeta> {
  const map = new Map<string, ProjectStepMeta>();
  projectIds.forEach((id) =>
    map.set(id, { nextSequenceStepDueAt: null, hasOverdueSequenceStep: false, overdueCount: 0 }),
  );
  steps.forEach((s) => {
    const pid = s.sequence.projectId;
    const entry = map.get(pid);
    if (!entry) return;
    const due = s.scheduledAt || null;
    if (due && (!entry.nextSequenceStepDueAt || due < entry.nextSequenceStepDueAt)) {
      entry.nextSequenceStepDueAt = due;
    }
    if (due && due < now) {
      entry.hasOverdueSequenceStep = true;
      entry.overdueCount += 1;
    }
  });
  return map;
}
