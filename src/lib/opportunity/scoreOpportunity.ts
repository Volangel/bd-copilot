import { ProjectAnalysisResult } from "../ai/types";
import { parseJsonString } from "../parsers";

// Inline types to avoid Prisma import issues
type Playbook = {
  id: string;
  userId: string;
  name: string;
  boosts: string | null;
  penalties: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ICPProfile = {
  id: string;
  userId: string;
  industries: string | null;
  painPoints: string | null;
  filters: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ScoreInput = {
  analysis: ProjectAnalysisResult;
  icp: ICPProfile | null;
  playbooks: Playbook[];
  sourceType: "TEXT_SCAN" | "PAGE_SCAN" | "WATCHLIST";
  rawContext?: string | null;
};

const SIGNAL_KEYWORDS = ["testnet", "mainnet", "launching", "audit", "raise", "funding", "announced", "beta", "alpha"];

export function scoreOpportunity(input: ScoreInput) {
  const { analysis, icp, playbooks, sourceType, rawContext } = input;
  const leadReasons: string[] = [];
  const playbookMatches: string[] = [];

  const textBlob = [analysis.summary, analysis.targetUsers, analysis.painPoints, rawContext || "", analysis.categoryTags.join(" ")].join(" ").toLowerCase();

  // Component scores (each 0-100, weighted later)
  let icpScore = 0;
  let signalScore = 0;
  let sourceScore = 0;
  let playbookScore = 50; // Neutral baseline

  // ICP industry/tag match (0-100) with word boundary checking
  const icpIndustries = icp?.industries?.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const tagMatch = analysis.categoryTags.some((tag) => {
    const tagLower = tag.toLowerCase();
    return icpIndustries.some((ind) => {
      // Use word boundary regex for more accurate matching
      const regex = new RegExp(`\\b${ind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(tagLower);
    });
  });
  if (tagMatch && icpIndustries.length > 0) {
    icpScore = 100;
    leadReasons.push("Matches ICP industries/tags");
  }

  // Signal keywords (0-100, proportional to matches found)
  let signalCount = 0;
  SIGNAL_KEYWORDS.forEach((kw) => {
    if (textBlob.includes(kw)) {
      signalCount++;
      leadReasons.push(`Mentions ${kw}`);
    }
  });
  signalScore = Math.min(100, (signalCount / SIGNAL_KEYWORDS.length) * 200); // Cap at 100 when 50% match

  // Source quality (0-100)
  if (sourceType === "WATCHLIST") {
    sourceScore = 100;
    leadReasons.push("From watchlist source");
  } else if (sourceType === "PAGE_SCAN") {
    sourceScore = 60;
    leadReasons.push("Found via page scan");
  } else if (sourceType === "TEXT_SCAN") {
    sourceScore = 30;
    leadReasons.push("Found in pasted text");
  }

  // Playbook adjustments (0-100, with boosts/penalties)
  let playbookAdjustment = 0;
  playbooks.forEach((pb) => {
    const boosts = parseJsonString<string[]>(pb.boosts, []);
    const penalties = parseJsonString<string[]>(pb.penalties, []);
    let matched = false;

    boosts.forEach((b) => {
      if (b && textBlob.includes(b.toLowerCase())) {
        playbookAdjustment += 10; // Cap total adjustment at ±50
        leadReasons.push(`Playbook boost: ${pb.name} (${b})`);
        matched = true;
      }
    });

    penalties.forEach((p) => {
      if (p && textBlob.includes(p.toLowerCase())) {
        playbookAdjustment -= 10;
        leadReasons.push(`Playbook penalty: ${pb.name} (${p})`);
        matched = true;
      }
    });

    if (matched) playbookMatches.push(pb.name);
  });

  playbookScore = Math.max(0, Math.min(100, 50 + Math.max(-50, Math.min(50, playbookAdjustment))));

  // Weighted final score: ICP 30%, Signals 20%, Source 25%, Playbook 25%
  const leadScore = Math.round(
    icpScore * 0.3 +
    signalScore * 0.2 +
    sourceScore * 0.25 +
    playbookScore * 0.25
  );

  // Signal strength based on keyword density
  const signalStrength = Math.min(50, signalCount * 5);

  return {
    leadScore,
    signalStrength,
    leadReasons,
    playbookMatches,
  };
}
