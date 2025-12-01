import { describe, expect, it } from "vitest";
import { sortProjectsByPriority, ProjectWithSequenceMeta } from "../src/lib/pipeline/priority";

const base = (overdue: boolean, due: Date | null, updatedAtOffset = 0): ProjectWithSequenceMeta => ({
  id: Math.random().toString(),
  name: "p",
  url: "u",
  updatedAt: new Date(Date.now() - updatedAtOffset),
  hasOverdueSequenceStep: overdue,
  nextSequenceStepDueAt: due,
});

describe("sortProjectsByPriority", () => {
  it("overdue come first", () => {
    const a = base(true, new Date(Date.now() - 1000));
    const b = base(false, new Date(Date.now() - 100000));
    const sorted = sortProjectsByPriority([b, a]);
    expect(sorted[0].id).toBe(a.id);
  });

  it("earlier overdue first", () => {
    const a = base(true, new Date(Date.now() - 5000));
    const b = base(true, new Date(Date.now() - 1000));
    const sorted = sortProjectsByPriority([b, a]);
    expect(sorted[0].id).toBe(a.id);
  });

  it("future next touch ordered by soonest", () => {
    const a = base(false, new Date(Date.now() + 1000));
    const b = base(false, new Date(Date.now() + 500));
    const sorted = sortProjectsByPriority([a, b]);
    expect(sorted[0].id).toBe(b.id);
  });

  it("no steps sorted by updatedAt desc last", () => {
    const a = base(false, null, 1000);
    const b = base(false, null, 0);
    const sorted = sortProjectsByPriority([a, b]);
    expect(sorted[0].id).toBe(b.id);
  });

  it("mixed overdue, future, none", () => {
    const overdue = base(true, new Date(Date.now() - 1000));
    const future = base(false, new Date(Date.now() + 1000));
    const none = base(false, null, 0);
    const sorted = sortProjectsByPriority([future, none, overdue]);
    expect(sorted[0].id).toBe(overdue.id);
    expect(sorted[1].id).toBe(future.id);
    expect(sorted[2].id).toBe(none.id);
  });

  it("handles projects without contacts/sequences equally by updatedAt", () => {
    const older = base(false, null, 1000);
    const newer = base(false, null, 0);
    const sorted = sortProjectsByPriority([older, newer]);
    expect(sorted[0].id).toBe(newer.id);
  });
});
