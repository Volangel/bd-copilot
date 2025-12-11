/**
 * Social Profile Validation Utilities
 * Validates handles, URLs, and cross-references social profiles
 */

import type { SocialValidationResult, SocialPlatform, EnrichedContact } from "./types";
import { parseLinkedInUrl, parseTwitterUrl, parseTelegramUrl, parseEmail } from "./parsers";

// ============================================================================
// Format Validation
// ============================================================================

/**
 * Validate LinkedIn profile URL or handle format
 */
export function validateLinkedInFormat(input: string): SocialValidationResult {
  const parsed = parseLinkedInUrl(input);

  if (!parsed.isValid) {
    return {
      isValid: false,
      error: "Invalid LinkedIn URL or profile slug",
      suggestions: [
        "Use format: https://linkedin.com/in/username",
        "Or just the profile slug: john-doe",
      ],
    };
  }

  // Additional validations
  const handle = parsed.handle;

  // LinkedIn slugs are typically lowercase with hyphens
  if (handle.includes("_")) {
    return {
      isValid: true,
      error: "LinkedIn profile slugs typically use hyphens, not underscores",
      suggestions: [handle.replace(/_/g, "-")],
    };
  }

  // Very long slugs might be wrong
  if (handle.length > 100) {
    return {
      isValid: false,
      error: "LinkedIn profile slug seems too long",
    };
  }

  return { isValid: true };
}

/**
 * Validate Twitter handle format
 */
export function validateTwitterFormat(input: string): SocialValidationResult {
  const parsed = parseTwitterUrl(input);

  if (!parsed.isValid) {
    return {
      isValid: false,
      error: "Invalid Twitter handle or URL",
      suggestions: [
        "Use format: @username or https://x.com/username",
        "Handles must be 1-15 characters, letters, numbers, underscores only",
      ],
    };
  }

  const handle = parsed.handle.replace(/^@/, "");

  // Validate Twitter-specific rules
  if (handle.length > 15) {
    return {
      isValid: false,
      error: "Twitter handles cannot exceed 15 characters",
    };
  }

  if (/^\d+$/.test(handle)) {
    return {
      isValid: false,
      error: "Twitter handles cannot be all numbers",
    };
  }

  return { isValid: true };
}

/**
 * Validate Telegram handle format
 */
export function validateTelegramFormat(input: string): SocialValidationResult {
  const parsed = parseTelegramUrl(input);

  if (!parsed.isValid) {
    return {
      isValid: false,
      error: "Invalid Telegram handle or URL",
      suggestions: [
        "Use format: @username or https://t.me/username",
        "Handles must be 5-32 characters",
      ],
    };
  }

  const handle = parsed.handle.replace(/^@/, "");

  if (handle.length < 5) {
    return {
      isValid: false,
      error: "Telegram handles must be at least 5 characters",
    };
  }

  if (handle.length > 32) {
    return {
      isValid: false,
      error: "Telegram handles cannot exceed 32 characters",
    };
  }

  return { isValid: true };
}

/**
 * Validate email format
 */
export function validateEmailFormat(input: string): SocialValidationResult {
  const parsed = parseEmail(input);

  if (!parsed.isValid) {
    return {
      isValid: false,
      error: "Invalid email address format",
      suggestions: ["Use format: name@domain.com"],
    };
  }

  // Additional email validations
  const email = parsed.handle;
  const domain = parsed.domain;

  // Check for common typos in domains
  const DOMAIN_TYPOS: Record<string, string> = {
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gnail.com": "gmail.com",
    "gamil.com": "gmail.com",
    "hotmal.com": "hotmail.com",
    "hotmial.com": "hotmail.com",
    "outlok.com": "outlook.com",
    "outloo.com": "outlook.com",
    "yahooo.com": "yahoo.com",
    "yaho.com": "yahoo.com",
  };

  if (DOMAIN_TYPOS[domain]) {
    return {
      isValid: true,
      error: `Possible typo in domain: ${domain}`,
      suggestions: [email.replace(domain, DOMAIN_TYPOS[domain])],
    };
  }

  // Check for missing TLD
  if (!domain.includes(".")) {
    return {
      isValid: false,
      error: "Email domain is missing top-level domain (e.g., .com)",
    };
  }

  return { isValid: true };
}

/**
 * Validate any social handle/URL
 */
