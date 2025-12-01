export interface ContactCandidate {
  name: string;
  role?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  email?: string | null;
  telegram?: string | null;
  sourceUrl?: string | null;
  notes?: string | null;
  tags?: string[];
  sourceType?: "heuristic" | "ai";
}

export interface PersonSnippet {
  id: string;
  pageUrl: string;
  pageTitle?: string | null;
  nameText?: string | null;
  roleText?: string | null;
  surroundingText: string;
  anchors: {
    href: string;
    text: string;
  }[];
}
