import { describe, expect, it } from "vitest";
import {
  generateSessionToken,
  hashSessionToken,
} from "@/lib/session-token";

describe("session tokens", () => {
  it("generates unique 256-bit hex tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("hashes deterministically and never contains the raw token", () => {
    const token = generateSessionToken();
    const first = hashSessionToken(token);
    expect(first).toBe(hashSessionToken(token));
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain(token);
    expect(hashSessionToken(generateSessionToken())).not.toBe(first);
  });
});
