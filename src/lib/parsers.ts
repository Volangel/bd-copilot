export function parseJsonString<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Failed to parse JSON string", error);
    return fallback;
  }
}

export function serializeJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error("Failed to serialize JSON", error);
    return null;
  }
}
