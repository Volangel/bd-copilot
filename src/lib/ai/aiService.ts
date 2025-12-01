import { callOpenAIChat } from "./providers/openai";
import {
  AnalyzeProjectArgs,
  ProjectAnalysisResult,
  ScoreProjectArgs,
  ScoreResult,
  GenerateOutreachArgs,
  GenerateOutreachResult,
  GenerateSequenceStepsArgs,
  GenerateSequenceStepsResult,
} from "./types";
import { mockAnalyzeProject, mockScoreProject, mockGenerateOutreach, mockGenerateSequenceSteps } from "./mocks";

const PAID_PLANS = new Set(["starter", "pro", "enterprise"]);

export function canUseRealAI(plan: string | null | undefined): boolean {
  if (process.env.AI_PROVIDER_ENABLED !== "true") return false;
  if (!process.env.OPENAI_API_KEY) return false;
  if (!plan) return false;
  return PAID_PLANS.has(plan);
}

export function describeAiMode(plan: string | null | undefined): "mock" | "provider-disabled" | "provider-active" {
  if (!process.env.AI_PROVIDER_ENABLED || process.env.AI_PROVIDER_ENABLED !== "true" || !process.env.OPENAI_API_KEY) {
    return "provider-disabled";
  }
  if (!canUseRealAI(plan)) {
    return "mock";
  }
  return "provider-active";
}

