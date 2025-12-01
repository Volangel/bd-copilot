export function decideNewChannelPreference(current: string | null, justSentChannel: string): string {
  if (!current) return justSentChannel;
  return current;
}
