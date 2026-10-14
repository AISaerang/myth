import { describe, expect, it } from "vitest";
import {
  INVITE_TTL_MS,
  generateInviteToken,
  hashInviteToken,
} from "@/lib/invite-token";

describe("invite tokens", () => {
  it("lasts 7 days", () => {
    expect(INVITE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("generates unique URL-safe 256-bit tokens", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    // 32 bytes -> 43 base64url chars, safe to embed in /masuk/[token].
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hashes deterministically and never contains the raw token", () => {
    const token = generateInviteToken();
    const first = hashInviteToken(token);
    expect(first).toBe(hashInviteToken(token));
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain(token);
    expect(hashInviteToken(generateInviteToken())).not.toBe(first);
  });
});
