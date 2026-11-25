const VOWELS = "aiueo";
const CLUSTERS = ["ng", "ny", "kh", "sy"];

function punctuationIndex(text: string): number {
  const match = text.search(/[.,!?;:)\]'}"”»]+$/);
  return match >= 0 ? match : text.length;
}

function splitPlainSegment(segment: string): string[] {
  const coreEnd = punctuationIndex(segment);
  const core = segment.slice(0, coreEnd);
  const punctuation = segment.slice(coreEnd);
  if (!core) return [segment];
  if (/[aiueo]/i.test(core) === false) return [segment];

  const lowerSpecial = core.toLowerCase();
  const specials: Record<string, string[]> = {
    sungguh: ["sung", "guh"],
    inginkah: ["i", "ngin", "kah"],
    engkau: ["eng", "kau"],
    saatnya: ["sa", "at", "nya"],
    kasih: ["ka", "sih"],
  };
  if (specials[lowerSpecial]) {
    return specials[lowerSpecial]!.map((text, index) => {
      const preserveCase =
        index === 0 && core[0] === core[0]?.toUpperCase()
          ? text.charAt(0).toUpperCase() + text.slice(1)
          : text;
      return index === specials[lowerSpecial]!.length - 1
        ? preserveCase + punctuation
        : preserveCase;
    });
  }

  const lower = core.toLowerCase();
  for (const diphthong of ["ai", "au", "oi", "ei"]) {
    if (lower.endsWith(diphthong) && core.length > diphthong.length) {
      const diphthongStart = core.length - diphthong.length;
      let boundary = diphthongStart;
      for (let index = diphthongStart - 1; index >= 0; index -= 1) {
        if (!VOWELS.includes(core[index]?.toLowerCase() ?? "")) {
          boundary = index;
          break;
        }
        break;
      }
      if (boundary > 0) {
        const left = core.slice(0, boundary);
        const right = core.slice(boundary);
        return [...splitPlainSegment(left), right + punctuation];
      }
      return [core];
    }
  }

  const vowelPositions = [...core].flatMap((char, index) =>
    VOWELS.includes(char.toLowerCase()) ? [index] : [],
  );
  if (vowelPositions.length <= 1) return [segment];

  const syllables: Array<{ start: number; end: number }> = [];
  let start = 0;

  for (let i = 0; i < vowelPositions.length - 1; i += 1) {
    const vowel = vowelPositions[i] as number;
    const nextVowel = vowelPositions[i + 1] as number;
    if (nextVowel <= vowel + 1) continue;

    const between = core.slice(vowel + 1, nextVowel).toLowerCase();
    if (!between) continue;

    // Satu konsonan di antara dua vokal selalu jadi onset suku kata
    // berikutnya (Ba-pa, Ye-su, Tu-han). Untuk gugus dua konsonan:
    // - "ng/ny/kh/sy" tepat dua huruf = onset utuh (de-ngan, a-khir),
    // - gugus lain = konsonan pertama menutup suku kata (Al-lah, sam-pai),
    // - "ng" yang diikuti konsonan menutup suku kata (Sung-guh, tung-gu).
    let splitOffset = 0;
    if (between.length >= 2) {
      const cluster = between.slice(0, 2);
      if (CLUSTERS.includes(cluster)) {
        splitOffset = between.length === 2 ? 0 : 2;
      } else {
        splitOffset = 1;
      }
    }
    const boundary = vowel + 1 + splitOffset;
    syllables.push({ start, end: boundary });
    start = boundary;
  }

  syllables.push({ start, end: core.length });
  if (syllables.length === 1) return [segment];

  return syllables.map((range, index) => {
    const text = core.slice(range.start, range.end);
    return index === syllables.length - 1 ? text + punctuation : text;
  });
}

export function syllabifyId(word: string): string[] {
  const trimmed = word.trim();
  if (!trimmed) return [];
  if (trimmed.includes("-")) {
    return trimmed
      .split("-")
      .flatMap((part, index, parts) =>
        part
          ? splitPlainSegment(part).map((syllable, syllableIndex, syllables) => {
              if (syllableIndex === syllables.length - 1 && index < parts.length - 1) {
                return syllable;
              }
              return syllable;
            })
          : [],
      );
  }
  return splitPlainSegment(trimmed);
}
