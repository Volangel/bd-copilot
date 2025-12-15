import { authOptions } from "@/lib/auth";
import { canUseRealAI } from "@/lib/ai/aiService";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import {
  enrichContactFromUrl,
  enrichContactWithAI,
  parseSocialInput,
  validateSocialFormat,
  analyzeCorrelation,
  parseLinkedInUrl,
  parseTwitterUrl,
  parseTelegramUrl,
  parseEmail,
} from "@/lib/contacts/socials";
import type { EnrichedContact } from "@/lib/contacts/socials";

const bodySchema = z.object({
  url: z.string().url(),
  deepEnrich: z.boolean().optional(), // Request full enrichment with correlation
});

/**
 * Convert EnrichedContact to the legacy suggestion format for backwards compatibility
 */
function toSuggestion(contact: EnrichedContact | null, originalUrl: string) {
  if (!contact) {
    return {
      name: "",
      role: "",
      linkedinUrl: null,
      twitterHandle: null,
      telegram: null,
      email: null,
    };
  }

  return {
    name: contact.name || "",
    role: contact.role || contact.linkedin?.headline || "",
    linkedinUrl: contact.linkedin?.url || null,
    twitterHandle: contact.twitter?.handle || null,
    telegram: contact.telegram?.handle || null,
    email: contact.email?.emailAddress || null,
    // Extended fields (new)
    company: contact.company || contact.linkedin?.company || null,
    bio: contact.bio || contact.linkedin?.about || contact.twitter?.bio || null,
    location: contact.location || contact.linkedin?.location || contact.twitter?.location || null,
    profilePictureUrl: contact.profilePictureUrl || null,
  };
}

/**
 * Build rich metadata response for deep enrichment
 */
function toRichResponse(contact: EnrichedContact, correlation: ReturnType<typeof analyzeCorrelation>) {
  return {
    suggestion: toSuggestion(contact, contact.sourceUrl || ""),
    profiles: {
      linkedin: contact.linkedin
        ? {
            handle: contact.linkedin.handle,
            url: contact.linkedin.url,
            name: contact.linkedin.name,
            headline: contact.linkedin.headline,
            company: contact.linkedin.company,
            location: contact.linkedin.location,
            about: contact.linkedin.about,
            verified: contact.linkedin.verified,
            confidence: contact.linkedin.confidence,
          }
        : null,
      twitter: contact.twitter
        ? {
            handle: contact.twitter.handle,
            url: contact.twitter.url,
            displayName: contact.twitter.displayName,
            bio: contact.twitter.bio,
            followersCount: contact.twitter.followersCount,
            isVerified: contact.twitter.isVerified,
            verified: contact.twitter.verified,
            confidence: contact.twitter.confidence,
          }
        : null,
      telegram: contact.telegram
        ? {
            handle: contact.telegram.handle,
            url: contact.telegram.url,
            displayName: contact.telegram.displayName,
            bio: contact.telegram.bio,
            type: contact.telegram.type,
            memberCount: contact.telegram.memberCount,
            verified: contact.telegram.verified,
            confidence: contact.telegram.confidence,
          }
        : null,
      email: contact.email
        ? {
            address: contact.email.emailAddress,
            domain: contact.email.domain,
            isBusinessEmail: contact.email.isBusinessEmail,
          }
        : null,
    },
    correlation: {
      score: correlation.correlationScore,
      signals: correlation.signals,
      isLikelyMatch: correlation.isLikelyMatch,
      warnings: correlation.warnings,
    },
    enrichmentMethod: contact.enrichmentMethod,
    enrichedAt: contact.enrichedAt.toISOString(),
  };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = bodySchema.parse(await request.json());

    // Validate URL format
    const validation = validateSocialFormat(body.url);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.error || "Invalid social profile URL",
          suggestions: validation.suggestions,
        },
        { status: 400 }
      );
    }

    const plan = session.user.plan ?? "free";
    const useAI = canUseRealAI(plan);

    let enrichedContact: EnrichedContact | null = null;

    // Use AI-enhanced enrichment for paid plans
    if (useAI) {
      enrichedContact = await enrichContactWithAI(body.url, plan);
    } else {
      // Use heuristic enrichment for free plans
      enrichedContact = await enrichContactFromUrl(body.url, {
        deepFetch: true,
        correlate: true,
      });
    }

    if (!enrichedContact) {
      // Fallback: Try to at least parse the URL
      const parsed = parseSocialInput(body.url);
      if (parsed?.isValid) {
        return NextResponse.json({
          suggestion: {
            name: "",
            role: "",
            linkedinUrl: parsed.platform === "linkedin" ? parsed.canonicalUrl : null,
            twitterHandle: parsed.platform === "twitter" ? parsed.handle : null,
            telegram: parsed.platform === "telegram" ? parsed.handle : null,
            email: parsed.platform === "email" ? parsed.handle : null,
          },
        });
      }

      return NextResponse.json(
        { error: "Could not enrich contact from URL" },
        { status: 422 }
      );
    }

    // For deep enrichment requests, return full profile data
    if (body.deepEnrich) {
      const correlation = analyzeCorrelation(enrichedContact);
      return NextResponse.json(toRichResponse(enrichedContact, correlation));
    }

    // Standard response for backwards compatibility
    return NextResponse.json({
      suggestion: toSuggestion(enrichedContact, body.url),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }
    console.error("[contacts/enrich-from-url] error", { message: (err as Error).message });
    return NextResponse.json({ error: "Failed to enrich from URL" }, { status: 500 });
  }
}
