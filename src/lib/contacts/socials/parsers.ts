/**
 * Robust Social URL Parsers
 * Handles all variations of LinkedIn, Twitter, Telegram URLs and handles
 */

import type { ParsedSocialUrl, SocialPlatform } from "./types";

// ============================================================================
// LinkedIn Parser
// ============================================================================

const LINKEDIN_PATTERNS = {
  // Standard profile URLs
  profile: /^(?:https?:\/\/)?(?:www\.)?(?:[\w-]+\.)?linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)\/?(?:\?.*)?$/i,
  // Company pages (not personal profiles)
  company: /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9\-_%]+)\/?/i,
  // Mobile URLs
  mobile: /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/mwlite\/in\/([a-zA-Z0-9\-_%]+)\/?/i,
  // International subdomains (de.linkedin.com, fr.linkedin.com)
  intl: /^(?:https?:\/\/)?(\w{2})\.linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)\/?/i,
};

// Reserved LinkedIn slugs that aren't profiles
const LINKEDIN_RESERVED_SLUGS = new Set([
  "pub",
  "feed",
  "jobs",
  "company",
  "school",
  "groups",
  "learning",
  "pulse",
  "messaging",
  "notifications",
  "mynetwork",
  "settings",
  "premium",
]);

export function parseLinkedInUrl(input: string): ParsedSocialUrl {
  const trimmed = input.trim();

  // Handle direct slug input (no URL)
  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    const slug = trimmed.replace(/^@/, "").toLowerCase();
    if (slug && !LINKEDIN_RESERVED_SLUGS.has(slug) && /^[a-z0-9\-]+$/.test(slug)) {
      return {
        platform: "linkedin",
        handle: slug,
        canonicalUrl: `https://www.linkedin.com/in/${slug}`,
        isValid: true,
        rawInput: input,
        normalized: true,
      };
    }
  }

  // Try standard profile pattern
  let match = trimmed.match(LINKEDIN_PATTERNS.profile);
  if (match?.[1]) {
    const slug = decodeURIComponent(match[1]).toLowerCase();
    if (!LINKEDIN_RESERVED_SLUGS.has(slug)) {
      return {
        platform: "linkedin",
        handle: slug,
        canonicalUrl: `https://www.linkedin.com/in/${slug}`,
        isValid: true,
        rawInput: input,
        normalized: true,
      };
    }
  }

  // Try mobile pattern
  match = trimmed.match(LINKEDIN_PATTERNS.mobile);
  if (match?.[1]) {
    const slug = decodeURIComponent(match[1]).toLowerCase();
    // Validate against reserved slugs
    if (!LINKEDIN_RESERVED_SLUGS.has(slug)) {
      return {
        platform: "linkedin",
        handle: slug,
        canonicalUrl: `https://www.linkedin.com/in/${slug}`,
        isValid: true,
        rawInput: input,
        normalized: true,
      };
    }
  }

  // Try international pattern
  match = trimmed.match(LINKEDIN_PATTERNS.intl);
  if (match?.[2]) {
    const slug = decodeURIComponent(match[2]).toLowerCase();
    // Validate against reserved slugs
    if (!LINKEDIN_RESERVED_SLUGS.has(slug)) {
      return {
        platform: "linkedin",
        handle: slug,
        canonicalUrl: `https://www.linkedin.com/in/${slug}`,
        isValid: true,
        rawInput: input,
        normalized: true,
      };
    }
  }

  return {
    platform: "linkedin",
    handle: "",
    canonicalUrl: "",
    isValid: false,
    rawInput: input,
    normalized: false,
  };
}

// ============================================================================
// Twitter / X Parser
// ============================================================================

const TWITTER_PATTERNS = {
  // Standard twitter.com URLs
  twitter: /^(?:https?:\/\/)?(?:www\.)?twitter\.com\/(@?[a-zA-Z0-9_]+)\/?(?:\?.*)?$/i,
  // X.com URLs
  x: /^(?:https?:\/\/)?(?:www\.)?x\.com\/(@?[a-zA-Z0-9_]+)\/?(?:\?.*)?$/i,
  // Mobile twitter URLs
  mobile: /^(?:https?:\/\/)?mobile\.(?:twitter|x)\.com\/(@?[a-zA-Z0-9_]+)\/?/i,
  // Tweet URLs (extract user)
  tweet: /^(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/(@?[a-zA-Z0-9_]+)\/status\/\d+/i,
  // Intent URLs
  intent: /^(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/intent\/user\?.*screen_name=([a-zA-Z0-9_]+)/i,
};

// Reserved Twitter routes
const TWITTER_RESERVED = new Set([
  "home",
  "explore",
  "notifications",
  "messages",
  "bookmarks",
  "lists",
  "settings",
  "compose",
  "search",
  "i",
  "hashtag",
  "intent",
  "share",
  "login",
  "signup",
  "privacy",
  "tos",
  "about",
  "help",
  "status",
]);

export function parseTwitterUrl(input: string): ParsedSocialUrl {
  const trimmed = input.trim();

  // Handle direct handle input (@username or username)
  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    const handle = trimmed.replace(/^@/, "").toLowerCase();
    if (handle && !TWITTER_RESERVED.has(handle) && /^[a-z0-9_]{1,15}$/.test(handle)) {
      return {
        platform: "twitter",
        handle: `@${handle}`,
        canonicalUrl: `https://x.com/${handle}`,
        isValid: true,
        rawInput: input,
        normalized: true,
      };
    }
  }

  // Try all patterns
  for (const [key, pattern] of Object.entries(TWITTER_PATTERNS)) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const handle = match[1].replace(/^@/, "").toLowerCase();
      if (!TWITTER_RESERVED.has(handle) && /^[a-z0-9_]{1,15}$/.test(handle)) {
        return {
          platform: "twitter",
          handle: `@${handle}`,
          canonicalUrl: `https://x.com/${handle}`,
          isValid: true,
          rawInput: input,
          normalized: true,
        };
      }
    }
  }

  return {
    platform: "twitter",
    handle: "",
    canonicalUrl: "",
    isValid: false,
    rawInput: input,
    normalized: false,
  };
}

