import { describe, expect, it } from "vitest";
import { buildContactDedupWhere } from "../src/lib/contacts/dedupe";

describe("buildContactDedupWhere", () => {
  it("returns null when no handles provided", () => {
    expect(buildContactDedupWhere("pid", {})).toBeNull();
  });

  it("dedupes by email only", () => {
    const where = buildContactDedupWhere("pid", { email: "a@b.com" });
    expect(where).toEqual({
      projectId: "pid",
      OR: [{ email: "a@b.com" }],
    });
  });

  it("dedupes by any handle", () => {
    const where = buildContactDedupWhere("pid", { linkedinUrl: "https://linkedin.com/in/test", twitterHandle: "@tw" });
    expect(where).toEqual({
      projectId: "pid",
      OR: [{ linkedinUrl: "https://linkedin.com/in/test" }, { twitterHandle: "@tw" }],
    });
  });
});
