import { canUseRealAI } from "./aiService";
import { callOpenAIChat } from "./providers/openai";
import type { ProjectAnalysisResult, IcpProfileShape } from "./types";
import type { RepresentingProjectConfig } from "@/lib/user/types";

export interface AccountPlaybookDraft {
  summary: string;
  recommendedPersonas: string[];
  primaryAngles: string[];
  recommendedChannelsByPersona: Record<string, string[]>;
}

export async function generateAccountPlaybookDraft(args: {
  analysis: ProjectAnalysisResult;
  icpProfile?: IcpProfileShape | null;
  representingProject?: RepresentingProjectConfig | null;
  userPlan: string;
}): Promise<AccountPlaybookDraft> {
  const { analysis, icpProfile, representingProject, userPlan } = args;

  if (!canUseRealAI(userPlan)) {
    return mockDraft();
  }

  try {
    const system =
      "You are a senior Web3 BD strategist. Design account-level playbooks for a BD rep. Return ONLY valid JSON. No markdown, no backticks.";
    const user = buildPrompt({ analysis, icpProfile, representingProject });
    const raw = await callOpenAIChat<AccountPlaybookDraft>({
      model: process.env.AI_MODEL_ANALYZE || "gpt-4.1-mini",
      system,
      user,
      maxTokens: 700,
    });

    return normalize(raw);
  } catch (err) {
    console.error("[accountPlaybook] provider error", { message: (err as Error).message });
    return mockDraft();
  }
}

function buildPrompt({
  analysis,
  icpProfile,
  representingProject,
}: {
  analysis: ProjectAnalysisResult;
  icpProfile?: IcpProfileShape | null;
  representingProject?: RepresentingProjectConfig | null;
}) {
  const rep = representingProject;
  const repBlock = rep
    ? [
        `Represented Project: ${rep.name}`,
        rep.oneLiner ? `One-liner: ${rep.oneLiner}` : null,
        rep.productCategory ? `Category: ${rep.productCategory}` : null,
        rep.primaryValueProp ? `Value prop: ${rep.primaryValueProp}` : null,
        rep.idealCustomer ? `Ideal customer: ${rep.idealCustomer}` : null,
        rep.keyDifferentiators ? `Differentiators: ${rep.keyDifferentiators}` : null,
        rep.toneGuidelines ? `Tone: ${rep.toneGuidelines}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Represented Project missing; keep guidance generic but still professional.";

  return [
    repBlock,
    "Prospect analysis:",
    `Summary: ${analysis.summary}`,
    `Tags: ${(analysis.categoryTags || []).join(", ")}`,
    `Stage: ${analysis.stage}`,
    `Target users: ${analysis.targetUsers}`,
    `Pain points: ${analysis.painPoints}`,
    `BD angles: ${(analysis.bdAngles || []).join(" | ")}`,
    icpProfile?.industries ? `ICP industries: ${icpProfile.industries}` : null,
    icpProfile?.painPoints ? `ICP pains: ${icpProfile.painPoints}` : null,
    "",
    "Return ONLY JSON of the form:",
    "{",
    '  "summary": "...",',
    '  "recommendedPersonas": ["persona1", "persona2"],',
    '  "primaryAngles": ["angle1", "angle2"],',
    '  "recommendedChannelsByPersona": { "persona1": ["email", "telegram"] }',
    "}",
  ]
    .filter(Boolean)
    .join("\n");
}

function normalize(raw: Partial<AccountPlaybookDraft>): AccountPlaybookDraft {
  const personas = Array.isArray(raw.recommendedPersonas)
    ? raw.recommendedPersonas.filter((p) => typeof p === "string").slice(0, 5)
    : [];
  const angles = Array.isArray(raw.primaryAngles)
    ? raw.primaryAngles.filter((a) => typeof a === "string").slice(0, 3)
    : [];
  const channels: Record<string, string[]> = {};
  if (raw.recommendedChannelsByPersona && typeof raw.recommendedChannelsByPersona === "object") {
    Object.entries(raw.recommendedChannelsByPersona).forEach(([k, v]) => {
      if (Array.isArray(v)) channels[k] = v.filter((c) => typeof c === "string").slice(0, 4);
    });
  }

  return {
    summary: raw.summary || "Focus on clear value props and ICP-aligned angles.",
    recommendedPersonas: personas.length ? personas : mockDraft().recommendedPersonas,
    primaryAngles: angles.length ? angles : mockDraft().primaryAngles,
    recommendedChannelsByPersona: Object.keys(channels).length ? channels : mockDraft().recommendedChannelsByPersona,
  };
}

function mockDraft(): AccountPlaybookDraft {
  return {
    summary: "Position this account with a focus on security, reliability, and fast BD cycles.",
    recommendedPersonas: ["Technical founder", "Protocol engineer", "BD / ecosystem lead"],
    primaryAngles: ["De-risk launches with proactive security", "Speed up BD with credible case studies"],
    recommendedChannelsByPersona: {
      "Technical founder": ["email", "twitter", "telegram"],
      "Protocol engineer": ["telegram", "discord"],
      "BD / ecosystem lead": ["email", "linkedin"],
    },
  };
}