function buildRepresentingProjectBlock(rep?: AnalyzeProjectArgs["representingProject"]): string {
  if (!rep || !rep.name) return "";
  return [
    `You represent this project when crafting BD insights:`,
    `- Name: ${rep.name}`,
    rep.oneLiner ? `- One-liner: ${rep.oneLiner}` : null,
    rep.productCategory ? `- Category: ${rep.productCategory}` : null,
    rep.primaryValueProp ? `- Primary value prop: ${rep.primaryValueProp}` : null,
    rep.idealCustomer ? `- Ideal customer: ${rep.idealCustomer}` : null,
    rep.keyDifferentiators ? `- Differentiators: ${rep.keyDifferentiators}` : null,
    rep.toneGuidelines ? `- Tone guidelines: ${rep.toneGuidelines}` : null,
    rep.website ? `- Website: ${rep.website}` : null,
    rep.referenceAccounts && rep.referenceAccounts.length > 0
      ? `- Reference accounts (actual wins/clients): ${rep.referenceAccounts.join(", ")}`
      : null,
    ``,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAnalyzeProjectPrompt(args: AnalyzeProjectArgs): string {
  const { url, html, icpProfile, representingProject } = args;
  const trimmed = html.slice(0, 4000);
  return [
    buildRepresentingProjectBlock(representingProject),
    `You will analyze a Web3 project website and return structured JSON only.`,
    `Website URL: ${url}`,
    `ICP industries: ${icpProfile?.industries ?? "-"}`,
    `ICP pain points: ${icpProfile?.painPoints ?? "-"}`,
    `Extract from HTML body text (truncated): ${trimmed}`,
    `Return ONLY valid JSON. No markdown, no prose, no extra keys.`,
    `Expected keys: summary, categoryTags[], stage, targetUsers, painPoints, bdAngles[], mqaScore (0-100), mqaReasons.`,
  ].join("\n");
}

function buildScoreProjectPrompt(args: ScoreProjectArgs): string {
  const { analysis, icpProfile, representingProject } = args;
  return [
    buildRepresentingProjectBlock(representingProject),
    `You score ICP fit. Return JSON: { "score": number, "explanation": string }. Score 0-100 only.`,
    `Analysis summary: ${analysis.summary}`,
    `Tags: ${(analysis.categoryTags || []).join(", ")}`,
    `Stage: ${analysis.stage}`,
    `Target users: ${analysis.targetUsers}`,
    `Pain points: ${analysis.painPoints}`,
    `ICP industries: ${icpProfile?.industries ?? "-"}`,
    `ICP pains: ${icpProfile?.painPoints ?? "-"}`,
    `Return ONLY valid JSON. No markdown, no backticks.`,
  ].join("\n");
}

export function buildGenerateOutreachPrompt(args: GenerateOutreachArgs): string {
  const { analysis, contact, channels, icpProfile, voiceProfile, representingProject, persona, primaryAngle } = args;
  const repBlock =
    representingProject && representingProject.name
      ? buildRepresentingProjectBlock(representingProject)
      : "You are a senior Web3 BD rep. If the represented project is missing, keep messaging generic but professional.\n\n";

  return [
    repBlock,
    `Generate concise BD outreach for the specified channels. Return pure JSON with only the requested channels as keys.`,
    persona ? `Target persona: ${persona}` : "Target persona: not specified",
    primaryAngle ? `Primary BD angle to emphasize: ${primaryAngle}` : "Primary BD angle: not specified",
    `Project summary: ${analysis.summary}`,
    `Stage: ${analysis.stage}`,
    `Tags: ${(analysis.categoryTags || []).join(", ")}`,
    `Target users: ${analysis.targetUsers}`,
    `Project pain points: ${analysis.painPoints}`,
    `ICP industries: ${icpProfile?.industries ?? "-"}`,
    `ICP pain points: ${icpProfile?.painPoints ?? "-"}`,
    `Contact: ${contact.name} (${contact.role ?? "unknown role"})`,
    `Contact socials: LinkedIn=${contact.linkedinUrl ?? "-"}, Twitter=${contact.twitterHandle ?? "-"}, Email=${contact.email ?? "-"}, Telegram=${contact.telegram ?? "-"}`,
    `Channel preference: ${contact.channelPreference ?? "-"}`,
    `Voice profile JSON: ${voiceProfile ? JSON.stringify(voiceProfile) : "{}"}`,
    `Channels to generate: ${channels.join(", ")}`,
    ``,
    `Return ONLY JSON like:`,
    `{`,
    `  "email"?: "string",`,
    `  "linkedin"?: "string",`,
    `  "twitter"?: "string",`,
    `  "telegram"?: "string"`,
    `}`,
    `No markdown, no backticks, JSON only.`,
  ].join("\n");
}

export function buildGenerateSequencePrompt(args: GenerateSequenceStepsArgs): string {
  const { analysis, contact, touches = 3, playbook, representingProject, persona, primaryAngle } = args;
  return [
    buildRepresentingProjectBlock(representingProject),
    `Design a multi-touch BD sequence (max ${touches} steps). Return JSON only: { "steps": [ { "offsetDays": number, "channel": string, "objective": string, "contentHint": string, "persona"?: string, "primaryAngle"?: string } ] }.`,
    persona ? `Target persona for this campaign: ${persona}` : "Persona not provided.",
    primaryAngle ? `Primary angle to lean on: ${primaryAngle}` : "Primary angle not provided.",
    `Project summary: ${analysis.summary}`,
    `Tags: ${(analysis.categoryTags || []).join(", ")}`,
    `Pain points: ${analysis.painPoints}`,
    `BD angles: ${(analysis.bdAngles || []).join(" | ")}`,
    `Contact: ${contact?.name ?? "N/A"} (${contact?.role ?? "N/A"}), preference: ${contact?.channelPreference ?? "none"}`,
    `Playbook: ${playbook ? playbook.name : "none"}`,
    `Return ONLY valid JSON. No markdown or backticks.`,
  ].join("\n");
}

export async function analyzeProject(args: AnalyzeProjectArgs): Promise<ProjectAnalysisResult> {
  if (!canUseRealAI(args.userPlan)) {
    return mockAnalyzeProject(args);
  }
  try {
    const system = `You are an expert Web3 business analyst. Always reply with strict JSON.`;
    const user = buildAnalyzeProjectPrompt(args);
    const result = await callOpenAIChat<ProjectAnalysisResult>({
      model: process.env.AI_MODEL_ANALYZE || "gpt-4.1-mini",
      system,
      user,
      maxTokens: 900,
    });
    const toStringVal = (val: unknown): string | null => {
      if (Array.isArray(val)) return val.join(", ");
      if (typeof val === "string") return val;
      return null;
    };
    const toStringArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val.filter((v) => typeof v === "string") as string[];
      if (typeof val === "string") return val.split(",").map((v) => v.trim()).filter(Boolean);
      return [];
    };
    return {
      summary: result.summary || "",
      categoryTags: toStringArray(result.categoryTags),
      stage: toStringVal(result.stage),
      targetUsers: toStringVal(result.targetUsers),
      painPoints: toStringVal(result.painPoints),
      bdAngles: toStringArray(result.bdAngles),
      mqaScore: result.mqaScore ?? null,
      mqaReasons: toStringVal(result.mqaReasons),
    };
  } catch (err) {
    console.error("[aiService.analyzeProject] provider error", {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return mockAnalyzeProject(args);
  }
}

export async function scoreProject(args: ScoreProjectArgs): Promise<ScoreResult> {
  if (!canUseRealAI(args.userPlan)) {
    return mockScoreProject(args);
  }
  try {
    const system = `You score ICP fit. Reply with JSON only.`;
    const user = buildScoreProjectPrompt(args);
    const result = await callOpenAIChat<ScoreResult>({
      model: process.env.AI_MODEL_SCORE || "gpt-4.1-mini",
      system,
      user,
      maxTokens: 400,
    });
    return {
      score: Math.max(0, Math.min(100, result.score ?? 0)),
      explanation: result.explanation ?? "",
    };
  } catch (err) {
    console.error("[aiService.scoreProject] provider error", {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return mockScoreProject(args);
  }
}

export async function generateOutreach(args: GenerateOutreachArgs): Promise<GenerateOutreachResult> {
  if (!canUseRealAI(args.userPlan)) {
    return mockGenerateOutreach(args);
  }
  try {
    const system = `You are a senior Web3 BD rep. Generate concise outreach for each channel. Reply with JSON only.`;
    const user = buildGenerateOutreachPrompt(args);
    const result = await callOpenAIChat<GenerateOutreachResult>({
      model: process.env.AI_MODEL_OUTREACH || "gpt-4.1-mini",
      system,
      user,
      maxTokens: 900,
    });
    const safe: GenerateOutreachResult = {};
    Object.entries(result || {}).forEach(([channel, content]) => {
      if (typeof content === "string" && content.trim().length > 0) {
        safe[channel] = content;
      }
    });
    if (Object.keys(safe).length === 0) throw new Error("AI returned empty outreach");
    return safe;
  } catch (err) {
    console.error("[aiService.generateOutreach] provider error", {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return mockGenerateOutreach(args);
  }
}

export async function generateSequenceSteps(args: GenerateSequenceStepsArgs): Promise<GenerateSequenceStepsResult> {
  if (!canUseRealAI(args.userPlan)) {
    return mockGenerateSequenceSteps(args);
  }
  try {
    const system = `You design BD sequences. Reply with JSON only.`;
    const user = buildGenerateSequencePrompt(args);
    const result = await callOpenAIChat<GenerateSequenceStepsResult>({
      model: process.env.AI_MODEL_SEQUENCE || "gpt-4.1-mini",
      system,
      user,
      maxTokens: 700,
    });
    if (!Array.isArray(result.steps) || result.steps.length === 0) {
      throw new Error("AI returned no steps");
    }
    const steps = result.steps.map((s) => ({
      offsetDays: Math.max(0, Math.min(60, Number(s.offsetDays ?? 0))),
      channel: s.channel || "email",
      objective: s.objective || "",
      contentHint: s.contentHint || "",
      persona: s.persona || args.persona,
      primaryAngle: s.primaryAngle || args.primaryAngle,
    }));
    return { steps };
  } catch (err) {
    console.error("[aiService.generateSequenceSteps] provider error", {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    return mockGenerateSequenceSteps(args);
  }
}
