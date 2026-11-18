import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChordViewer } from "@/app/(app)/songs/[id]/ChordViewer";

describe("ChordViewer contextual notes", () => {
  it("renders section annotations on every repeated use of a master section", () => {
    const markup = renderToStaticMarkup(
      createElement(ChordViewer, {
        content: "{Verse}\n[C]Lirik",
        baseKey: "C",
        sections: [
          { id: "verse-id", label: "Verse", content: "[C]Lirik" },
          { id: "verse-id", label: "Verse ulang", content: "[C]Lirik" },
        ],
        getSectionAnnotations: () => ({
          targeted: createElement("div", { "data-test-targeted": "" }, "Drum"),
          general: createElement("aside", { "data-test-general": "" }, "Umum"),
        }),
      }),
    );

    expect(markup.match(/data-chart-section="verse-id"/g)).toHaveLength(2);
    expect(markup.match(/data-test-targeted=""/g)).toHaveLength(2);
    expect(markup.match(/data-test-general=""/g)).toHaveLength(2);
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("lg:grid-cols-[minmax(0,1fr)_16rem]");
  });
});
