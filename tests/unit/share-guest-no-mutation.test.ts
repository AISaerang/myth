import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieValue = { current: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "mth_session" && cookieValue.current
        ? { name, value: cookieValue.current }
        : undefined,
  }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@server/services/session-service", () => ({
  findSessionUser: vi.fn(async () => null),
}));

import { requireActionUser } from "@/lib/auth";

describe("guest mutation guard", () => {
  beforeEach(() => {
    cookieValue.current = undefined;
  });

  it("rejects server actions when only a guest cookie is present", async () => {
    // A guest carries myth_share_guest, never mth_session. requireActionUser
    // is the shared guard for every mutation action, so no guest can mutate.
    await expect(requireActionUser()).rejects.toThrow("Unauthorized");
  });
});
