import { describe, expect, it } from "vitest";
import { medleyTransitionSchema } from "@/lib/validation/medley";

describe("medleyTransitionSchema", () => {
  const base = {
    batchId: "batch-1",
    fromSongId: "song-1",
    toSongId: "song-2",
    content: "[C]tahan 2 bar\n.6 5 1",
  };

  it("accepts a transition and preserves valid lower-octave notation", () => {
    const parsed = medleyTransitionSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.content).toContain(".6 5 1");
  });

  it("rejects identical songs and empty transition content", () => {
    expect(
      medleyTransitionSchema.safeParse({
        ...base,
        toSongId: base.fromSongId,
      }).success,
    ).toBe(false);
    expect(
      medleyTransitionSchema.safeParse({ ...base, content: " " }).success,
    ).toBe(false);
  });

  it("rejects malformed not-angka lines", () => {
    expect(
      medleyTransitionSchema.safeParse({ ...base, content: "[5 6" }).success,
    ).toBe(false);
  });
});
