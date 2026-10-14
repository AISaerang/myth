import { describe, expect, it } from "vitest";
import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from "@/lib/password";

describe("password hashing (argon2id)", () => {
  it("verifies a correct password", () => {
    return hashPassword("password-sementara-kuat-123")
      .then((hash) => {
        expect(hash).not.toContain("password-sementara-kuat-123");
        return verifyPassword(hash, "password-sementara-kuat-123");
      })
      .then((ok) => expect(ok).toBe(true));
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("password-yang-benar-123");
    await expect(verifyPassword(hash, "password-yang-salah-123")).resolves.toBe(
      false,
    );
  });

  it("treats a malformed hash as mismatch, never throws", async () => {
    await expect(
      verifyPassword("bukan-hash-valid", "apapun-12345678"),
    ).resolves.toBe(false);
  });
});

describe("generateTemporaryPassword", () => {
  it("generates 20-char passwords from the unambiguous alphabet", () => {
    const first = generateTemporaryPassword();
    const second = generateTemporaryPassword();
    expect(first).toHaveLength(20);
    expect(first).toMatch(/^[A-HJ-NP-Za-km-z2-9!@#%_-]+$/);
    expect(first).not.toBe(second);
  });
});
