import { afterEach, describe, expect, it } from "vitest";
import { defaultTempPassword } from "@/lib/default-temp-password";
import { FALLBACK_TEMP_PASSWORD } from "@/lib/password-policy";

const KEY = "DEFAULT_TEMP_PASSWORD";

describe("defaultTempPassword", () => {
  const previous = process.env[KEY];

  afterEach(() => {
    if (previous === undefined) delete process.env[KEY];
    else process.env[KEY] = previous;
  });

  it("falls back when the variable is missing or empty", () => {
    delete process.env[KEY];
    expect(defaultTempPassword()).toBe(FALLBACK_TEMP_PASSWORD);
    process.env[KEY] = "";
    expect(defaultTempPassword()).toBe(FALLBACK_TEMP_PASSWORD);
  });

  it("uses a configured password within the length policy", () => {
    process.env[KEY] = "rahasia-sementara";
    expect(defaultTempPassword()).toBe("rahasia-sementara");
  });

  it("falls back when the configured password is longer than 256 characters", () => {
    process.env[KEY] = "x".repeat(257);
    expect(defaultTempPassword()).toBe(FALLBACK_TEMP_PASSWORD);
  });
});
