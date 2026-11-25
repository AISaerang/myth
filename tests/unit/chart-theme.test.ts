import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

function themeRule(theme: "light" | "dark") {
  return css.match(
    new RegExp(`\\[data-chart-theme="${theme}"\\]\\s*\\{([^}]*)\\}`),
  )?.[1];
}

describe("chart theme styles", () => {
  it("keeps theme foreground colors off the viewer wrapper", () => {
    for (const theme of ["light", "dark"] as const) {
      expect(themeRule(theme)).toBeDefined();
      expect(themeRule(theme)).not.toMatch(/(?:^|[;\\s])color\\s*:/);
    }
  });

  it("does not override pressed toggle text in dark chart toolbars", () => {
    const toolbarRule = css.match(
      /\[data-chart-theme="dark"\]\s+\.chart-toolbar button,\s*\[data-chart-theme="dark"\]\s+\.chart-toolbar label\s*\{([^}]*)\}/,
    )?.[1];

    expect(toolbarRule).toBeDefined();
    expect(toolbarRule).not.toMatch(/(?:^|[;\\s])color\\s*:/);
  });

  it("lets a stretched lyric cell use only free space for its hyphen", () => {
    const stretchHyphenRule = css.match(
      /\.chart-cell-stretch\s+\.chart-hyphen\s*\{([^}]*)\}/,
    )?.[1];

    expect(stretchHyphenRule).toMatch(/flex:\s*1\s+0\s+0/);
    expect(stretchHyphenRule).toMatch(/width:\s*0/);
    expect(css).toContain(".chart-cell-gap > .chart-chord-row");
    expect(css).not.toContain(".chart-couplet .chart-cell-chord");
  });
});
