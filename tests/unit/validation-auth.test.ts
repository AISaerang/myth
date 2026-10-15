import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
} from "@/lib/validation/auth";

describe("auth validation", () => {
  it("normalizes login usernames", () => {
    const parsed = loginSchema.safeParse({
      username: "  AISaerang ",
      password: "rahasia",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.username).toBe("aisaerang");
  });

  it("rejects usernames with illegal characters", () => {
    const parsed = loginSchema.safeParse({
      username: "ada spasi!",
      password: "rahasia",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires matching, different, non-empty new passwords (TEMPORARY: no minimum length during onboarding)", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "lama-sementara-1",
        newPassword: "baru-yang-kuat-123",
        confirmPassword: "beda-1234567890",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "sama-sama-123456",
        newPassword: "sama-sama-123456",
        confirmPassword: "sama-sama-123456",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "lama-sementara-1",
        newPassword: "",
        confirmPassword: "",
      }).success,
    ).toBe(false);
    const ok = changePasswordSchema.safeParse({
      currentPassword: "lama-sementara-1",
      newPassword: "pendek",
      confirmPassword: "pendek",
    });
    expect(ok.success).toBe(true);
  });

  it("restricts new account roles to ADMIN|USER|OBSERVER", () => {
    expect(
      createUserSchema.safeParse({
        username: "pemain1",
        displayName: "Pemain 1",
        role: "PANITIA",
      }).success,
    ).toBe(false);
    const ok = createUserSchema.safeParse({
      username: "Pemain1",
      displayName: "Pemain 1",
      role: "USER",
    });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.username).toBe("pemain1");
  });

  it("accepts OBSERVER as a read-only monitor role", () => {
    const ok = createUserSchema.safeParse({
      username: "axcellent",
      displayName: "Axcellent",
      role: "OBSERVER",
    });
    expect(ok.success).toBe(true);
  });
});
