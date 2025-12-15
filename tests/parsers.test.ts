import { describe, expect, it } from "vitest";
import { parseRepresentingProjectConfig } from "../src/lib/user/types";
import { buildGenerateOutreachPrompt } from "../src/lib/ai/aiService";

describe("parseRepresentingProjectConfig", () => {
  it("returns null for bad JSON string", () => {
    expect(parseRepresentingProjectConfig("{bad")).toBeNull();
  });

  it("returns null when name missing", () => {
    expect(parseRepresentingProjectConfig({ website: "https://x.com" })).toBeNull();
  });

  it("parses valid config", () => {
    const cfg = parseRepresentingProjectConfig({ name: "Hats", toneGuidelines: "direct" });
    expect(cfg?.name).toBe("Hats");
    expect(cfg?.toneGuidelines).toBe("direct");
  });
});

describe("buildGenerateOutreachPrompt", () => {
  it("includes persona and primary angle when provided", () => {
    const prompt = buildGenerateOutreachPrompt({
      analysis: { summary: "Sum", categoryTags: [], stage: "early", targetUsers: "", painPoints: "", bdAngles: [] },
      contact: { name: "Alice" },
      channels: ["email"],
      icpProfile: null,
      voiceProfile: null,
      userPlan: "free",
      persona: "Founder",
      primaryAngle: "Security angle",
    });
    expect(prompt).toContain("Founder");
    expect(prompt).toContain("Security angle");
  });
});
