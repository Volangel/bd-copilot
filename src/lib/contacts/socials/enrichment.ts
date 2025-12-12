/**
 * Social Profile Enrichment Service
 * Multi-step enrichment with fallback chain for LinkedIn, Twitter, Telegram
 */

import fetchHtml from "@/lib/scraper/fetchHtml";
import { load } from "cheerio";
import { callOpenAIChat } from "@/lib/ai/providers/openai";
import {
  parseLinkedInUrl,
  parseTwitterUrl,
  parseTelegramUrl,
  parseEmail,
  extractSocialProfilesFromText,
} from "./parsers";
import type {
  EnrichedContact,
  LinkedInProfile,
  TwitterProfile,
  TelegramProfile,
  EmailProfile,
  SocialEnrichmentOptions,
  SocialProfile,
} from "./types";

// ============================================================================
// LinkedIn Enrichment
// ============================================================================

interface LinkedInMetadata {
  name?: string | null;
  headline?: string | null;
  company?: string | null;
  location?: string | null;
  about?: string | null;
  profilePictureUrl?: string | null;
}

/**
 * Extract LinkedIn profile data from page HTML using multiple strategies
 */
function extractLinkedInMetadata(html: string, url: string): LinkedInMetadata {
  const $ = load(html);
  const metadata: LinkedInMetadata = {};

  // Strategy 1: Meta tags (most reliable for public profiles)
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDescription = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");

  if (ogTitle) {
    // Format: "Name - Title - Company | LinkedIn"
    const parts = ogTitle.split(" | ")[0]?.split(" - ");
    if (parts?.[0]) metadata.name = parts[0].trim();
    if (parts?.[1]) metadata.headline = parts.slice(1).join(" - ").trim();
  }

  if (ogDescription) {
    // Description often contains location and summary
    metadata.about = ogDescription.slice(0, 500);
    // Try to extract location (often at start of description)
    const locationMatch = ogDescription.match(/^([^·]+)·/);
    if (locationMatch) {
      metadata.location = locationMatch[1].trim();
    }
  }

  if (ogImage && !ogImage.includes("static.licdn.com/sc/h/")) {
    metadata.profilePictureUrl = ogImage;
  }

  // Strategy 2: JSON-LD structured data
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const jsonText = $(el).text();
      const data = JSON.parse(jsonText);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item?.["@type"] === "Person") {
          if (!metadata.name && item.name) metadata.name = item.name;
          if (!metadata.headline && item.jobTitle) metadata.headline = item.jobTitle;
          if (!metadata.company && item.worksFor?.name) metadata.company = item.worksFor.name;
          if (!metadata.location && item.address?.addressLocality) {
            metadata.location = item.address.addressLocality;
          }
          if (!metadata.about && item.description) metadata.about = item.description;
          if (!metadata.profilePictureUrl && item.image) {
            metadata.profilePictureUrl = typeof item.image === "string" ? item.image : item.image?.url;
          }
        }
      }
    } catch {
      /* ignore parsing errors */
    }
  });

  // Strategy 3: Page title fallback
  if (!metadata.name) {
    const title = $("title").text();
    const match = title?.match(/^([^|–-]+)/);
    if (match) metadata.name = match[1].trim();
  }

  // Strategy 4: URL slug fallback
  if (!metadata.name) {
    const parsed = parseLinkedInUrl(url);
    if (parsed.isValid && parsed.handle) {
      // Convert slug to name: john-doe -> John Doe
      metadata.name = parsed.handle
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }

  // Extract company from headline if not found
  if (!metadata.company && metadata.headline) {
    const atMatch = metadata.headline.match(/(?:at|@)\s+([^,|]+)/i);
    if (atMatch) metadata.company = atMatch[1].trim();
  }

  return metadata;
}

