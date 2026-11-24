import { describe, expect, it } from "vitest";
import {
  generateShareToken,
  hashShareToken,
  isShareTokenShape,
  sanitizeShareCallback,
} from "@/lib/share-token";

const TOKEN = "aBcD1234_aBcD1234_aBcD1234_aBcD1234_aBc";

describe("share token", () => {
  it("generates opaque, uniquely shaped tokens", () => {
    const first = generateShareToken();
    const second = generateShareToken();
    expect(first).not.toBe(second);
    expect(first).toHaveLength(43);
    expect(isShareTokenShape(first)).toBe(true);
    expect(isShareTokenShape("short")).toBe(false);
    expect(isShareTokenShape(`${first}?x=1`)).toBe(false);
  });

  it("stores only a deterministic hash, never the plaintext", () => {
    const token = generateShareToken();
    const hash = hashShareToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashShareToken(token));
    expect(hash).not.toContain(token);
    expect(hash).not.toBe(token);
  });

  it("allows only an exact /e/{token} relative callback", () => {
    expect(sanitizeShareCallback(`/e/${TOKEN}`)).toBe(`/e/${TOKEN}`);
    expect(sanitizeShareCallback(`  /e/${TOKEN}  `)).toBe(`/e/${TOKEN}`);
  });

  it("rejects open redirects, traversal, query/hash and other paths", () => {
    const unsafe = [
      "https://myth-yg.vercel.app/e/token",
      "//evil.example/e/token",
      `/e/${TOKEN}/continue`,
      `/e/${TOKEN}?next=/dashboard`,
      `/e/${TOKEN}#frag`,
      "/e/short",
      "/e/../login",
      `/e\\${TOKEN}`,
      "/login",
      "/event/1",
      "/e/",
      "",
      null,
      123,
    ];
    for (const value of unsafe) {
      expect(sanitizeShareCallback(value)).toBeNull();
    }
  });
});
