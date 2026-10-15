import { describe, expect, it } from "vitest";
import {
  buildDirectMessage,
  buildGroupMessage,
  resolveBroadcastVariant,
} from "@/lib/broadcast-messages";

describe("broadcast variants", () => {
  it("resolves singer for Vokal, band for instruments, coordinator otherwise", () => {
    expect(resolveBroadcastVariant(["Vokal"])).toBe("singer");
    expect(resolveBroadcastVariant(["Guitar Lead", "Bass"])).toBe("band");
    expect(resolveBroadcastVariant(["Rebana"])).toBe("coordinator");
    expect(resolveBroadcastVariant([])).toBe("coordinator");
  });
});

describe("group message", () => {
  it("contains the app URL and invite instructions", () => {
    const msg = buildGroupMessage("https://myth-yg.vercel.app");
    expect(msg).toContain("https://myth-yg.vercel.app");
    expect(msg).toContain("Music Youth Team Hub");
    expect(msg).toContain("7 hari");
  });
});

describe("direct message", () => {
  const base = {
    displayName: "Nathanael Mewengkang",
    username: "nathanmewengkang",
    appUrl: "https://myth-yg.vercel.app",
    skills: ["Vokal"],
    assignmentCount: 10,
  };

  it("greets by first name and embeds username + placeholders", () => {
    const msg = buildDirectMessage(base);
    expect(msg).toContain("Shalom Nathanael!");
    expect(msg).toContain("nathanmewengkang");
    expect(msg).toContain("[LINK UNDANGAN]");
    expect(msg).toContain("[PASSWORD SEMENTARA]");
    expect(msg).toContain("bagian vokal");
  });

  it("uses the band paragraph for players and coordinator paragraph otherwise", () => {
    expect(
      buildDirectMessage({ ...base, skills: ["Drum"] }),
    ).toContain("sesuai part kamu");
    expect(
      buildDirectMessage({ ...base, skills: ["Rebana"], assignmentCount: 0 }),
    ).toContain("tidak ada assignment");
  });

  it("adds an admin note for ADMIN accounts", () => {
    expect(
      buildDirectMessage({ ...base, skills: ["Keyboard"], isAdmin: true }),
    ).toContain("ADMIN");
  });

  it("uses the observer paragraph for OBSERVER accounts", () => {
    const msg = buildDirectMessage({ ...base, isObserver: true });
    expect(msg).toContain("Pemantau");
    expect(msg).toContain("usulan");
    expect(msg).not.toContain("bagian vokal");
  });
});
