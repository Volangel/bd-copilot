import type { RepresentingProjectConfig } from "../user/types";

export interface AnalyzeProjectArgs {
  html: string;
  url: string;
  icpProfile?: {
    industries?: string | null;
    painPoints?: string | null;
    filters?: Record<string, unknown> | null;
  } | null;
  userPlan: string;
  representingProject?: RepresentingProjectConfig | null;
}

export interface ProjectAnalysisResult {
  summary: string;
  categoryTags: string[];
  stage: string | null;
  targetUsers: string | null;
  painPoints: string | null;
  bdAngles: string[];
  mqaScore?: number | null;
  mqaReasons?: string | null;
}

export interface ScoreProjectArgs {
  analysis: ProjectAnalysisResult;
  icpProfile?: AnalyzeProjectArgs["icpProfile"];
  userPlan: string;
  representingProject?: RepresentingProjectConfig | null;
}

export interface ScoreResult {
  score: number;
  explanation: string;
}

export interface GenerateOutreachArgs {
  analysis: ProjectAnalysisResult;
  contact: {
    name: string;
    role?: string | null;
    linkedinUrl?: string | null;
    twitterHandle?: string | null;
    email?: string | null;
    telegram?: string | null;
    channelPreference?: string | null;
  };
  channels: string[];
  voiceProfile?: Record<string, unknown> | null;
  icpProfile?: AnalyzeProjectArgs["icpProfile"];
  userPlan: string;
  representingProject?: RepresentingProjectConfig | null;
  persona?: string;
  primaryAngle?: string;
}

export interface GenerateOutreachResult {
  [channel: string]: string;
}

export interface GenerateSequenceStepsArgs {
  analysis: ProjectAnalysisResult;
  contact?: GenerateOutreachArgs["contact"];
  icpProfile?: AnalyzeProjectArgs["icpProfile"];
  touches?: number;
  playbook?: { name: string; boosts?: string | null; penalties?: string | null } | null;
  userPlan: string;
  representingProject?: RepresentingProjectConfig | null;
  persona?: string;
  primaryAngle?: string;
}

export interface SequenceStepSpec {
  offsetDays: number;
  channel: string;
  objective: string;
  contentHint: string;
  persona?: string;
  primaryAngle?: string;
}

export interface GenerateSequenceStepsResult {
  steps: SequenceStepSpec[];
}
