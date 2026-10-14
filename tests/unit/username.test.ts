import { describe, expect, it } from "vitest";
import { normalizeUsername } from "@/lib/username";

describe("normalizeUsername", () => {
  it("lowercases usernames", () => {
    expect(normalizeUsername("AISaerang")).toBe("aisaerang");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeUsername("  md-team  ")).toBe("md-team");
  });

  it("treats case variants as the same identity", () => {
    expect(normalizeUsername("Admin")).toBe(normalizeUsername("ADMIN"));
  });

  it("leaves already-normalized names untouched", () => {
    expect(normalizeUsername("vokal1")).toBe("vokal1");
  });
});
