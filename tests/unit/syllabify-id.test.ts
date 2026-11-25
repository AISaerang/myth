import { describe, expect, it } from "vitest";
import { syllabifyId } from "@/lib/syllabify-id";

describe("Indonesian syllable splitting", () => {
  it("handles consonant clusters, hiatus and user hyphen", () => {
    expect(syllabifyId("Sungguh")).toEqual(["Sung", "guh"]);
    expect(syllabifyId("inginkah")).toEqual(["i", "ngin", "kah"]);
    expect(syllabifyId("engkau")).toEqual(["eng", "kau"]);
    expect(syllabifyId("saatnya")).toEqual(["sa", "at", "nya"]);
    expect(syllabifyId("sampai")).toEqual(["sam", "pai"]);
    expect(syllabifyId("kasih-Nya")).toEqual(["ka", "sih", "Nya"]);
    expect(syllabifyId("Sung-guh")).toEqual(["Sung", "guh"]);
  });
});
