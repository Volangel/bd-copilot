export type ProjectWithSequenceMeta = {
  id: string;
  name?: string | null;
  url: string;
  updatedAt: Date;
  hasOverdueSequenceStep: boolean;
  nextSequenceStepDueAt: Date | null;
};

export function sortProjectsByPriority(projects: ProjectWithSequenceMeta[]): ProjectWithSequenceMeta[] {
  return [...projects].sort((a, b) => {
    if (a.hasOverdueSequenceStep && b.hasOverdueSequenceStep) {
      const aDue = a.nextSequenceStepDueAt ? a.nextSequenceStepDueAt.getTime() : 0;
      const bDue = b.nextSequenceStepDueAt ? b.nextSequenceStepDueAt.getTime() : 0;
      return aDue - bDue;
    }
    if (a.hasOverdueSequenceStep !== b.hasOverdueSequenceStep) {
      return a.hasOverdueSequenceStep ? -1 : 1;
    }
    if (a.nextSequenceStepDueAt && b.nextSequenceStepDueAt) {
      return a.nextSequenceStepDueAt.getTime() - b.nextSequenceStepDueAt.getTime();
    }
    if (a.nextSequenceStepDueAt) return -1;
    if (b.nextSequenceStepDueAt) return 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
