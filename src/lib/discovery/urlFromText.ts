const urlRegex = /https?:\/\/[\w.-]+(?:\.[\w\.-]+)+(?:[\w\-._~:/?#\[\]@!$&'()*+,;=%]*)/gi;

export function extractUrlsFromText(text: string): string[] {
  const matches = text.match(urlRegex) || [];
  const cleaned = matches
    .map((url) => url.trim().replace(/[),.;]+$/, ""))
    .filter((url) => url.length > 0);
  return Array.from(new Set(cleaned));
}
