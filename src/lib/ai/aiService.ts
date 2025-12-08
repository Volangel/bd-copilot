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

function formatVoiceProfile(voiceProfile?: Record<string, unknown> | null): string {
  if (!voiceProfile || Object.keys(voiceProfile).length === 0) {
    return "Voice/tone: concise, confident, and pragmatic. Avoid fluff or hype.";
  }

  const rendered = Object.entries(voiceProfile)
    .map(([key, value]) => {
      if (typeof value === "string") return `- ${key}: ${value}`;
      if (Array.isArray(value)) return `- ${key}: ${(value as unknown[]).join(", ")}`;
      if (value === null) return `- ${key}: null`;
      if (typeof value === "object") return `- ${key}: ${JSON.stringify(value)}`;
      return `- ${key}: ${String(value)}`;
    })
    .join("\n");

  return ["Voice and tone preferences:", rendered].filter(Boolean).join("\n");
}

function buildAnalyzeProjectPrompt(args: AnalyzeProjectArgs): string {
  const { url, html, icpProfile, representingProject } = args;
  const trimmed = html.slice(0, 4000);
  return [
    buildRepresentingProjectBlock(representingProject),
    `You are analyzing a Web3 project website. Return structured JSON only—no prose, no markdown, no extra keys.`,
    `Website URL: ${url}`,
    `ICP industries: ${icpProfile?.industries ?? "-"}`,
    `ICP pain points: ${icpProfile?.painPoints ?? "-"}`,
    `Extract from HTML body text (truncated): ${trimmed}`,
    `Expected JSON keys with guidance:`,
    `- summary: 1–3 sentences on what the project does.`,
    `- categoryTags: array of short topical tags.`,
    `- stage: one of early | growth | mature | unknown.`,
    `- targetUsers: who the product serves ("unknown" if unclear).`,
    `- painPoints: pains described on the site ("unknown" if not stated).`,
    `- bdAngles: array of concrete BD angles based on the site content.`,
    `- mqaScore: integer 0–100 representing ICP fit confidence.`,
    `- mqaReasons: 1–2 sentences citing specifics from the page that justify the score.`,
    `Do not invent details. If a field cannot be inferred, use null or an empty array as appropriate.`,
  ].join("\n");
}

function buildScoreProjectPrompt(args: ScoreProjectArgs): string {
  const { analysis, icpProfile, representingProject } = args;
  return [
    buildRepresentingProjectBlock(representingProject),
    `You score ICP fit. Return ONLY JSON: { "score": number, "explanation": string }. Score 0–100 only.`,
    `Analysis summary: ${analysis.summary}`,
    `Tags: ${(analysis.categoryTags || []).join(", ")}`,
    `Stage: ${analysis.stage}`,
    `Target users: ${analysis.targetUsers}`,
    `Pain points: ${analysis.painPoints}`,
    `ICP industries: ${icpProfile?.industries ?? "-"}`,
    `ICP pains: ${icpProfile?.painPoints ?? "-"}`,
    `Scoring rubric: high scores require strong alignment to both the ICP industries and pain points. Mention 2–3 concrete reasons in the explanation tied to the analysis data above.`,
    `Return ONLY valid JSON. No markdown, no backticks, no extra keys.`,
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
    `Generate concise, actionable BD outreach for the specified channels. Return pure JSON with only the requested channels as keys.`,
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
    formatVoiceProfile(voiceProfile),
    `Channels to generate: ${channels.join(", ")}`,
    `Channel-specific guidance:`,
    `- Email: include a crisp subject line and 3–5 short sentences with a clear CTA.`,
    `- LinkedIn: 2–4 sentences, professional and non-spammy.`,
    `- Twitter: 1–2 tweets worth of text (<= 560 characters total).`,
    `- Telegram: casual but credible; 2–4 sentences with a clear ask.`,
    `General rules: do not invent features, avoid placeholders, and tailor to the persona/angle when provided.`,
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
    `Sequence guidance: stagger touchpoints thoughtfully, vary channels when possible, and align objectives to the project pain points and primary angle. Each contentHint should be 1–2 sentences max.`,
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
    // Validate MQA score if provided
    let mqaScore: number | null = null;
    if (result.mqaScore != null) {
      const rawMqa = Number(result.mqaScore);
      if (isNaN(rawMqa)) {
        console.warn("[aiService.analyzeProject] AI returned non-numeric mqaScore:", result.mqaScore);
      } else {
        mqaScore = Math.max(0, Math.min(100, rawMqa));
      }
    }

    return {
      summary: result.summary || "",
      categoryTags: toStringArray(result.categoryTags),
      stage: toStringVal(result.stage),
      targetUsers: toStringVal(result.targetUsers),
      painPoints: toStringVal(result.painPoints),
      bdAngles: toStringArray(result.bdAngles),
      mqaScore,
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
    // Validate score is a number
    const rawScore = Number(result.score);
    if (isNaN(rawScore)) {
      console.warn("[aiService.scoreProject] AI returned non-numeric score:", result.score);
      return mockScoreProject(args);
    }

    return {
      score: Math.max(0, Math.min(100, rawScore)),
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
