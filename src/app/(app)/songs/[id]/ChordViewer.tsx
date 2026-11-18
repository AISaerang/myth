"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  extractChordLines,
  layoutChordLine,
  stripChords,
  transposeContent,
  transposeRoot,
} from "@/lib/chords";
import { clampTextSize, getStageSections, moveStageSection } from "@/lib/chart-stage";

type ViewMode = "both" | "lyrics" | "chords";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "both", label: "Lirik + Chord" },
  { value: "lyrics", label: "Lirik saja" },
  { value: "chords", label: "Chord saja" },
];

function renderBoth(
  content: string,
  key: string,
  textSize: number,
  stage = false,
  activeSection = -1,
): React.ReactNode {
  // Chord bertumpuk di atas lirik, sejajar kolom suku kata.
  const lines = content.split("\n");
  let sectionIndex = 0;
  return lines.map((line, i) => {
    const { chordLine, lyricLine, label, isEmpty } = layoutChordLine(line);
    const lineKey = `${key}-${i}`;

    if (isEmpty) {
      return <div key={lineKey} className="h-4" />;
    }
    if (label) {
      const currentSection = sectionIndex;
      sectionIndex += 1;
      return (
        <div
          key={lineKey}
          id={stage ? `stage-section-${currentSection}` : undefined}
          className={
            stage
              ? `mt-5 rounded-lg px-3 py-2 text-sm font-bold uppercase tracking-wide first:mt-0 ${
                  activeSection === currentSection
                    ? "bg-sky-600 text-white"
                    : "border border-zinc-500/40 text-zinc-300"
                }`
              : "mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 first:mt-0"
          }
          style={stage ? { fontSize: Math.max(14, textSize - 2) } : undefined}
        >
          {stage ? `${currentSection + 1}. ${label}` : label}
        </div>
      );
    }
    return (
      <div key={lineKey} className="overflow-x-auto overscroll-x-contain">
        <div
          className="w-max whitespace-pre font-mono leading-6"
          style={{ fontSize: textSize, lineHeight: `${Math.round(textSize * 1.55)}px` }}
        >
          {chordLine.trim() ? (
            <div className="font-semibold text-sky-700 dark:text-sky-400">
              {chordLine}
            </div>
          ) : null}
          {lyricLine.trim() ? <div>{lyricLine}</div> : null}
        </div>
      </div>
    );
  });
}

