import { ContactCandidate } from "./types";

export function mockExtractContactCandidates({
  pages,
  projectUrl,
  projectName,
  userPlan,
}: {
  pages: { url: string; title: string; html: string }[];
  projectUrl: string;
  projectName?: string | null;
  userPlan: string;
}): ContactCandidate[] {
  // keep mock minimal to avoid hallucinated data
  void pages;
  void projectUrl;
  void projectName;
  void userPlan;
  return [];
}
