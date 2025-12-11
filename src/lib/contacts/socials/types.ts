/**
 * Enhanced Social Profile Types
 * Rich metadata for LinkedIn, Twitter, and Telegram contacts
 */

export type SocialPlatform = "linkedin" | "twitter" | "telegram" | "email";

export interface SocialProfileBase {
  platform: SocialPlatform;
  handle: string; // Normalized handle (e.g., @username, /in/username)
  url: string; // Full canonical URL
  verified: boolean; // Whether we could verify the profile exists
  confidence: number; // 0-1 confidence score
  lastChecked?: Date;
}

export interface LinkedInProfile extends SocialProfileBase {
  platform: "linkedin";
  name?: string | null;
  headline?: string | null; // e.g., "CEO at Company"
  company?: string | null;
  location?: string | null;
  connectionDegree?: "1st" | "2nd" | "3rd" | null;
  profilePictureUrl?: string | null;
  about?: string | null;
}

export interface TwitterProfile extends SocialProfileBase {
  platform: "twitter";
  displayName?: string | null;
  bio?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  tweetCount?: number | null;
  isVerified?: boolean; // Blue check
  profilePictureUrl?: string | null;
  headerImageUrl?: string | null;
  joinedDate?: string | null;
  location?: string | null;
  website?: string | null;
}

export interface TelegramProfile extends SocialProfileBase {
  platform: "telegram";
  displayName?: string | null;
  bio?: string | null;
  username?: string | null;
  isBot?: boolean;
  memberCount?: number | null; // If it's a channel/group
  type?: "user" | "channel" | "group" | "bot";
}

export interface EmailProfile extends SocialProfileBase {
  platform: "email";
  emailAddress: string;
  domain: string;
  isBusinessEmail: boolean; // vs personal like gmail
  mxValid?: boolean; // MX record exists
}

export type SocialProfile = LinkedInProfile | TwitterProfile | TelegramProfile | EmailProfile;

export interface EnrichedContact {
  name: string;
  role?: string | null;
  company?: string | null;
  bio?: string | null;
  location?: string | null;
  profilePictureUrl?: string | null;

  // Social profiles with rich data
  linkedin?: LinkedInProfile | null;
  twitter?: TwitterProfile | null;
  telegram?: TelegramProfile | null;
  email?: EmailProfile | null;

  // Cross-platform correlation
  correlationScore: number; // How confident we are these profiles belong to same person
  correlationSignals: string[]; // e.g., ["same name", "linked from website", "same company"]

  // Metadata
  sourceUrl?: string | null;
  enrichedAt: Date;
  enrichmentMethod: "heuristic" | "ai" | "hybrid";
}

export interface SocialEnrichmentOptions {
  /**
   * Whether to fetch additional data from profile pages
   */
  deepFetch?: boolean;

  /**
   * Whether to use AI for extraction (requires paid plan)
   */
  useAI?: boolean;

  /**
   * Whether to attempt cross-platform correlation
   */
  correlate?: boolean;

  /**
   * Maximum time to spend enriching (ms)
   */
  timeout?: number;

  /**
   * Specific platforms to enrich
   */
  platforms?: SocialPlatform[];
}

export interface ParsedSocialUrl {
  platform: SocialPlatform;
  handle: string;
  canonicalUrl: string;
  isValid: boolean;
  rawInput: string;
  normalized: boolean;
}

export interface SocialValidationResult {
  isValid: boolean;
  exists?: boolean;
  error?: string;
  suggestions?: string[];
}