export function ChordViewer({
  content,
  baseKey,
}: {
  content: string;
  baseKey: string;
}) {
  const [offset, setOffset] = useState(0);
  const [useFlats, setUseFlats] = useState(false);
  const [mode, setMode] = useState<ViewMode>("both");
  const [textSize, setTextSize] = useState(14);
  const [stageActive, setStageActive] = useState(false);
  const [stageTheme, setStageTheme] = useState<"dark" | "light">("dark");
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [activeSection, setActiveSection] = useState(0);
  const stageScrollRef = useRef<HTMLDivElement>(null);

  const transposed = useMemo(
    () => transposeContent(content, offset, useFlats),
    [content, offset, useFlats],
  );
  const currentKey = useMemo(
    () => transposeRoot(baseKey, offset, useFlats),
    [baseKey, offset, useFlats],
  );
  const sections = useMemo(() => getStageSections(transposed), [transposed]);

  useEffect(() => {
    const savedSize = Number(window.localStorage.getItem("myth-stage-text-size"));
    if (Number.isFinite(savedSize) && savedSize > 0) {
      const frame = window.requestAnimationFrame(() =>
        setTextSize(clampTextSize(savedSize)),
      );
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("myth-stage-text-size", String(textSize));
  }, [textSize]);

  useEffect(() => {
    if (!stageActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStageActive(false);
      if (event.key === "ArrowDown") {
        setActiveSection((current) => {
          const next = moveStageSection(current, 1, sections.length);
          document
            .getElementById(`stage-section-${next}`)
            ?.scrollIntoView({ block: "start", behavior: "smooth" });
          return next;
        });
      }
      if (event.key === "ArrowUp") {
        setActiveSection((current) => {
          const next = moveStageSection(current, -1, sections.length);
          document
            .getElementById(`stage-section-${next}`)
            ?.scrollIntoView({ block: "start", behavior: "smooth" });
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stageActive, sections.length]);

  useEffect(() => {
    if (!stageActive || !autoScroll) return;
    const timer = window.setInterval(() => {
      const element = stageScrollRef.current;
      if (!element) return;
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 2) {
        setAutoScroll(false);
        return;
      }
      element.scrollBy({ top: scrollSpeed, behavior: "auto" });
    }, 100);
    return () => window.clearInterval(timer);
  }, [stageActive, autoScroll, scrollSpeed, stageScrollRef]);

  const jumpToSection = (index: number) => {
    const next =
      sections.length === 0
        ? 0
        : Math.min(sections.length - 1, Math.max(0, index));
    setActiveSection(next);
    document
      .getElementById(`stage-section-${next}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Nada: {currentKey}</span>
        <span className="text-zinc-500">(basis {baseKey})</span>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Mode tampil">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            aria-pressed={mode === m.value}
            className={`min-h-[44px] rounded-lg px-3 text-sm font-medium ${
              mode === m.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOffset((o) => o - 1)}
          aria-label="Turunkan setengah nada"
        >
          −½
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOffset((o) => o + 1)}
          aria-label="Naikkan setengah nada"
        >
          +½
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setOffset(0);
            setUseFlats(false);
          }}
        >
          Reset ke {baseKey}
        </Button>
        <button
          type="button"
          onClick={() => setUseFlats((f) => !f)}
          aria-pressed={useFlats}
          className="min-h-[44px] rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700"
        >
          {useFlats ? "Mol (♭)" : "Kres (♯)"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setTextSize((size) => clampTextSize(size - 2))}
          aria-label="Perkecil teks"
          disabled={textSize <= 14}
        >
          A−
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setTextSize((size) => clampTextSize(size + 2))}
          aria-label="Perbesar teks"
          disabled={textSize >= 24}
        >
          A+
        </Button>
        <span className="text-xs text-zinc-500">{textSize}px</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setActiveSection(0);
            setStageActive(true);
          }}
        >
          Mode panggung
        </Button>
      </div>
      <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
        {mode === "lyrics" ? (
          <pre
            className="overflow-x-auto whitespace-pre-wrap font-mono leading-7"
            style={{ fontSize: textSize }}
          >
            {stripChords(transposed)}
          </pre>
        ) : mode === "chords" ? (
          <pre
            className="overflow-x-auto whitespace-pre-wrap font-mono leading-7"
            style={{ fontSize: textSize }}
          >
            {extractChordLines(transposed).join("\n")}
          </pre>
        ) : (
          <div>
            {renderBoth(
              transposed,
              `${offset}-${useFlats}`,
              textSize,
              false,
              -1,
            )}
          </div>
        )}
      </div>
      {stageActive ? (
        <div
          className={`fixed inset-0 z-[100] flex flex-col ${
            stageTheme === "dark"
              ? "bg-zinc-950 text-zinc-100"
              : "bg-white text-zinc-950"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Mode panggung"
        >
          <div className="flex min-h-14 flex-wrap items-center gap-2 border-b border-zinc-700/40 px-3 py-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => jumpToSection(moveStageSection(activeSection, -1, sections.length))}
              disabled={sections.length === 0 || activeSection === 0}
            >
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const next = moveStageSection(activeSection, 1, sections.length);
                jumpToSection(next);
              }}
              disabled={
                sections.length === 0 ||
                activeSection >= sections.length - 1
              }
            >
              Berikutnya
            </Button>
            <select
              value={activeSection}
              onChange={(event) => jumpToSection(Number(event.target.value))}
              aria-label="Lompat ke section"
              className="h-11 max-w-[45vw] rounded-lg border border-zinc-500/50 bg-transparent px-2 text-sm"
            >
              {sections.length === 0 ? (
                <option value={0}>Tanpa section</option>
              ) : (
                sections.map((section) => (
                  <option
                    key={`${section.lineIndex}-${section.label}`}
                    value={section.index}
                    className="bg-zinc-900 text-white"
                  >
                    {section.index + 1}. {section.label}
                  </option>
                ))
              )}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTextSize((size) => clampTextSize(size - 2))}
              disabled={textSize <= 14}
            >
              A−
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTextSize((size) => clampTextSize(size + 2))}
              disabled={textSize >= 24}
            >
              A+
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setStageTheme((theme) => (theme === "dark" ? "light" : "dark"))
              }
            >
              {stageTheme === "dark" ? "Terang" : "Gelap"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAutoScroll((enabled) => !enabled)}
              aria-pressed={autoScroll}
            >
              {autoScroll ? "Jeda gulir" : "Gulir otomatis"}
            </Button>
            <label className="flex items-center gap-2 text-xs">
              Kecepatan
              <input
                type="range"
                min={1}
                max={5}
                value={scrollSpeed}
                onChange={(event) => setScrollSpeed(Number(event.target.value))}
                aria-label="Kecepatan auto-scroll"
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setStageActive(false)}
            >
              Keluar
            </Button>
          </div>
          <div
            ref={stageScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8"
          >
            {mode === "lyrics" ? (
              <pre
                className="whitespace-pre-wrap font-mono"
                style={{
                  fontSize: textSize,
                  lineHeight: `${Math.round(textSize * 1.55)}px`,
                }}
              >
                {stripChords(transposed)}
              </pre>
            ) : mode === "chords" ? (
              <pre
                className="whitespace-pre-wrap font-mono"
                style={{
                  fontSize: textSize,
                  lineHeight: `${Math.round(textSize * 1.55)}px`,
                }}
              >
                {extractChordLines(transposed).join("\n")}
              </pre>
            ) : (
              renderBoth(
                transposed,
                `stage-${offset}-${useFlats}`,
                textSize,
                true,
                activeSection,
              )
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
