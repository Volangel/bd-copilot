export interface RepresentingProjectConfig {
  name: string;
  website?: string | null;
  oneLiner?: string | null;
  productCategory?: string | null;
  primaryValueProp?: string | null;
  idealCustomer?: string | null;
  keyDifferentiators?: string | null;
  toneGuidelines?: string | null;
  referenceAccounts?: string[] | null;
}

export function parseRepresentingProjectConfig(json: unknown): RepresentingProjectConfig | null {
  if (!json) return null;
  let data: unknown = json;
  if (typeof json === "string") {
    try {
      data = JSON.parse(json);
    } catch {
      return null;
    }
  }
  if (typeof data !== "object" || data === null) return null;

  const obj = data as Record<string, unknown>;
  const name = String(obj.name ?? "").trim();
  if (!name) return null;

  return {
    name,
    website: obj.website ? String(obj.website) : null,
    oneLiner: obj.oneLiner ? String(obj.oneLiner) : null,
    productCategory: obj.productCategory ? String(obj.productCategory) : null,
    primaryValueProp: obj.primaryValueProp ? String(obj.primaryValueProp) : null,
    idealCustomer: obj.idealCustomer ? String(obj.idealCustomer) : null,
    keyDifferentiators: obj.keyDifferentiators ? String(obj.keyDifferentiators) : null,
    toneGuidelines: obj.toneGuidelines ? String(obj.toneGuidelines) : null,
    referenceAccounts: Array.isArray(obj.referenceAccounts)
      ? (obj.referenceAccounts as unknown[])
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter((v) => v.length > 0)
      : null,
  };
}