export async function enrichLinkedInProfile(
  urlOrHandle: string,
  options?: SocialEnrichmentOptions
): Promise<LinkedInProfile | null> {
  const parsed = parseLinkedInUrl(urlOrHandle);
  if (!parsed.isValid) return null;

  const profile: LinkedInProfile = {
    platform: "linkedin",
    handle: parsed.handle,
    url: parsed.canonicalUrl,
    verified: false,
    confidence: 0.5,
  };

  if (!options?.deepFetch) {
    return profile;
  }

  try {
    const { html } = await fetchHtml(parsed.canonicalUrl);

    // Check if we got a valid profile page
    if (html.includes("Page not found") || html.includes("This LinkedIn Page isn")) {
      profile.verified = false;
      profile.confidence = 0;
      return profile;
    }

    const metadata = extractLinkedInMetadata(html, parsed.canonicalUrl);

    profile.name = metadata.name;
    profile.headline = metadata.headline;
    profile.company = metadata.company;
    profile.location = metadata.location;
    profile.about = metadata.about;
    profile.profilePictureUrl = metadata.profilePictureUrl;
    profile.verified = !!metadata.name;
    profile.confidence = metadata.name ? 0.8 : 0.3;
    profile.lastChecked = new Date();
  } catch (err) {
    console.error("[enrichLinkedInProfile] fetch error", { url: parsed.canonicalUrl, error: (err as Error).message });
  }

  return profile;
}

// ============================================================================
// Twitter Enrichment
// ============================================================================

interface TwitterMetadata {
  displayName?: string | null;
  bio?: string | null;
  profilePictureUrl?: string | null;
  headerImageUrl?: string | null;
  website?: string | null;
  location?: string | null;
  joinedDate?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  tweetCount?: number | null;
  isVerified?: boolean;
}

/**
 * Extract Twitter profile data from page HTML
 */
