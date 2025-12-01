import { load } from "cheerio";

export type ProjectSocials = {
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
  medium?: string;
};

const matchers = {
  twitter: /twitter\.com|x\.com/i,
  telegram: /t\.me|telegram\.me/i,
  discord: /discord\.gg|discord\.com\/invite/i,
  github: /github\.com/i,
  medium: /medium\.com/i,
};

export function fetchMetadata(url: string, html: string): ProjectSocials {
  const $ = load(html);
  const socials: ProjectSocials = {};

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (matchers.twitter.test(href) && !socials.twitter) socials.twitter = href;
    if (matchers.telegram.test(href) && !socials.telegram) socials.telegram = href;
    if (matchers.discord.test(href) && !socials.discord) socials.discord = href;
    if (matchers.github.test(href) && !socials.github) socials.github = href;
    if (matchers.medium.test(href) && !socials.medium) socials.medium = href;
  });

  return socials;
}
