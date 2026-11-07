import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  optionalAdminPassword,
  passwordSchema,
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

  it("requires matching, different, non-empty new passwords (minimum 1 character)", () => {
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
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "x",
        newPassword: "y",
        confirmPassword: "y",
      }).success,
    ).toBe(true);
    expect(passwordSchema.safeParse("").success).toBe(false);
    expect(passwordSchema.safeParse("a").success).toBe(true);
    expect(passwordSchema.safeParse("1234567890ais").success).toBe(true);
    expect(passwordSchema.safeParse("x".repeat(257)).success).toBe(false);
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

  it("accepts an explicit admin password and treats a blank field as generate", () => {
    const explicit = createUserSchema.safeParse({
      username: "pemain2",
      displayName: "Pemain 2",
      role: "USER",
      password: "1234567890ais",
    });
    expect(explicit.success).toBe(true);
    if (explicit.success) expect(explicit.data.password).toBe("1234567890ais");

    const oneChar = createUserSchema.safeParse({
      username: "pemain3",
      displayName: "Pemain 3",
      role: "USER",
      password: "1",
    });
    expect(oneChar.success).toBe(true);

    const generated = createUserSchema.safeParse({
      username: "pemain4",
      displayName: "Pemain 4",
      role: "USER",
      password: optionalAdminPassword(""),
    });
    expect(generated.success).toBe(true);
    if (generated.success) expect(generated.data.password).toBeUndefined();

    expect(optionalAdminPassword(null)).toBeUndefined();
    expect(optionalAdminPassword("1234567890ais")).toBe("1234567890ais");
    expect(
      createUserSchema.safeParse({
        username: "pemain5",
        displayName: "Pemain 5",
        role: "USER",
        password: "",
      }).success,
    ).toBe(false);
    expect(
      createUserSchema.safeParse({
        username: "pemain6",
        displayName: "Pemain 6",
        role: "USER",
        password: "x".repeat(257),
      }).success,
    ).toBe(false);
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
