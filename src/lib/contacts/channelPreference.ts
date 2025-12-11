// Channel weights for preference learning
const CHANNEL_WEIGHTS: Record<string, number> = {
  email: 1,
  linkedin: 1,
  twitter: 1,
  telegram: 1,
};

/**
 * Parses channel preference data from stored string format.
 * Format: "channel:count,channel:count" or legacy "channel" format
 */
export function parseChannelPreference(stored: string | null): Record<string, number> {
  if (!stored) return {};

  // Handle legacy format (just channel name)
  if (!stored.includes(":")) {
    return { [stored]: 1 };
  }

  const result: Record<string, number> = {};
  stored.split(",").forEach((part) => {
    const [channel, countStr] = part.split(":");
    if (channel && countStr) {
      const count = parseInt(countStr, 10);
      if (!isNaN(count) && count > 0) {
        result[channel.trim()] = count;
      }
    }
  });
  return result;
}

/**
 * Serializes channel preference data to stored string format.
 */
export function serializeChannelPreference(data: Record<string, number>): string {
  return Object.entries(data)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([channel, count]) => `${channel}:${count}`)
    .join(",");
}

/**
 * Determines the preferred channel based on usage history.
 * Returns the channel with the highest weighted usage count.
 */
export function getPreferredChannel(stored: string | null): string | null {
  const data = parseChannelPreference(stored);
  if (Object.keys(data).length === 0) return null;

  let best: string | null = null;
  let bestScore = 0;

  Object.entries(data).forEach(([channel, count]) => {
    const weight = CHANNEL_WEIGHTS[channel] || 1;
    const score = count * weight;
    if (score > bestScore) {
      bestScore = score;
      best = channel;
    }
  });

  return best;
}

/**
 * Updates channel preference based on a successful interaction.
 * Tracks usage counts to learn which channels work best for this contact.
 */
export function decideNewChannelPreference(current: string | null, justSentChannel: string): string {
  const data = parseChannelPreference(current);

  // Increment the count for the channel just used
  data[justSentChannel] = (data[justSentChannel] || 0) + 1;

  return serializeChannelPreference(data);
}
