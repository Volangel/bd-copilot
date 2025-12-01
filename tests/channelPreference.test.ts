import { describe, expect, it } from "vitest";
import { decideNewChannelPreference } from "../src/lib/contacts/channelPreference";

describe("decideNewChannelPreference", () => {
  it("adopts new channel when none set", () => {
    expect(decideNewChannelPreference(null, "telegram")).toBe("telegram");
  });

  it("keeps existing when set", () => {
    expect(decideNewChannelPreference("email", "telegram")).toBe("email");
  });
});
