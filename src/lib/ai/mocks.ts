import {
  AnalyzeProjectArgs,
  GenerateOutreachArgs,
  GenerateOutreachResult,
  GenerateSequenceStepsArgs,
  GenerateSequenceStepsResult,
  ProjectAnalysisResult,
  ScoreProjectArgs,
  ScoreResult,
  SequenceStepSpec,
} from "./types";

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function mockAnalyzeProject(args: AnalyzeProjectArgs): ProjectAnalysisResult {
  const { html, url } = args;
  const baseText = html.slice(0, 500).toLowerCase();
  const seed = hashString(url + baseText);
  const keywords = ["defi", "l2", "nft", "wallet", "security", "infra", "gaming"];
  const foundKeyword = keywords.find((k) => baseText.includes(k)) || "web3";
  const stages = ["idea", "early", "growth", "mature"];
  const tags = ["DeFi", "L2", "Tooling", "NFT", "Infra", "Security", "Gaming"];

  const angleSeeds = [
    `Lead with security concerns around ${foundKeyword}`,
    `Mention scaling plans on L2 and infra readiness`,
    `Offer warm intros to partners in ${foundKeyword}`,
    `Highlight go-to-market co-marketing for ${foundKeyword}`,
    `Surface compliance and risk posture for ${foundKeyword}`,
  ];
  const bdAngles = angleSeeds.slice(seed % angleSeeds.length, seed % angleSeeds.length + 3);

  // Wider MQA distribution: 30-100 (was 55-85)
  const mqaScore = 30 + (seed % 71); // 30-100 range
  const mqaReasons = `Score weighted by ICP match on ${foundKeyword}, stage ${stages[seed % stages.length]}, and traction signals.`;

  return {
    summary: `Snapshot of ${url} – ${foundKeyword} focus with early traction signals and partnership potential.`,
    categoryTags: [tags[seed % tags.length], tags[(seed + 3) % tags.length]].filter((v, idx, arr) => arr.indexOf(v) === idx),
    stage: stages[seed % stages.length],
    targetUsers: seed % 2 === 0 ? "Protocols and Web3 growth teams" : "Builders and infra teams",
    painPoints:
      seed % 3 === 0
        ? "Needs deeper liquidity, BD coverage, and clearer partner story."
        : "Needs faster integrations, better onboarding, and sharper monetization narrative.",
    bdAngles,
    mqaScore,
    mqaReasons,
  };
}

export function mockScoreProject(args: ScoreProjectArgs): ScoreResult {
  const { analysis, icpProfile } = args;
  const icpText = `${icpProfile?.industries ?? ""} ${icpProfile?.painPoints ?? ""}`.toLowerCase();
  const matchSignals = [analysis.summary, analysis.painPoints, analysis.targetUsers].join(" ").toLowerCase();

  // Improved scoring: lower baseline, higher rewards for matches
  const overlap = icpText && icpText.length > 0 && matchSignals.includes(icpText.split(" ")[0]) ? 30 : 0;
  const stageBonus = ["growth", "mature"].includes(analysis.stage || "") ? 15 : 0;
  const baseScore = 35 + overlap + stageBonus; // Base 35 (was 60), match gives 30 (was 18)
  const score = Math.min(100, Math.max(0, baseScore));

  return {
    score,
    explanation: `Matched against ICP focus. Stage ${analysis.stage}; tags ${analysis.categoryTags.join(
      ", ",
    )}; pains aligned to ${icpProfile?.painPoints ? "ICP pains" : "generic pains"}.`,
  };
}

export function mockGenerateOutreach(args: GenerateOutreachArgs): GenerateOutreachResult {
  const { analysis, contact, voiceProfile, channels } = args;
  const tone = voiceProfile?.tone ?? "practical";
  const length = voiceProfile?.length ?? "short";
  const formality = voiceProfile?.formality ?? "casual";

  const templates: GenerateOutreachResult = {};
  channels.forEach((channel) => {
    templates[channel] = `${channel.toUpperCase()} | ${tone}/${formality}/${length}: ${
      contact.name
    }, noticed your ${analysis.categoryTags.join(", ")} focus. We help teams solve '${analysis.painPoints}'. Open to a quick chat?`;
  });

  return templates;
}

export function mockGenerateSequenceSteps(args: GenerateSequenceStepsArgs): GenerateSequenceStepsResult {
  const touches = args.touches ?? 3;
  const channels = ["telegram", "twitter", "email", "linkedin"];
  const preferred =
    args.contact?.channelPreference && channels.includes(args.contact.channelPreference) ? args.contact.channelPreference : null;
  const specs: SequenceStepSpec[] = [];
  for (let i = 1; i <= touches; i++) {
    const channel = i === 1 && preferred ? preferred : channels[(i - 1) % channels.length];
    const tone =
      channel === "telegram" || channel === "twitter" ? "concise DM" : channel === "email" ? "semi-formal email" : "brief intro";
    const angle = args.analysis.bdAngles[i % args.analysis.bdAngles.length] || args.analysis.bdAngles[0] || "value add";
    const name = args.contact?.name || "there";
    const role = args.contact?.role ? ` (${args.contact.role})` : "";
    specs.push({
      offsetDays: i - 1,
      channel,
      objective: `Step ${i} touchpoint`,
      contentHint: `${tone}: Hi ${name}${role}, re: ${angle}. ${args.analysis.summary.slice(0, 120)}`.trim(),
    });
  }
  return { steps: specs };
}
