import { describe, expect, it } from "vitest";
import { displayKey, formatKeyChange, keyOffsetFromC } from "@/lib/key-display";
import { transposeContent } from "@/lib/chords";

describe("key display", () => {
  it("uses C as the chart base and derives the event key", () => {
    expect(keyOffsetFromC("D")).toBe(2);
    expect(displayKey("C", keyOffsetFromC("D"))).toBe("D");
    expect(transposeContent("[C]Haleluya 1 2 3", keyOffsetFromC("D"))).toBe(
      "[D]Haleluya 1 2 3",
    );
  });

  it("displays per-section modulation with sharp or flat spelling", () => {
    expect(formatKeyChange("F", 2)).toBe("F + 2 = G");
    expect(formatKeyChange("F", -2, true)).toBe("F - 2 = Eb");
    expect(formatKeyChange("C", 0)).toBe("C (tanpa modulasi)");
  });

  it("treats a missing song key as C", () => {
    expect(keyOffsetFromC(null)).toBe(0);
    expect(displayKey(undefined, 0)).toBe("C");
  });
});