export function validateSocialFormat(input: string, platform?: SocialPlatform): SocialValidationResult {
  if (platform) {
    switch (platform) {
      case "linkedin":
        return validateLinkedInFormat(input);
      case "twitter":
        return validateTwitterFormat(input);
      case "telegram":
        return validateTelegramFormat(input);
      case "email":
        return validateEmailFormat(input);
    }
  }

  // Auto-detect and validate
  const trimmed = input.trim().toLowerCase();

  if (trimmed.includes("linkedin.com")) {
    return validateLinkedInFormat(input);
  }
  if (trimmed.includes("twitter.com") || trimmed.includes("x.com")) {
    return validateTwitterFormat(input);
  }
  if (trimmed.includes("t.me") || trimmed.includes("telegram.")) {
    return validateTelegramFormat(input);
  }
  if (trimmed.includes("@") && trimmed.includes(".") && !trimmed.includes("/")) {
    return validateEmailFormat(input);
  }
  if (trimmed.startsWith("mailto:")) {
    return validateEmailFormat(input);
  }

  // Handle ambiguous @ handles
  if (trimmed.startsWith("@")) {
    const twitterResult = validateTwitterFormat(input);
    const telegramResult = validateTelegramFormat(input);

    // If both valid, prefer the one that fits better
    if (twitterResult.isValid && telegramResult.isValid) {
      const handle = trimmed.slice(1);
      return handle.length <= 15 ? twitterResult : telegramResult;
    }

    return twitterResult.isValid ? twitterResult : telegramResult;
  }

  return {
    isValid: false,
    error: "Could not determine social platform from input",
    suggestions: [
      "For LinkedIn: https://linkedin.com/in/username",
      "For Twitter: @username or https://x.com/username",
      "For Telegram: @username or https://t.me/username",
      "For Email: name@domain.com",
    ],
  };
}

// ============================================================================
// Cross-Platform Correlation
// ============================================================================

/**
 * Calculate similarity between two names
 * Returns score 0-1
 */
function nameSimilarity(name1: string | null | undefined, name2: string | null | undefined): number {
  if (!name1 || !name2) return 0;

  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) return 1;

  // Split into parts and compare
  const parts1 = n1.split(/\s+/);
  const parts2 = n2.split(/\s+/);

  let matches = 0;
  for (const p1 of parts1) {
    if (parts2.some((p2) => p1 === p2 || p1.includes(p2) || p2.includes(p1))) {
      matches++;
    }
  }

  return matches / Math.max(parts1.length, parts2.length);
}

/**
 * Check if two strings represent the same company
 */
function companySimilarity(c1: string | null | undefined, c2: string | null | undefined): number {
  if (!c1 || !c2) return 0;

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const n1 = normalize(c1);
  const n2 = normalize(c2);

  if (n1 === n2) return 1;
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;

  return 0;
}

export interface CorrelationResult {
  correlationScore: number;
  signals: string[];
  isLikelyMatch: boolean;
  warnings: string[];
}

/**
 * Analyze cross-platform correlation between social profiles
 * Helps verify that multiple social profiles belong to the same person
 */
