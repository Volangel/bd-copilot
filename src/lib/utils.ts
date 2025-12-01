export const PROJECT_STATUSES = [
  "NOT_CONTACTED",
  "CONTACTED",
  "WAITING_REPLY",
  "CALL_BOOKED",
  "WON",
  "LOST",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString();
}
