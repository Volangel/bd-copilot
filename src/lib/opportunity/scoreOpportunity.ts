import { ProjectAnalysisResult } from "../ai/types";
import { parseJsonString } from "../parsers";
import { Playbook, ICPProfile } from "@prisma/client";

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
  let leadScore = 0;
  let signalStrength = 0;
  const leadReasons: string[] = [];
  const playbookMatches: string[] = [];

  const textBlob = [analysis.summary, analysis.targetUsers, analysis.painPoints, rawContext || "", analysis.categoryTags.join(" ")].join(" ").toLowerCase();

  // ICP industry/tag match
  const icpIndustries = icp?.industries?.toLowerCase().split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const tagMatch = analysis.categoryTags.some((tag) => icpIndustries.some((ind) => tag.toLowerCase().includes(ind)));
  if (tagMatch && icpIndustries.length > 0) {
    leadScore += 15;
    leadReasons.push("Matches ICP industries/tags");
  }

  // Signal keywords
  SIGNAL_KEYWORDS.forEach((kw) => {
    if (textBlob.includes(kw)) {
      leadScore += 5;
      signalStrength += 5;
      leadReasons.push(`Mentions ${kw}`);
    }
  });

  // Source bonus
  if (sourceType === "WATCHLIST") {
    leadScore += 20;
    signalStrength += 10;
    leadReasons.push("From watchlist source");
  } else if (sourceType === "PAGE_SCAN") {
    leadScore += 10;
    signalStrength += 5;
    leadReasons.push("Found via page scan");
  } else if (sourceType === "TEXT_SCAN") {
    leadScore += 5;
    signalStrength += 5;
    leadReasons.push("Found in pasted text");
  }

  // Playbook boosts/penalties
  playbooks.forEach((pb) => {
    const boosts = parseJsonString<string[]>(pb.boosts, []);
    const penalties = parseJsonString<string[]>(pb.penalties, []);
    let matched = false;
    boosts.forEach((b) => {
      if (b && textBlob.includes(b.toLowerCase())) {
        leadScore += 10;
        leadReasons.push(`Playbook boost: ${pb.name} (${b})`);
        matched = true;
      }
    });
    penalties.forEach((p) => {
      if (p && textBlob.includes(p.toLowerCase())) {
        leadScore -= 10;
        leadReasons.push(`Playbook penalty: ${pb.name} (${p})`);
        matched = true;
      }
    });
    if (matched) playbookMatches.push(pb.name);
  });

  // Clamp scores
  leadScore = Math.max(0, Math.min(100, leadScore));
  signalStrength = Math.max(0, Math.min(50, signalStrength));

  return {
    leadScore,
    signalStrength,
    leadReasons,
    playbookMatches,
  };
}