// ============================================================================
// Telegram Parser
// ============================================================================

const TELEGRAM_PATTERNS = {
  // Standard t.me URLs
  tme: /^(?:https?:\/\/)?t\.me\/(@?[a-zA-Z0-9_]{5,32})\/?(?:\?.*)?$/i,
  // telegram.me URLs
  telegramMe: /^(?:https?:\/\/)?telegram\.me\/(@?[a-zA-Z0-9_]{5,32})\/?/i,
  // telegram.org URLs
  telegramOrg: /^(?:https?:\/\/)?(?:www\.)?telegram\.org\/(@?[a-zA-Z0-9_]{5,32})\/?/i,
  // Deep link URLs
  deepLink: /^(?:https?:\/\/)?t\.me\/joinchat\/([a-zA-Z0-9_-]+)\/?/i,
  // tg:// protocol
  tgProtocol: /^tg:\/\/resolve\?domain=([a-zA-Z0-9_]{5,32})/i,
};

// Reserved Telegram routes
const TELEGRAM_RESERVED = new Set([
  "joinchat",
  "addstickers",
  "addtheme",
  "setlanguage",
  "share",
  "socks",
  "proxy",
  "login",
  "passport",
  "confirmphone",
  "invoice",
  "premium",
  "addlist",
]);

export function parseTelegramUrl(input: string): ParsedSocialUrl {
  const trimmed = input.trim();

  // Handle direct handle input (@username or username)
  if (!trimmed.includes("/") && !trimmed.includes(".")) {
    const handle = trimmed.replace(/^@/, "").toLowerCase();
    if (handle && !TELEGRAM_RESERVED.has(handle) && /^[a-z0-9_]{5,32}$/.test(handle)) {
      return {
        platform: "telegram",
        handle: `@${handle}`,
        canonicalUrl: `https://t.me/${handle}`,
        isValid: true,
        rawInput: input,
        normalized: true,
      };
    }
  }

  // Try standard patterns
  for (const [key, pattern] of Object.entries(TELEGRAM_PATTERNS)) {
    if (key === "deepLink") continue; // Handle separately
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const handle = match[1].replace(/^@/, "").toLowerCase();
      if (!TELEGRAM_RESERVED.has(handle) && /^[a-z0-9_]{5,32}$/.test(handle)) {
        return {
          platform: "telegram",
          handle: `@${handle}`,
          canonicalUrl: `https://t.me/${handle}`,
          isValid: true,
          rawInput: input,
          normalized: true,
        };
      }
    }
  }

  // Deep links (invite links) - valid but can't normalize to a handle
  const deepMatch = trimmed.match(TELEGRAM_PATTERNS.deepLink);
  if (deepMatch?.[1]) {
    return {
      platform: "telegram",
      handle: `joinchat/${deepMatch[1]}`,
      canonicalUrl: `https://t.me/joinchat/${deepMatch[1]}`,
      isValid: true,
      rawInput: input,
      normalized: false, // Can't normalize invite links
    };
  }

  return {
    platform: "telegram",
    handle: "",
    canonicalUrl: "",
    isValid: false,
    rawInput: input,
    normalized: false,
  };
}

// ============================================================================
// Email Parser
// ============================================================================

const EMAIL_PATTERN = /^(?:mailto:)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/i;

// Common personal email domains
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "gmx.net",
  "fastmail.com",
  "tutanota.com",
]);

export function parseEmail(input: string): ParsedSocialUrl & { domain: string; isBusinessEmail: boolean } {
  const trimmed = input.trim().toLowerCase();
  const match = trimmed.match(EMAIL_PATTERN);

  if (match?.[1]) {
    const email = match[1];
    const domain = email.split("@")[1];
    const isBusinessEmail = !PERSONAL_EMAIL_DOMAINS.has(domain);

    return {
      platform: "email",
      handle: email,
      canonicalUrl: `mailto:${email}`,
      isValid: true,
      rawInput: input,
      normalized: true,
      domain,
      isBusinessEmail,
    };
  }

  return {
    platform: "email",
    handle: "",
    canonicalUrl: "",
    isValid: false,
    rawInput: input,
    normalized: false,
    domain: "",
    isBusinessEmail: false,
  };
}