export function analyzeCorrelation(contact: EnrichedContact): CorrelationResult {
  const signals: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  const profiles = [
    contact.linkedin,
    contact.twitter,
    contact.telegram,
    contact.email,
  ].filter(Boolean);

  if (profiles.length < 2) {
    return {
      correlationScore: 0.5,
      signals: ["Single profile - correlation not applicable"],
      isLikelyMatch: true,
      warnings: [],
    };
  }

  // Name consistency check
  const names: string[] = [];
  if (contact.linkedin?.name) names.push(contact.linkedin.name);
  if (contact.twitter?.displayName) names.push(contact.twitter.displayName);
  if (contact.telegram?.displayName) names.push(contact.telegram.displayName);
  if (contact.name) names.push(contact.name);

  if (names.length >= 2) {
    const nameScores: number[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        nameScores.push(nameSimilarity(names[i], names[j]));
      }
    }
    const avgNameScore = nameScores.reduce((a, b) => a + b, 0) / nameScores.length;

    if (avgNameScore > 0.7) {
      score += 0.3;
      signals.push("Names are consistent across profiles");
    } else if (avgNameScore > 0.3) {
      score += 0.1;
      signals.push("Names partially match");
    } else {
      warnings.push("Names differ significantly across profiles");
    }
  }

  // Company/bio consistency
  const companies: string[] = [];
  if (contact.linkedin?.company) companies.push(contact.linkedin.company);
  if (contact.linkedin?.headline) {
    const match = contact.linkedin.headline.match(/(?:at|@)\s+(.+?)(?:$|,|\|)/i);
    if (match) companies.push(match[1]);
  }
  if (contact.twitter?.bio) {
    const match = contact.twitter.bio.match(/(?:at|@)\s+(.+?)(?:$|,|\||\.)/i);
    if (match) companies.push(match[1]);
  }

  if (companies.length >= 2) {
    const companyMatches = companies.some((c1, i) =>
      companies.slice(i + 1).some((c2) => companySimilarity(c1, c2) > 0.5)
    );
    if (companyMatches) {
      score += 0.2;
      signals.push("Company references match across profiles");
    }
  }

  // Handle similarity (some people use same handle everywhere)
  const handles: string[] = [];
  if (contact.linkedin?.handle) handles.push(contact.linkedin.handle.replace(/-/g, ""));
  if (contact.twitter?.handle) handles.push(contact.twitter.handle.replace(/^@/, ""));
  if (contact.telegram?.handle) handles.push(contact.telegram.handle.replace(/^@/, ""));
  if (contact.email?.handle) {
    const localPart = contact.email.handle.split("@")[0];
    handles.push(localPart.replace(/[._]/g, ""));
  }

  if (handles.length >= 2) {
    const handleMatches = handles.some((h1, i) =>
      handles.slice(i + 1).some((h2) => {
        const n1 = h1.toLowerCase();
        const n2 = h2.toLowerCase();
        return n1 === n2 || n1.includes(n2) || n2.includes(n1);
      })
    );
    if (handleMatches) {
      score += 0.2;
      signals.push("Similar handles used across platforms");
    }
  }

  // Profile picture (if we had image comparison)
  // This would require ML/image hashing, placeholder for future
  if (contact.linkedin?.profilePictureUrl && contact.twitter?.profilePictureUrl) {
    signals.push("Both profiles have photos (manual verification recommended)");
  }

  // Verification status
  if (contact.twitter?.isVerified) {
    score += 0.1;
    signals.push("Twitter profile is verified");
  }

  // Location consistency
  const locations: string[] = [];
  if (contact.linkedin?.location) locations.push(contact.linkedin.location);
  if (contact.twitter?.location) locations.push(contact.twitter.location);
  if (contact.location) locations.push(contact.location);

  if (locations.length >= 2) {
    const locMatch = locations.some((l1, i) =>
      locations.slice(i + 1).some((l2) => {
        const n1 = l1.toLowerCase();
        const n2 = l2.toLowerCase();
        return n1.includes(n2) || n2.includes(n1);
      })
    );
    if (locMatch) {
      score += 0.1;
      signals.push("Locations match across profiles");
    }
  }

  // Email domain matches company
  if (contact.email?.domain && contact.company) {
    const emailDomain = contact.email.domain.toLowerCase().replace(/^www\./, "");
    const companyNorm = contact.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (emailDomain.includes(companyNorm) || companyNorm.includes(emailDomain.split(".")[0])) {
      score += 0.1;
      signals.push("Email domain matches company");
    }
  }

  // Add base score for having multiple profiles
  score += 0.1 * Math.min(profiles.length - 1, 3);
  signals.push(`${profiles.length} social profiles found`);

  const finalScore = Math.min(score, 1);

  return {
    correlationScore: finalScore,
    signals,
    isLikelyMatch: finalScore > 0.4 && warnings.length === 0,
    warnings,
  };
}

// ============================================================================
// Bulk Validation
// ============================================================================

export interface BulkValidationResult {
  valid: Array<{ input: string; platform: SocialPlatform; normalized: string }>;
  invalid: Array<{ input: string; error: string; suggestions?: string[] }>;
}

/**
 * Validate multiple social inputs at once
 */
export function validateMultipleSocials(inputs: string[]): BulkValidationResult {
  const result: BulkValidationResult = { valid: [], invalid: [] };

  for (const input of inputs) {
    const trimmed = input.trim();
    if (!trimmed) continue;

    const validation = validateSocialFormat(trimmed);

    if (validation.isValid) {
      // Determine platform and normalize
      let platform: SocialPlatform = "twitter"; // default
      let normalized = trimmed;

      if (trimmed.toLowerCase().includes("linkedin")) {
        platform = "linkedin";
        const parsed = parseLinkedInUrl(trimmed);
        normalized = parsed.canonicalUrl;
      } else if (trimmed.toLowerCase().includes("twitter") || trimmed.toLowerCase().includes("x.com")) {
        platform = "twitter";
        const parsed = parseTwitterUrl(trimmed);
        normalized = parsed.handle;
      } else if (trimmed.toLowerCase().includes("t.me") || trimmed.toLowerCase().includes("telegram")) {
        platform = "telegram";
        const parsed = parseTelegramUrl(trimmed);
        normalized = parsed.handle;
      } else if (trimmed.includes("@") && trimmed.includes(".")) {
        platform = "email";
        const parsed = parseEmail(trimmed);
        normalized = parsed.handle;
      } else if (trimmed.startsWith("@")) {
        // Ambiguous handle - check length
        const handle = trimmed.slice(1);
        if (handle.length <= 15) {
          platform = "twitter";
          normalized = `@${handle.toLowerCase()}`;
        } else {
          platform = "telegram";
          normalized = `@${handle.toLowerCase()}`;
        }
      }

      result.valid.push({ input: trimmed, platform, normalized });
    } else {
      result.invalid.push({
        input: trimmed,
        error: validation.error || "Invalid format",
        suggestions: validation.suggestions,
      });
    }
  }

  return result;
}
