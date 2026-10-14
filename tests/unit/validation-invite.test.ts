import { describe, expect, it } from "vitest";
import { generateInviteToken } from "@/lib/invite-token";
import { inviteTokenSchema } from "@/lib/validation/auth";

describe("invite token validation", () => {
  it("accepts freshly generated tokens", () => {
    expect(inviteTokenSchema.safeParse(generateInviteToken()).success).toBe(
      true,
    );
  });

  it("rejects empty, short, long, or mistyped tokens", () => {
    expect(inviteTokenSchema.safeParse("").success).toBe(false);
    expect(inviteTokenSchema.safeParse("terlalu-pendek").success).toBe(false);
    expect(
      inviteTokenSchema.safeParse("a".repeat(129)).success,
    ).toBe(false);
    expect(
      inviteTokenSchema.safeParse(
        "ada+karakter/tidak+valid-dalam-token-1234567890",
      ).success,
    ).toBe(false);
    expect(inviteTokenSchema.safeParse(123).success).toBe(false);
  });
});
