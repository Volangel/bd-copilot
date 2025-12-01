export type ContactHandles = {
  email?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  telegram?: string | null;
};

/**
 * Build a Prisma-compatible OR clause for deduping contacts within a project.
 * Rules: dedupe when email OR primary social handle matches. Name alone does not dedupe.
 */
export function buildContactDedupWhere(projectId: string, handles: ContactHandles) {
  const clauses = [
    handles.email ? { email: handles.email } : null,
    handles.linkedinUrl ? { linkedinUrl: handles.linkedinUrl } : null,
    handles.twitterHandle ? { twitterHandle: handles.twitterHandle } : null,
    handles.telegram ? { telegram: handles.telegram } : null,
  ].filter(Boolean);

  if (!clauses.length) return null;

  return {
    projectId,
    OR: clauses,
  };
}
