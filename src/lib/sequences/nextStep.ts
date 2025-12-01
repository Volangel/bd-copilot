export type SequenceStepLike = {
  id: string;
  stepNumber: number;
  status: string;
  scheduledAt: Date | null;
};

export function pickNextSequenceStep(steps: SequenceStepLike[], now: Date): SequenceStepLike | null {
  const pending = steps.filter((s) => s.status === "PENDING");
  if (pending.length === 0) return null;

  const overdue = pending.filter((s) => s.scheduledAt && s.scheduledAt < now).sort((a, b) => {
    const aTime = a.scheduledAt ? a.scheduledAt.getTime() : 0;
    const bTime = b.scheduledAt ? b.scheduledAt.getTime() : 0;
    return aTime - bTime;
  });
  if (overdue.length > 0) return overdue[0];

  const future = pending
    .filter((s) => s.scheduledAt && s.scheduledAt >= now)
    .sort((a, b) => {
      const aTime = a.scheduledAt ? a.scheduledAt.getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.scheduledAt ? b.scheduledAt.getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  if (future.length > 0) return future[0];

  // no scheduledAt, just return first pending
  return pending[0];
}