// ============================================================================
// Auto-detect Platform
// ============================================================================

export function detectPlatform(input: string): SocialPlatform | null {
  const trimmed = input.trim().toLowerCase();

  if (trimmed.includes("linkedin.com")) return "linkedin";
  if (trimmed.includes("twitter.com") || trimmed.includes("x.com")) return "twitter";
  if (trimmed.includes("t.me") || trimmed.includes("telegram.")) return "telegram";
  if (trimmed.includes("@") && trimmed.includes(".") && !trimmed.includes("/")) return "email";
  if (trimmed.startsWith("mailto:")) return "email";

  // Heuristics for handles
  if (trimmed.startsWith("@")) {
    // Could be Twitter or Telegram
    const handle = trimmed.slice(1);
    if (/^[a-z0-9_]{1,15}$/.test(handle)) return "twitter"; // Twitter has 15 char limit
    if (/^[a-z0-9_]{5,32}$/.test(handle)) return "telegram"; // Telegram min 5 chars
  }

  return null;
}

/**
 * Parse any social URL or handle and return normalized result
 */
export function parseSocialInput(input: string): ParsedSocialUrl | null {
  const platform = detectPlatform(input);

  if (!platform) {
    // Try each parser
    const linkedin = parseLinkedInUrl(input);
    if (linkedin.isValid) return linkedin;

    const twitter = parseTwitterUrl(input);
    if (twitter.isValid) return twitter;

    const telegram = parseTelegramUrl(input);
    if (telegram.isValid) return telegram;

    const email = parseEmail(input);
    if (email.isValid) return email;

    return null;
  }

  switch (platform) {
    case "linkedin":
      return parseLinkedInUrl(input);
    case "twitter":
      return parseTwitterUrl(input);
    case "telegram":
      return parseTelegramUrl(input);
    case "email":
      return parseEmail(input);
    default:
      return null;
  }
}

/**
 * Normalize a social handle or URL to canonical format
 * Returns null if invalid
 */
export function normalizeSocialHandle(input: string, platform?: SocialPlatform): string | null {
  if (platform) {
    switch (platform) {
      case "linkedin": {
        const parsed = parseLinkedInUrl(input);
        return parsed.isValid ? parsed.canonicalUrl : null;
      }
      case "twitter": {
        const parsed = parseTwitterUrl(input);
        return parsed.isValid ? parsed.handle : null;
      }
      case "telegram": {
        const parsed = parseTelegramUrl(input);
        return parsed.isValid ? parsed.handle : null;
      }
      case "email": {
        const parsed = parseEmail(input);
        return parsed.isValid ? parsed.handle : null;
      }
    }
  }

  const parsed = parseSocialInput(input);
  return parsed?.isValid ? (parsed.platform === "linkedin" ? parsed.canonicalUrl : parsed.handle) : null;
}

/**
 * Extract all social profiles from a text blob
 */
export function extractSocialProfilesFromText(text: string): ParsedSocialUrl[] {
  const results: ParsedSocialUrl[] = [];
  const seen = new Set<string>();

  // LinkedIn URLs
  const linkedinMatches = text.match(/https?:\/\/(?:www\.)?(?:[\w-]+\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/gi);
  linkedinMatches?.forEach((url) => {
    const parsed = parseLinkedInUrl(url);
    if (parsed.isValid && !seen.has(parsed.handle)) {
      seen.add(parsed.handle);
      results.push(parsed);
    }
  });

  // Twitter/X URLs
  const twitterMatches = text.match(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/?/gi);
  twitterMatches?.forEach((url) => {
    const parsed = parseTwitterUrl(url);
    if (parsed.isValid && !seen.has(parsed.handle)) {
      seen.add(parsed.handle);
      results.push(parsed);
    }
  });

  // Telegram URLs
  const telegramMatches = text.match(/https?:\/\/t\.me\/[a-zA-Z0-9_]+\/?/gi);
  telegramMatches?.forEach((url) => {
    const parsed = parseTelegramUrl(url);
    if (parsed.isValid && !seen.has(parsed.handle)) {
      seen.add(parsed.handle);
      results.push(parsed);
    }
  });

  // Emails
  const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
  emailMatches?.forEach((email) => {
    const parsed = parseEmail(email);
    if (parsed.isValid && !seen.has(parsed.handle)) {
      seen.add(parsed.handle);
      results.push(parsed);
    }
  });

  // Twitter handles (@username)
  const handleMatches = text.match(/@[a-zA-Z0-9_]{1,15}\b/g);
  handleMatches?.forEach((handle) => {
    // Skip if looks like email
    if (handle.includes(".")) return;
    const parsed = parseTwitterUrl(handle);
    if (parsed.isValid && !seen.has(parsed.handle)) {
      seen.add(parsed.handle);
      results.push(parsed);
    }
  });

  return results;
}
