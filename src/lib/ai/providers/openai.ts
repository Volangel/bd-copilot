interface OpenAIChatOptions {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callOpenAIChat<T>(opts: OpenAIChatOptions): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

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

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenAI: empty content");
  }

  try {
    return JSON.parse(content) as T;
  } catch (err) {
    throw new Error("OpenAI: failed to parse JSON: " + (err as Error).message);
  }
}
