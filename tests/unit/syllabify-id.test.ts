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

  it("keeps one consonant between vowels as the next syllable onset", () => {
    expect(syllabifyId("Bapa")).toEqual(["Ba", "pa"]);
    expect(syllabifyId("Yesu")).toEqual(["Ye", "su"]);
    expect(syllabifyId("Tuhan")).toEqual(["Tu", "han"]);
    expect(syllabifyId("bersyukur")).toEqual(["ber", "syu", "kur"]);
    expect(syllabifyId("memuji")).toEqual(["me", "mu", "ji"]);
    expect(syllabifyId("benar")).toEqual(["be", "nar"]);
  });

  it("treats ng/ny/kh/sy as an onset when they stand alone between vowels", () => {
    expect(syllabifyId("dengan")).toEqual(["de", "ngan"]);
    expect(syllabifyId("jangan")).toEqual(["ja", "ngan"]);
    expect(syllabifyId("bangun")).toEqual(["ba", "ngun"]);
    expect(syllabifyId("akhir")).toEqual(["a", "khir"]);
    expect(syllabifyId("asyik")).toEqual(["a", "syik"]);
    expect(syllabifyId("tunggu")).toEqual(["tung", "gu"]);
    expect(syllabifyId("bangsa")).toEqual(["bang", "sa"]);
  });
});
