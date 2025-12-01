import { describe, expect, it } from "vitest";
import { pickNextSequenceStep, SequenceStepLike } from "../src/lib/sequences/nextStep";

const mkStep = (status: string, offsetMs: number | null): SequenceStepLike => ({
  id: Math.random().toString(),
  stepNumber: 1,
  status,
  scheduledAt: offsetMs === null ? null : new Date(Date.now() + offsetMs),
});

describe("pickNextSequenceStep", () => {
  const now = new Date();

  it("returns null with no steps", () => {
    expect(pickNextSequenceStep([], now)).toBeNull();
  });

  it("ignores SENT steps", () => {
    const sent = mkStep("SENT", 0);
    expect(pickNextSequenceStep([sent], now)).toBeNull();
  });

  it("returns null when all pending steps are none (should be expected)", () => {
    const sent = mkStep("SENT", -1000);
    const skipped = { ...mkStep("SKIPPED", -500), status: "SENT" };
    expect(pickNextSequenceStep([sent, skipped], now)).toBeNull();
  });

  it("picks overdue first", () => {
    const overdue = mkStep("PENDING", -1000);
    const future = mkStep("PENDING", 1000);
    const picked = pickNextSequenceStep([future, overdue], now);
    expect(picked?.id).toBe(overdue.id);
  });

  it("earliest overdue wins", () => {
    const older = mkStep("PENDING", -5000);
    const newer = mkStep("PENDING", -1000);
    const picked = pickNextSequenceStep([newer, older], now);
    expect(picked?.id).toBe(older.id);
  });

  it("nearest future if no overdue", () => {
    const farther = mkStep("PENDING", 5000);
    const nearer = mkStep("PENDING", 1000);
    const picked = pickNextSequenceStep([farther, nearer], now);
    expect(picked?.id).toBe(nearer.id);
  });

  it("handles null scheduledAt by returning first pending if no dated steps", () => {
    const undated = mkStep("PENDING", null);
    expect(pickNextSequenceStep([undated], now)?.id).toBe(undated.id);
  });
});
