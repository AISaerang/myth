"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { alignChordsToNotation, type NotationAlignment } from "@/lib/jianpu-align";
import { parseJianpu, toJianpuFontText, type JianpuNote } from "@/lib/jianpu";

/**
 * Not angka satu baris dengan kunci di kolom yang sama.
 * Titik oktaf: font JianpuASCII (ligatur, titik di tengah glyph) bila ligatur
 * benar-benar melipat tanda; kalau tidak, titik CSS di tengah angka.
 */
export function NotationLine({
  alignment,
  glyphs = "font",
}: {
  alignment: NotationAlignment;
  /** "css" memaksa titik oktaf CSS (uji fallback). Default memakai glyph font. */
  glyphs?: "font" | "css";
}) {
  const [useCss, setUseCss] = useState(glyphs === "css");
  const markCss = useCallback(() => setUseCss(true), []);
  const notes = alignment.tokens.filter((token) => token.kind === "note");
  const aria = [
    alignment.chords.length > 0
      ? `Kunci ${alignment.chords.map((chord) => chord.token).join(" ")}`
      : "",
    `Not angka ${notes.map((token) => token.raw).join(" ")}`,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div
      className="notation-staff"
      style={{ width: `calc(${alignment.columns} * 1ch)` }}
      data-notation-line=""
      data-columns={alignment.columns}
      data-jianpu-font={useCss ? "fallback" : "ready"}
      role="img"
      aria-label={aria}
    >
      {glyphs === "font" ? <JianpuFontProbe onFallback={markCss} /> : null}
      {alignment.chords.length > 0 ? (
        <div className="notation-chords">
          {alignment.chords.map((chord, index) => (
            <span
              key={`${chord.token}-${chord.renderCol}-${index}`}
              data-chord={chord.token}
              data-render-col={chord.renderCol}
              className="absolute top-0 font-semibold text-sky-700 dark:text-sky-400"
              style={{ left: `calc(${chord.renderCol} * 1ch)` }}
            >
              {chord.token}
            </span>
          ))}
        </div>
      ) : null}
      <div className="notation-notes">
        {alignment.tokens.map((token, index) => (
          <span
            key={`${token.raw}-${token.renderCol}-${index}`}
            data-note={token.raw}
            data-kind={token.kind}
            data-render-col={token.renderCol}
            className="absolute whitespace-pre"
            style={{ left: `calc(${token.renderCol} * 1ch)`, top: useCss ? "0.72em" : "0.15em" }}
          >
            {token.kind === "bar" ? (
              useCss ? (
                "|"
              ) : (
                <span className="notation-glyph-font">|</span>
              )
            ) : useCss && token.note ? (
              <FallbackNote note={token.note} />
            ) : token.note ? (
              <span className="notation-glyph-font">{toJianpuFontText(token.note)}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NotAngka({
  value,
  className = "",
  glyphs = "font",
}: {
  value: string;
  className?: string;
  glyphs?: "font" | "css";
}) {
  const result = parseJianpu(value);
  if (!result.valid) {
    return (
      <span className={`text-xs text-red-600 dark:text-red-400 ${className}`}>
        Notasi tidak valid: {result.error}
      </span>
    );
  }
  if (result.lines.length === 0) return null;

  const lines = value.split(/\n/);
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      {lines.map((line, index) => {
        const aligned = alignChordsToNotation("", line);
        if (!aligned) {
          return line.trim() ? (
            <span key={index} className="font-mono text-sm">
              {line}
            </span>
          ) : (
            <span key={index} className="block h-2" />
          );
        }
        return <NotationLine key={index} alignment={aligned} glyphs={glyphs} />;
      })}
    </span>
  );
}

function FallbackNote({ note }: { note: JianpuNote }) {
  const marks = Math.abs(note.octave);
  const up = note.octave > 0;
  return (
    <>
      <span className="relative inline-block w-[1ch] text-center leading-none">
        {note.accidental !== 0 ? (
          <span className="absolute top-0 right-full pr-px text-[0.65em] leading-none">
            {note.accidental === 1 ? "♯" : "♭"}
          </span>
        ) : null}
        {note.solfege}
        {marks > 0 ? (
          <span
            data-octave={up ? "up" : "down"}
            className={`absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-px ${
              up ? "bottom-full mb-px" : "top-full mt-px"
            }`}
          >
            {Array.from({ length: marks }, (_, index) => (
              <span key={index} className="jianpu-dot" />
            ))}
          </span>
        ) : null}
        {note.duration < 1 ? (
          <span
            data-underline={note.duration === 0.25 ? "2" : "1"}
            className="absolute top-full right-0 left-0 mt-px flex flex-col gap-px"
          >
            <span className="h-px w-full bg-current" />
            {note.duration === 0.25 ? <span className="h-px w-full bg-current" /> : null}
          </span>
        ) : null}
      </span>
      {note.extension > 0 ? "-".repeat(note.extension) : null}
      {note.dotted ? "." : null}
    </>
  );
}

function JianpuFontProbe({ onFallback }: { onFallback: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fonts = document.fonts;
    const node = ref.current;
    if (!fonts || !node) return;
    let cancelled = false;
    fonts
      .load('16px "JianpuASCII"')
      .then(async () => {
        for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          });
          if (cancelled) return;
          const digit = node.querySelector("[data-probe-digit]");
          const ligature = node.querySelector("[data-probe-liga]");
          if (!(digit instanceof HTMLElement) || !(ligature instanceof HTMLElement)) continue;
          const digitWidth = digit.getBoundingClientRect().width;
          const ligatureWidth = ligature.getBoundingClientRect().width;
          // Ligatur 1' selebar angka 1 → titik oktaf ada di tengah glyph.
          if (digitWidth > 0 && ligatureWidth > 0 && ligatureWidth < digitWidth * 1.35) return;
        }
        if (!cancelled) onFallback();
      })
      .catch(() => {
        if (!cancelled) onFallback();
      });
    return () => {
      cancelled = true;
    };
  }, [onFallback]);

  return (
    <span ref={ref} aria-hidden className="pointer-events-none fixed top-0 left-0 -z-10 opacity-0">
      <span data-probe-digit className="notation-glyph-font">
        1
      </span>
      <span data-probe-liga className="notation-glyph-font">
        {"1'"}
      </span>
    </span>
  );
}