function extractTwitterMetadata(html: string, url: string): TwitterMetadata {
  const $ = load(html);
  const metadata: TwitterMetadata = {};

  // Strategy 1: Meta tags
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDescription = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const twitterTitle = $('meta[name="twitter:title"]').attr("content");
  const twitterDesc = $('meta[name="twitter:description"]').attr("content");

  // Parse title: "Name (@handle) / X"
  const titleText = ogTitle || twitterTitle;
  if (titleText) {
    const nameMatch = titleText.match(/^(.+?)\s*\(@/);
    if (nameMatch) metadata.displayName = nameMatch[1].trim();
  }

  // Bio from description
  if (ogDescription || twitterDesc) {
    metadata.bio = (ogDescription || twitterDesc)?.slice(0, 300);
  }

  // Profile picture
  if (ogImage && !ogImage.includes("card")) {
    metadata.profilePictureUrl = ogImage;
  }

  // Strategy 2: JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item?.["@type"] === "Person" || item?.["@type"] === "ProfilePage") {
          if (!metadata.displayName && item.name) metadata.displayName = item.name;
          if (!metadata.bio && item.description) metadata.bio = item.description;
          if (item.interactionStatistic) {
            for (const stat of item.interactionStatistic) {
              if (stat.interactionType?.includes("Follow")) {
                const count = parseInt(stat.userInteractionCount, 10);
                metadata.followersCount = isNaN(count) ? null : count;
              }
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
  });

  // Try to detect verification (imperfect heuristic)
  const pageText = $("body").text().toLowerCase();
  metadata.isVerified = pageText.includes("verified account") || html.includes("verified");

  return metadata;
}

export async function enrichTwitterProfile(
  urlOrHandle: string,
  options?: SocialEnrichmentOptions
): Promise<TwitterProfile | null> {
  const parsed = parseTwitterUrl(urlOrHandle);
  if (!parsed.isValid) return null;

  const profile: TwitterProfile = {
    platform: "twitter",
    handle: parsed.handle,
    url: parsed.canonicalUrl,
    verified: false,
    confidence: 0.5,
  };

  if (!options?.deepFetch) {
    return profile;
  }

  try {
    const { html } = await fetchHtml(parsed.canonicalUrl);

    // Check for suspended/not found accounts
    if (
      html.includes("Account suspended") ||
      html.includes("This account doesn't exist") ||
      html.includes("Hmm...this page doesn't exist")
    ) {
      profile.verified = false;
      profile.confidence = 0;
      return profile;
    }

    const metadata = extractTwitterMetadata(html, parsed.canonicalUrl);

    profile.displayName = metadata.displayName;
    profile.bio = metadata.bio;
    profile.profilePictureUrl = metadata.profilePictureUrl;
    profile.headerImageUrl = metadata.headerImageUrl;
    profile.website = metadata.website;
    profile.location = metadata.location;
    profile.joinedDate = metadata.joinedDate;
    profile.followersCount = metadata.followersCount;
    profile.followingCount = metadata.followingCount;
    profile.tweetCount = metadata.tweetCount;
    profile.isVerified = metadata.isVerified;
    profile.verified = !!metadata.displayName;
    profile.confidence = metadata.displayName ? 0.7 : 0.3;
    profile.lastChecked = new Date();
  } catch (err) {
    console.error("[enrichTwitterProfile] fetch error", { url: parsed.canonicalUrl, error: (err as Error).message });
  }

  return profile;
}

// ============================================================================
// Telegram Enrichment
// ============================================================================

interface TelegramMetadata {
  displayName?: string | null;
  bio?: string | null;
  username?: string | null;
  memberCount?: number | null;
  type?: "user" | "channel" | "group" | "bot";
  profilePictureUrl?: string | null;
}

/**
 * Extract Telegram profile data from t.me preview page
 */
function extractTelegramMetadata(html: string, url: string): TelegramMetadata {
  const $ = load(html);
  const metadata: TelegramMetadata = {};

  // t.me preview pages have specific structure
  const tgmeTitle = $(".tgme_page_title span").text();
  const tgmeDesc = $(".tgme_page_description").text();
  const tgmeExtra = $(".tgme_page_extra").text();
  const tgmePhoto = $(".tgme_page_photo_image").attr("src");

  if (tgmeTitle) {
    metadata.displayName = tgmeTitle.trim();
  }

  if (tgmeDesc) {
    metadata.bio = tgmeDesc.trim().slice(0, 300);
  }

  if (tgmePhoto) {
    metadata.profilePictureUrl = tgmePhoto;
  }

  // Parse member count
  if (tgmeExtra) {
    const memberMatch = tgmeExtra.match(/(\d[\d,\s]*)\s*(?:members?|subscribers?)/i);
    if (memberMatch) {
      const count = parseInt(memberMatch[1].replace(/[\s,]/g, ""), 10);
      metadata.memberCount = isNaN(count) ? null : count;
    }
  }

  // Determine type
  const pageText = $("body").text().toLowerCase();
  if (pageText.includes("subscribers") || pageText.includes("channel")) {
    metadata.type = "channel";
  } else if (pageText.includes("members") || pageText.includes("group")) {
    metadata.type = "group";
  } else if (pageText.includes("bot")) {
    metadata.type = "bot";
  } else {
    metadata.type = "user";
  }

  // Extract username from URL
  const parsed = parseTelegramUrl(url);
  if (parsed.isValid) {
    metadata.username = parsed.handle.replace(/^@/, "");
  }

  // Meta tags fallback
  if (!metadata.displayName) {
    const ogTitle = $('meta[property="og:title"]').attr("content");
    if (ogTitle) metadata.displayName = ogTitle;
  }

  if (!metadata.bio) {
    const ogDesc = $('meta[property="og:description"]').attr("content");
    if (ogDesc) metadata.bio = ogDesc.slice(0, 300);
  }

  return metadata;
}

export async function enrichTelegramProfile(
  urlOrHandle: string,
  options?: SocialEnrichmentOptions
): Promise<TelegramProfile | null> {
  const parsed = parseTelegramUrl(urlOrHandle);
  if (!parsed.isValid) return null;

  const profile: TelegramProfile = {
    platform: "telegram",
    handle: parsed.handle,
    url: parsed.canonicalUrl,
    verified: false,
    confidence: 0.5,
  };

  if (!options?.deepFetch) {
    return profile;
  }

  try {
    const { html } = await fetchHtml(parsed.canonicalUrl);

    // Check for not found
    if (
      html.includes("tgme_page_icon_error") ||
      html.includes("If you have") ||
      html.includes("you can contact")
    ) {
      // Check if it's a "contact us" page (profile doesn't exist)
      const hasError = html.includes("tgme_page_icon_error");
      if (hasError) {
        profile.verified = false;
        profile.confidence = 0;
        return profile;
      }
    }

    const metadata = extractTelegramMetadata(html, parsed.canonicalUrl);

    profile.displayName = metadata.displayName;
    profile.bio = metadata.bio;
    profile.username = metadata.username;
    profile.memberCount = metadata.memberCount;
    profile.type = metadata.type;
    profile.isBot = metadata.type === "bot";
    profile.verified = !!metadata.displayName;
    profile.confidence = metadata.displayName ? 0.7 : 0.3;
    profile.lastChecked = new Date();
  } catch (err) {
    console.error("[enrichTelegramProfile] fetch error", { url: parsed.canonicalUrl, error: (err as Error).message });
  }

  return profile;
}

// ============================================================================
// Email Enrichment
// ============================================================================

export function enrichEmailProfile(email: string): EmailProfile | null {
  const parsed = parseEmail(email);
  if (!parsed.isValid) return null;

  return {
    platform: "email",
    handle: parsed.handle,
    url: parsed.canonicalUrl,
    verified: true, // We can't verify without sending email
    confidence: 0.9, // High confidence in format validity
    emailAddress: parsed.handle,
    domain: parsed.domain,
    isBusinessEmail: parsed.isBusinessEmail,
    lastChecked: new Date(),
  };
}

// ============================================================================
// Main Enrichment Service
// ============================================================================

/**
 * Enrich a single URL or handle, auto-detecting platform
 */
export async function enrichSocialProfile(
  input: string,
  options?: SocialEnrichmentOptions
): Promise<SocialProfile | null> {
  const trimmed = input.trim();

  // Try each platform
  if (trimmed.includes("linkedin.com") || trimmed.includes("/in/")) {
    return enrichLinkedInProfile(trimmed, options);
  }

  if (trimmed.includes("twitter.com") || trimmed.includes("x.com")) {
    return enrichTwitterProfile(trimmed, options);
  }

  if (trimmed.includes("t.me") || trimmed.includes("telegram.")) {
    return enrichTelegramProfile(trimmed, options);
  }

  if (trimmed.includes("@") && trimmed.includes(".") && !trimmed.includes("/")) {
    return enrichEmailProfile(trimmed);
  }

  if (trimmed.startsWith("mailto:")) {
    return enrichEmailProfile(trimmed);
  }

  // Handle ambiguous @ handles
  if (trimmed.startsWith("@")) {
    // Prefer Twitter for short handles
    const handle = trimmed.slice(1);
    if (handle.length <= 15) {
      return enrichTwitterProfile(trimmed, options);
    }
    // Could be Telegram
    return enrichTelegramProfile(trimmed, options);
  }

  return null;
}

/**
 * Enrich multiple profiles with cross-platform correlation
 */
export async function enrichContactFromUrl(
  url: string,
  options?: SocialEnrichmentOptions
): Promise<EnrichedContact | null> {
  const effectiveOptions: SocialEnrichmentOptions = {
    deepFetch: true,
    correlate: true,
    ...options,
  };

  let primaryProfile: SocialProfile | null = null;
  const relatedProfiles: SocialProfile[] = [];
  const correlationSignals: string[] = [];

  try {
    // Enrich the primary URL
    primaryProfile = await enrichSocialProfile(url, effectiveOptions);

    if (!primaryProfile) {
      return null;
    }

    // Fetch the page to find related social links
    const { html, text } = await fetchHtml(url).catch(() => ({ html: "", text: "" }));

    if (html && effectiveOptions.correlate) {
      // Extract other social profiles from the page
      const foundProfiles = extractSocialProfilesFromText(html + " " + text);

      for (const parsed of foundProfiles) {
        // Skip if same as primary
        if (parsed.canonicalUrl === primaryProfile.url) continue;
        if (parsed.handle === primaryProfile.handle) continue;

        // Enrich the found profile
        const enriched = await enrichSocialProfile(parsed.rawInput, { deepFetch: false });
        if (enriched) {
          relatedProfiles.push(enriched);
          correlationSignals.push(`found ${enriched.platform} link on profile page`);
        }
      }
    }
  } catch (err) {
    console.error("[enrichContactFromUrl] error", { url, error: (err as Error).message });
  }

  if (!primaryProfile) return null;

  // Build enriched contact
  const contact: EnrichedContact = {
    name: "",
    enrichedAt: new Date(),
    enrichmentMethod: "heuristic",
    correlationScore: 0.5,
    correlationSignals,
  };

  // Extract name and details from profiles
  const allProfiles = [primaryProfile, ...relatedProfiles];

  for (const profile of allProfiles) {
    switch (profile.platform) {
      case "linkedin": {
        const lp = profile as LinkedInProfile;
        contact.linkedin = lp;
        if (!contact.name && lp.name) contact.name = lp.name;
        if (!contact.role && lp.headline) contact.role = lp.headline;
        if (!contact.company && lp.company) contact.company = lp.company;
        if (!contact.location && lp.location) contact.location = lp.location;
        if (!contact.bio && lp.about) contact.bio = lp.about;
        if (!contact.profilePictureUrl && lp.profilePictureUrl) contact.profilePictureUrl = lp.profilePictureUrl;
        break;
      }
      case "twitter": {
        const tp = profile as TwitterProfile;
        contact.twitter = tp;
        if (!contact.name && tp.displayName) contact.name = tp.displayName;
        if (!contact.bio && tp.bio) contact.bio = tp.bio;
        if (!contact.location && tp.location) contact.location = tp.location;
        if (!contact.profilePictureUrl && tp.profilePictureUrl) contact.profilePictureUrl = tp.profilePictureUrl;
        break;
      }
      case "telegram": {
        const tgp = profile as TelegramProfile;
        contact.telegram = tgp;
        if (!contact.name && tgp.displayName) contact.name = tgp.displayName;
        if (!contact.bio && tgp.bio) contact.bio = tgp.bio;
        break;
      }
      case "email": {
        contact.email = profile as EmailProfile;
        break;
      }
    }
  }

  // Calculate correlation score
  let score = 0.5;
  if (relatedProfiles.length > 0) {
    score += 0.1 * Math.min(relatedProfiles.length, 3);
    correlationSignals.push(`${relatedProfiles.length} linked profiles found`);
  }
  if (contact.name) score += 0.1;
  if (contact.role || contact.company) score += 0.1;
  contact.correlationScore = Math.min(score, 1);

  contact.sourceUrl = url;

  return contact;
}

// ============================================================================
// AI-Enhanced Enrichment
// ============================================================================

const SOCIAL_EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting contact information from web pages.
Given page content, extract all social profiles and contact details you can find.

Focus on finding:
- Full name (not company names)
- Job title/role
- Company/organization
- LinkedIn profile URLs
- Twitter/X handles or URLs
- Telegram handles or URLs
- Email addresses

Be precise and only extract information that is clearly present. Do not guess or invent data.
Return ONLY valid JSON without markdown code blocks.`;

const SOCIAL_EXTRACTION_USER_TEMPLATE = `Extract contact information from this page:

URL: {{url}}
Title: {{title}}
Description: {{description}}

Page content (truncated):
{{content}}

Anchors found:
{{anchors}}

Return JSON:
{
  "name": "Person's full name or null",
  "role": "Job title or null",
  "company": "Company name or null",
  "linkedinUrl": "Full LinkedIn URL or null",
  "twitterHandle": "@handle or null",
  "telegram": "@handle or null",
  "email": "email@domain.com or null",
  "bio": "Short bio/description or null",
  "location": "Location or null",
  "otherSocials": [{"platform": "name", "url": "url"}]
}`;

interface AIExtractionResult {
  name?: string | null;
  role?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  telegram?: string | null;
  email?: string | null;
  bio?: string | null;
  location?: string | null;
  otherSocials?: { platform: string; url: string }[];
}

export async function enrichContactWithAI(
  url: string,
  userPlan: string
): Promise<EnrichedContact | null> {
  // Only available for paid plans
  const PAID_PLANS = new Set(["starter", "pro", "enterprise"]);
  if (!PAID_PLANS.has(userPlan)) {
    return enrichContactFromUrl(url, { deepFetch: true, correlate: true });
  }

  if (process.env.AI_PROVIDER_ENABLED !== "true" || !process.env.OPENAI_API_KEY) {
    return enrichContactFromUrl(url, { deepFetch: true, correlate: true });
  }

  try {
    // First do heuristic enrichment
    const heuristicResult = await enrichContactFromUrl(url, { deepFetch: true, correlate: true });

    // Fetch page for AI analysis
    const { html, text } = await fetchHtml(url).catch(() => ({ html: "", text: "" }));
    const $ = load(html);

    const title = $("title").text() || "";
    const description = $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") || "";

    const anchors = $("a[href]")
      .toArray()
      .slice(0, 20)
      .map((el) => {
        const href = $(el).attr("href") || "";
        const anchorText = $(el).text().trim().slice(0, 50);
        return `${href} "${anchorText}"`;
      })
      .join("\n");

    const userPrompt = SOCIAL_EXTRACTION_USER_TEMPLATE
      .replace("{{url}}", url)
      .replace("{{title}}", title || "N/A")
      .replace("{{description}}", description || "N/A")
      .replace("{{content}}", (text || html.replace(/<[^>]+>/g, " ")).slice(0, 2000))
      .replace("{{anchors}}", anchors || "None found");

    const aiResult = await callOpenAIChat<AIExtractionResult>({
      model: process.env.AI_MODEL_ANALYZE || "gpt-4o-mini",
      system: SOCIAL_EXTRACTION_SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens: 800,
    });

    // Merge AI results with heuristic results
    const contact: EnrichedContact = {
      name: aiResult.name?.trim() || heuristicResult?.name || "",
      role: aiResult.role?.trim() || heuristicResult?.role || null,
      company: aiResult.company?.trim() || heuristicResult?.company || null,
      bio: aiResult.bio?.trim() || heuristicResult?.bio || null,
      location: aiResult.location?.trim() || heuristicResult?.location || null,
      profilePictureUrl: heuristicResult?.profilePictureUrl || null,
      linkedin: heuristicResult?.linkedin || null,
      twitter: heuristicResult?.twitter || null,
      telegram: heuristicResult?.telegram || null,
      email: heuristicResult?.email || null,
      correlationScore: 0.8,
      correlationSignals: ["AI extraction", ...(heuristicResult?.correlationSignals || [])],
      sourceUrl: url,
      enrichedAt: new Date(),
      enrichmentMethod: "hybrid",
    };

    // Enrich profiles from AI results if not already found
    if (aiResult.linkedinUrl && !contact.linkedin) {
      const linkedinProfile = await enrichLinkedInProfile(aiResult.linkedinUrl, { deepFetch: false });
      if (linkedinProfile) contact.linkedin = linkedinProfile;
    }

    if (aiResult.twitterHandle && !contact.twitter) {
      const twitterProfile = await enrichTwitterProfile(aiResult.twitterHandle, { deepFetch: false });
      if (twitterProfile) contact.twitter = twitterProfile;
    }

    if (aiResult.telegram && !contact.telegram) {
      const telegramProfile = await enrichTelegramProfile(aiResult.telegram, { deepFetch: false });
      if (telegramProfile) contact.telegram = telegramProfile;
    }

    if (aiResult.email && !contact.email) {
      const emailProfile = enrichEmailProfile(aiResult.email);
      if (emailProfile) contact.email = emailProfile;
    }

    return contact;
  } catch (err) {
    console.error("[enrichContactWithAI] error", { url, error: (err as Error).message });
    // Fallback to heuristic
    return enrichContactFromUrl(url, { deepFetch: true, correlate: true });
  }
}
