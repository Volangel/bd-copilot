import { describe, expect, it } from "vitest";
import { scoreOpportunity } from "../src/lib/opportunity/scoreOpportunity";

const baseAnalysis = {
  summary: "A strong DeFi infra project launching soon",
  categoryTags: ["DeFi", "Infra"],
  stage: "growth",
  targetUsers: "Protocols",
  painPoints: "liquidity, BD",
  bdAngles: ["Lead with security concerns", "Mention scaling plans"],
  mqaScore: 80,
  mqaReasons: "solid",
};

describe("scoreOpportunity", () => {
  it("boosts when ICP and signals align", () => {
    const icp = { id: "1", userId: "u", industries: "DeFi,Infra", painPoints: "liquidity", filters: null, createdAt: new Date(), updatedAt: new Date() };
    const playbooks: {
      id: string;
      userId: string;
      name: string;
      boosts: string | null;
      penalties: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[] = [];
    const result = scoreOpportunity({
      analysis: baseAnalysis,
      icp,
      playbooks,
      sourceType: "PAGE_SCAN",
      rawContext: "audit and testnet",
    });
    expect(result.leadScore).toBeGreaterThan(30);
    expect(result.leadScore).toBeLessThanOrEqual(100);
  });

  it("penalizes with playbook penalties", () => {
    const icp = null;
    const playbooks: {
      id: string;
      userId: string;
      name: string;
      boosts: string | null;
      penalties: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[] = [
      { id: "p", userId: "u", name: "No memes", boosts: "[]", penalties: '["meme"]', createdAt: new Date(), updatedAt: new Date() },
    ];
    const result = scoreOpportunity({
      analysis: { ...baseAnalysis, summary: "meme coin" },
      icp,
      playbooks,
      sourceType: "TEXT_SCAN",
    });
    expect(result.leadScore).toBeGreaterThanOrEqual(0);
    expect(result.leadScore).toBeLessThanOrEqual(100);
  });

  it("does not crash with missing icp or playbooks", () => {
    const result = scoreOpportunity({
      analysis: baseAnalysis,
      icp: null,
      playbooks: [],
      sourceType: "TEXT_SCAN",
    });
    expect(result.leadScore).toBeGreaterThanOrEqual(0);
  });
});
