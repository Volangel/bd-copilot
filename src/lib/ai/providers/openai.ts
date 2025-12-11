interface OpenAIChatOptions {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  retries?: number;
}

// Status codes that warrant a retry
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Extracts JSON from a string that may be wrapped in markdown code blocks.
 * Handles: ```json ... ```, ``` ... ```, or raw JSON
 */
function extractJsonFromContent(content: string): string {
  // Try to extract from markdown code blocks
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object or array directly
  const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // Return as-is if no patterns matched
  return content.trim();
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
  return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
}

export async function callOpenAIChat<T>(opts: OpenAIChatOptions): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const maxRetries = opts.retries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: opts.model,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 800,
        }),
      });

      // Check for retryable errors
      if (!res.ok) {
        const text = await res.text().catch(() => "");

        // Check if we should retry
        if (RETRYABLE_STATUS_CODES.has(res.status) && attempt < maxRetries) {
          // For rate limits, check for Retry-After header
          const retryAfter = res.headers.get("Retry-After");
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : getBackoffDelay(attempt);

          console.warn(`[OpenAI] Retryable error ${res.status}, attempt ${attempt + 1}/${maxRetries + 1}, waiting ${Math.round(delay)}ms`);
          await sleep(delay);
          continue;
        }

        throw new Error(`OpenAI error: ${res.status} ${text}`);
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("OpenAI: empty content");
      }

      // Extract JSON from potentially markdown-wrapped response
      const jsonContent = extractJsonFromContent(content);

      try {
        return JSON.parse(jsonContent) as T;
      } catch (parseErr) {
        // If parsing fails and we have retries left, try again
        if (attempt < maxRetries) {
          console.warn(`[OpenAI] JSON parse failed, attempt ${attempt + 1}/${maxRetries + 1}: ${(parseErr as Error).message}`);
          await sleep(getBackoffDelay(attempt, 500));
          continue;
        }
        throw new Error(`OpenAI: failed to parse JSON: ${(parseErr as Error).message}. Content: ${jsonContent.slice(0, 200)}`);
      }
    } catch (err) {
      lastError = err as Error;

      // Check if it's a network error that warrants retry
      const isNetworkError = (err as Error).message?.includes("fetch") ||
                            (err as Error).message?.includes("network") ||
                            (err as Error).message?.includes("ECONNRESET");

      if (isNetworkError && attempt < maxRetries) {
        const delay = getBackoffDelay(attempt);
        console.warn(`[OpenAI] Network error, attempt ${attempt + 1}/${maxRetries + 1}, waiting ${Math.round(delay)}ms`);
        await sleep(delay);
        continue;
      }

      // If it's a non-retryable error or we're out of retries, throw
      if (attempt >= maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("OpenAI: unexpected error after retries");
}
