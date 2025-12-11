/**
 * Social Profile Module
 * Enhanced contact enrichment for LinkedIn, Twitter, and Telegram
 */

// Types
export type {
  SocialPlatform,
  SocialProfileBase,
  LinkedInProfile,
  TwitterProfile,
  TelegramProfile,
  EmailProfile,
  SocialProfile,
  EnrichedContact,
  SocialEnrichmentOptions,
  ParsedSocialUrl,
  SocialValidationResult,
} from "./types";

// Parsers
export {
  parseLinkedInUrl,
  parseTwitterUrl,
  parseTelegramUrl,
  parseEmail,
  detectPlatform,
  parseSocialInput,
  normalizeSocialHandle,
  extractSocialProfilesFromText,
} from "./parsers";

// Enrichment
export {
  enrichLinkedInProfile,
  enrichTwitterProfile,
  enrichTelegramProfile,
  enrichEmailProfile,
  enrichSocialProfile,
  enrichContactFromUrl,
  enrichContactWithAI,
} from "./enrichment";

// Validation
export {
  validateLinkedInFormat,
  validateTwitterFormat,
  validateTelegramFormat,
  validateEmailFormat,
  validateSocialFormat,
  analyzeCorrelation,
  validateMultipleSocials,
} from "./validation";
export type { CorrelationResult, BulkValidationResult } from "./validation";
