import { describe, expect, it } from "vitest";
import { decideNewChannelPreference, getPreferredChannel } from "../src/lib/contacts/channelPreference";

describe("decideNewChannelPreference", () => {
  it("adopts new channel when none set", () => {
    // Returns serialized format: "channel:count"
    expect(decideNewChannelPreference(null, "telegram")).toBe("telegram:1");
  });

  it("increments count for existing channel", () => {
    // email:1 + telegram -> email:1,telegram:1 (sorted by count desc)
    expect(decideNewChannelPreference("email:1", "telegram")).toBe("email:1,telegram:1");
  });

  it("increments count when same channel used again", () => {
    expect(decideNewChannelPreference("email:1", "email")).toBe("email:2");
  });
});

describe("getPreferredChannel", () => {
  it("returns null when no preference set", () => {
    expect(getPreferredChannel(null)).toBe(null);
  });

  it("returns highest count channel", () => {
    expect(getPreferredChannel("email:3,telegram:1")).toBe("email");
  });
});
