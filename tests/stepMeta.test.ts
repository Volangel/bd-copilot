import { describe, expect, it } from "vitest";
import { buildStepMeta, PendingStepLike } from "../src/lib/pipeline/stepMeta";

const now = new Date("2024-01-10T12:00:00Z");

describe("buildStepMeta", () => {
  const projectIds = ["a", "b"];

  it("handles no steps", () => {
    const meta = buildStepMeta([], projectIds, now);
    expect(meta.get("a")).toEqual({ nextSequenceStepDueAt: null, hasOverdueSequenceStep: false, overdueCount: 0 });
  });

  it("tracks upcoming next step per project", () => {
    const steps: PendingStepLike[] = [
      { scheduledAt: new Date("2024-01-11T00:00:00Z"), sequence: { projectId: "a" } },
      { scheduledAt: new Date("2024-01-12T00:00:00Z"), sequence: { projectId: "a" } },
    ];
    const meta = buildStepMeta(steps, projectIds, now);
    expect(meta.get("a")?.nextSequenceStepDueAt?.toISOString()).toBe("2024-01-11T00:00:00.000Z");
    expect(meta.get("a")?.hasOverdueSequenceStep).toBe(false);
    expect(meta.get("a")?.overdueCount).toBe(0);
  });

  it("counts overdue steps", () => {
    const steps: PendingStepLike[] = [
      { scheduledAt: new Date("2024-01-09T00:00:00Z"), sequence: { projectId: "a" } },
      { scheduledAt: new Date("2024-01-08T00:00:00Z"), sequence: { projectId: "a" } },
      { scheduledAt: new Date("2024-01-15T00:00:00Z"), sequence: { projectId: "b" } },
    ];
    const meta = buildStepMeta(steps, projectIds, now);
    expect(meta.get("a")).toEqual({
      nextSequenceStepDueAt: new Date("2024-01-08T00:00:00Z"),
      hasOverdueSequenceStep: true,
      overdueCount: 2,
    });
    expect(meta.get("b")?.hasOverdueSequenceStep).toBe(false);
  });
});
