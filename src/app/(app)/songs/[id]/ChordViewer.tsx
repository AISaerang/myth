"use client";

import { Component, type ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { KeyTransposeBar } from "@/components/KeyTransposeBar";
import { NotationLine } from "@/components/NotAngka";
import { NotationSymbolGuide } from "@/components/NotationSymbolGuide";
import { Badge } from "@/components/ui/Badge";
import {
  extractChordLines,
  isChordToken,
  layoutChordLine,
  listChords,
  transposeChord,
  transposeContent,
  transposeRoot,
} from "@/lib/chords";
import {
  formatKeyChange,
  keyOffsetFromC,
  sectionOffsets,
} from "@/lib/key-display";
import { displaySectionLabel } from "@/lib/chart-arrangement";
import {
  InstrumentPovBar,
  type CapoMode,
  type InstrumentPov,
} from "@/components/InstrumentPovBar";
import { GuitarChordDiagram } from "@/components/GuitarChordDiagram";
import { PianoVoicing } from "@/components/PianoVoicing";
import {
  resolveInstrumentVoicing,
  type ResolvedInstrumentVoicing,
} from "@/lib/instrument-voicings";
import type { InstrumentChartData } from "@/lib/validation/instrument-chart";
import {
  alignChordsToNotation,
  contentHasNotation,
  formatTransposeFormula,
  notationLineError,
} from "@/lib/jianpu-align";
import { clampTextSize, getStageSections, moveStageSection } from "@/lib/chart-stage";

type ViewMode = "both" | "lyrics" | "chords";

class SafeVoicingBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {}

  render() {
    return this.state.failed ? (
      <span className="px-2 py-4 text-zinc-500">Voicing belum ada</span>
    ) : (
      this.props.children
    );
  }
}
type ChartViewPreferences = {
  offset: number;
  setOffset: (value: number) => void;
  resetToC: boolean;
  setResetToC: (value: boolean) => void;
  useFlats: boolean;
  setUseFlats: (value: boolean) => void;
  mode: ViewMode;
  setMode: (value: ViewMode) => void;
  instrumentPov: InstrumentPov;
  setInstrumentPov: (value: InstrumentPov) => void;
};

const ChartViewPreferencesContext =
  createContext<ChartViewPreferences | null>(null);

export function ChartViewPreferenceProvider({
  preferenceKey,
  children,
}: {
  preferenceKey: string;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [resetToC, setResetToC] = useState(false);
  const [useFlats, setUseFlats] = useState(false);
  const [mode, setMode] = useState<ViewMode>("both");
  const [instrumentPov, setInstrumentPov] = useState<InstrumentPov>("chart");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  useEffect(() => {
    let savedOffset = 0;
    let savedResetToC = false;
    let savedFlats = false;
    let savedMode: ViewMode = "both";
    let savedInstrumentPov: InstrumentPov = "chart";
    try {
      const saved = window.localStorage.getItem(preferenceKey);
      if (saved) {
        const value: unknown = JSON.parse(saved);
        if (typeof value === "object" && value !== null) {
          const prefs = value as Record<string, unknown>;
          if (typeof prefs.resetToC === "boolean") {
            savedResetToC = prefs.resetToC;
          }
          if (
            typeof (prefs.viewerOffset ?? prefs.offset) === "number" &&
            Number.isInteger(prefs.viewerOffset ?? prefs.offset) &&
            Math.abs(Number(prefs.viewerOffset ?? prefs.offset)) <= 24
          ) {
            savedOffset = Number(prefs.viewerOffset ?? prefs.offset);
          }
          if (typeof (prefs.flatsOverride ?? prefs.useFlats) === "boolean") {
            savedFlats = Boolean(prefs.flatsOverride ?? prefs.useFlats);
          }
          if (
            prefs.mode === "both" ||
            prefs.mode === "lyrics" ||
            prefs.mode === "chords"
          ) {
            savedMode = prefs.mode;
          }
          if (
            prefs.instrumentPov === "chart" ||
            prefs.instrumentPov === "guitar" ||
            prefs.instrumentPov === "piano"
          ) {
            savedInstrumentPov = prefs.instrumentPov;
          }
        }
      }
    } catch (error) {
      console.warn("Preferensi tampilan chart tidak dapat dibaca.", error);
    }
    const timer = window.setTimeout(() => {
      setOffset(savedOffset);
      setResetToC(savedResetToC);
      setUseFlats(savedFlats);
      setMode(savedMode);
      setInstrumentPov(savedInstrumentPov);
      setPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [preferenceKey]);
  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      window.localStorage.setItem(
        preferenceKey,
        JSON.stringify({
          resetToC,
          viewerOffset: offset,
          flatsOverride: useFlats,
          instrumentPov,
          mode,
        }),
      );
    } catch (error) {
      console.warn("Preferensi tampilan chart tidak dapat disimpan.", error);
    }
  }, [
    preferenceKey,
    offset,
    resetToC,
    useFlats,
    mode,
    instrumentPov,
    preferencesLoaded,
  ]);
  return (
    <ChartViewPreferencesContext.Provider
      value={{
        offset,
        setOffset,
        resetToC,
        setResetToC,
        useFlats,
        setUseFlats,
        mode,
        setMode,
        instrumentPov,
        setInstrumentPov,
      }}
    >
      {children}
    </ChartViewPreferencesContext.Provider>
  );
}

export function useChartViewPreferences(): ChartViewPreferences {
  const preferences = useContext(ChartViewPreferencesContext);
  if (!preferences) {
    throw new Error("useChartViewPreferences must be used within its provider.");
  }
  return preferences;
}

export interface ChartDisplaySection {
  id: string;
  label: string;
  content: string;
  modulationSemitones?: number;
  baseKey?: string;
  songId?: string;
}

export interface SectionNoteAnnotations {
  targeted: ReactNode;
  general: ReactNode;
}

const MODES: { value: ViewMode; label: string }[] = [
  { value: "both", label: "Lirik + Chord" },
  { value: "lyrics", label: "Lirik saja" },
  { value: "chords", label: "Chord saja" },
];

// Baris komentar ChordPro (`# ...`), dipakai catatan intro yang sudah
// menjadi bagian chart. Bukan label bagian dan bukan not angka.
function chartComment(line: string): string | null {
  if (/[\[{]/.test(line)) return null;
  const match = /^\s*#(.*)$/.exec(line);
  if (!match) return null;
  return (match[1] ?? "").trim();
}

function sectionLabelAt(lines: string[], index: number): string | null {
  const layout = layoutChordLine(lines[index] ?? "");
  if (!layout.label) return null;
  const body: string[] = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (layoutChordLine(lines[cursor] ?? "").label) break;
    body.push(lines[cursor] ?? "");
  }
  return displaySectionLabel(layout.label, { content: body.join("\n") });
}

function renderChordTokens(
  line: string,
  onChordClick?: (symbol: string) => void,
): ReactNode[] {
  const children: ReactNode[] = [];
  const tokenRegex = /\S+/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(line)) !== null) {
    const token = match[0] as string;
    if (match.index > cursor) {
      children.push(line.slice(cursor, match.index));
    }
    let isChord = false;
    isChord = isChordToken(token);
    if (onChordClick && isChord) {
      children.push(
        <button
          key={`${match.index}-${token}`}
          type="button"
          className="min-h-[44px] min-w-[44px] font-semibold text-sky-700 underline decoration-dotted underline-offset-2 dark:text-sky-400"
          aria-label={`Tampilkan voicing ${token}`}
          onClick={() => onChordClick(token)}
        >
          {token}
        </button>,
      );
    } else {
      children.push(token);
    }
    cursor = match.index + token.length;
  }
  if (cursor < line.length) children.push(line.slice(cursor));
  return children;
}

function renderChart(
  content: string,
  mode: ViewMode,
  key: string,
  onChordClick?: (symbol: string) => void,
) {
  const lines = content.split("\n");
  return lines.map((line, index) => {
    const lineKey = `${key}-${index}`;
    const comment = chartComment(line);
    if (comment !== null) {
      if (!comment) return <div key={lineKey} className="h-2" />;
      return (
        <p
          key={lineKey}
          data-chart-comment=""
          className="text-sm text-zinc-600 dark:text-zinc-400"
        >
          {comment}
        </p>
      );
    }

    const shownLabel = sectionLabelAt(lines, index);
    if (mode === "chords") {
      if (shownLabel) {
        return (
          <pre
            key={lineKey}
            data-section-label={shownLabel}
            className="font-mono text-sm leading-7 whitespace-pre-wrap"
          >
            {`— ${shownLabel} —`}
          </pre>
        );
      }
      const extracted = extractChordLines(line)[0] ?? "";
      if (!extracted.trim()) return <div key={lineKey} className="h-2" />;
      return (
        <pre
          key={lineKey}
          className="font-mono text-sm leading-7 whitespace-pre-wrap"
        >
          {renderChordTokens(extracted, onChordClick)}
        </pre>
      );
    }

    const { chordLine, lyricLine, label, isEmpty } = layoutChordLine(line);
    if (isEmpty) return <div key={lineKey} className="h-4" />;
    if (label) {
      const shown = shownLabel ?? label;
      return (
        <div
          key={lineKey}
          data-section-label={shown}
          className={`mt-3 text-xs font-semibold tracking-wide text-zinc-500 first:mt-0 ${
            shown === "Intro" ? "normal-case" : "uppercase"
          }`}
        >
          {shown}
        </div>
      );
    }

    const aligned = alignChordsToNotation(
      mode === "lyrics" ? "" : chordLine,
      lyricLine,
    );
    if (aligned) {
      return (
        <div key={lineKey} className="max-w-full">
          <NotationLine alignment={aligned} onChordClick={onChordClick} />
        </div>
      );
    }

    if (mode === "lyrics") {
      return (
        <pre
          key={lineKey}
          className="font-mono text-sm leading-7 whitespace-pre-wrap"
        >
          {lyricLine.trimEnd()}
        </pre>
      );
    }

    // Baris "kelihatan not angka" tapi gagal align: jangan diam-diam mentah —
    // tampilkan alasan parser supaya MD tahu chart-nya perlu dirapikan.
    const notationError = notationLineError(lyricLine);
    if (notationError || looksLikeNoteLine(lyricLine)) {
      return (
        <div key={lineKey} className="min-w-0 max-w-full">
          <div className="w-max font-mono text-sm leading-6 whitespace-pre">
            {chordLine.trim() ? (
              <div className="font-semibold text-sky-700 dark:text-sky-400">
                {renderChordTokens(chordLine, onChordClick)}
              </div>
            ) : null}
            {lyricLine.trim() ? <div>{lyricLine}</div> : null}
          </div>
          <p
            data-notation-error=""
            className="mt-1 text-xs text-red-600 dark:text-red-400"
          >
            Baris ini terlihat seperti not angka tapi gagal dirender
            {notationError ? `: ${notationError}` : ", periksa pola nada 0–7."}
          </p>        </div>
      );
    }

    return (
      <div key={lineKey} className="min-w-0 max-w-full">
        <div className="w-max font-mono text-sm leading-6 whitespace-pre">
          {chordLine.trim() ? (
            <div className="font-semibold text-sky-700 dark:text-sky-400">
              {renderChordTokens(chordLine, onChordClick)}
            </div>
          ) : null}
          {lyricLine.trim() ? <div>{lyricLine}</div> : null}
        </div>
      </div>
    );
  });
}

// Heuristik lokal "kelihatan notasi": angka 0-7 dengan tanda khas
// `' , . ( ) [ ] # -`. Baris lirik biasa tetap jatuh ke cabang mentah.
const NOTE_LOOK_RE = /^[#b(){}\[\]|.'’,0-9\s-]*$/;

function looksLikeNoteLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /[0-9]/.test(trimmed) && NOTE_LOOK_RE.test(trimmed);
}

/** Isi chart tanpa kontrol transpose, supaya rumus nada tidak diulang per bagian. */
export function ChartBody({
  content,
  mode = "both",
  renderKey,
  onChordClick,
}: {
  content: string;
  mode?: ViewMode;
  renderKey: string;
  onChordClick?: (symbol: string) => void;
}) {
  return <>{renderChart(content, mode, renderKey, onChordClick)}</>;
}

export function ChordViewer({
  content,
  baseKey,
  initialOffset = 0,
  preferenceKey,
  legacyPreferenceKey,
  sections,
  getSectionAnnotations,
  songId,
  defaultCapo = 0,
  instrumentData,
  songPreferenceKey,
  showPovControls,
  showKeyControls,
  showCapoControls,
}: {
  content: string;
  baseKey: string;
  initialOffset?: number;
  preferenceKey?: string;
  legacyPreferenceKey?: string;
  sections?: ChartDisplaySection[];
  getSectionAnnotations?: (
    sectionId: string,
  ) => SectionNoteAnnotations | undefined;
  songId?: string;
  defaultCapo?: number;
  instrumentData?: InstrumentChartData;
  songPreferenceKey?: string;
  showPovControls?: boolean;
  showKeyControls?: boolean;
  showCapoControls?: boolean;
}) {
  const sharedPreferences = useContext(ChartViewPreferencesContext);
  const hasSharedPreferences = Boolean(sharedPreferences);
  const [localOffset, setLocalOffset] = useState(initialOffset);
  const [localResetToC, setLocalResetToC] = useState(false);
  const [localFlats, setLocalFlats] = useState(false);
  const [localMode, setLocalMode] = useState<ViewMode>("both");
  const [localInstrumentPov, setLocalInstrumentPov] =
    useState<InstrumentPov>("chart");
  const [capoOverride, setCapoOverride] = useState<number | null>(null);
  const [localCapoMode, setLocalCapoMode] = useState<CapoMode>(
    defaultCapo > 0 ? "shape" : "sounding",
  );
  const [capoModeExplicit, setCapoModeExplicit] = useState(false);
  const [openVoicing, setOpenVoicing] = useState<{
    chord: string;
    voicing: ResolvedInstrumentVoicing;
  } | null>(null);
  const [localPreferencesLoaded, setLocalPreferencesLoaded] =
    useState(!preferenceKey);
  const [songPreferencesLoaded, setSongPreferencesLoaded] =
    useState(!hasSharedPreferences || !songPreferenceKey);
  const offset = sharedPreferences?.offset ?? localOffset;
  const setOffset = sharedPreferences?.setOffset ?? setLocalOffset;
  const resetToC = sharedPreferences?.resetToC ?? localResetToC;
  const setResetToC = sharedPreferences?.setResetToC ?? setLocalResetToC;
  const useFlats = sharedPreferences?.useFlats ?? localFlats;
  const setUseFlats = sharedPreferences?.setUseFlats ?? setLocalFlats;
  const mode = sharedPreferences?.mode ?? localMode;
  const setMode = sharedPreferences?.setMode ?? setLocalMode;
  const instrumentPov =
    sharedPreferences?.instrumentPov ?? localInstrumentPov;
  const setInstrumentPov =
    sharedPreferences?.setInstrumentPov ?? setLocalInstrumentPov;
  const capo = capoOverride ?? defaultCapo;
  const showPOV = showPovControls ?? Boolean(songId);
  const showKey = showKeyControls ?? Boolean(songId);
  const showCapo = showCapoControls ?? Boolean(songId);
  const [textSize, setTextSize] = useState(14);
  const [stageActive, setStageActive] = useState(false);
  const [stageTheme, setStageTheme] = useState<"dark" | "light">("dark");
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [activeSection, setActiveSection] = useState(0);
  const stageScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!preferenceKey || hasSharedPreferences) return;
    let savedOffset = initialOffset;
    let savedResetToC = false;
    let savedFlats = false;
    let savedMode: ViewMode = "both";
    let savedInstrumentPov: InstrumentPov = "chart";
    let savedCapoOverride: number | null = null;
    let savedCapoMode: CapoMode = defaultCapo > 0 ? "shape" : "sounding";
    let hasSavedCapoMode = false;
    try {
      const saved =
        window.localStorage.getItem(preferenceKey) ??
        (legacyPreferenceKey
          ? window.localStorage.getItem(legacyPreferenceKey)
          : null);
      if (saved) {
        const value: unknown = JSON.parse(saved);
        if (typeof value === "object" && value !== null) {
          const prefs = value as Record<string, unknown>;
          if (typeof prefs.resetToC === "boolean") {
            savedResetToC = prefs.resetToC;
          }
          if (
            typeof (prefs.viewerOffset ?? prefs.offset) === "number" &&
            Number.isInteger(prefs.viewerOffset ?? prefs.offset) &&
            Math.abs(Number(prefs.viewerOffset ?? prefs.offset)) <= 24
          ) {
            savedOffset = Number(prefs.viewerOffset ?? prefs.offset);
          }
          if (typeof (prefs.flatsOverride ?? prefs.useFlats) === "boolean") {
            savedFlats = Boolean(prefs.flatsOverride ?? prefs.useFlats);
          }
          if (
            prefs.mode === "both" ||
            prefs.mode === "lyrics" ||
            prefs.mode === "chords"
          ) {
            savedMode = prefs.mode;
          }
          if (
            prefs.instrumentPov === "chart" ||
            prefs.instrumentPov === "guitar" ||
            prefs.instrumentPov === "piano"
          ) {
            savedInstrumentPov = prefs.instrumentPov;
          }
          if (
            typeof prefs.capoOverride === "number" &&
            Number.isInteger(prefs.capoOverride) &&
            prefs.capoOverride >= 0 &&
            prefs.capoOverride <= 11
          ) {
            savedCapoOverride = prefs.capoOverride;
          }
          if (prefs.capoMode === "shape" || prefs.capoMode === "sounding") {
            savedCapoMode = prefs.capoMode;
            hasSavedCapoMode = true;
          }
        }
      }
    } catch (error) {
      console.warn("Preferensi tampilan chart tidak dapat dibaca.", error);
    }
    const timer = window.setTimeout(() => {
      setLocalOffset(savedOffset);
      setLocalResetToC(savedResetToC);
      setLocalFlats(savedFlats);
      setLocalMode(savedMode);
      setLocalInstrumentPov(savedInstrumentPov);
      setCapoOverride(savedCapoOverride);
      setLocalCapoMode(savedCapoMode);
      setCapoModeExplicit(hasSavedCapoMode);
      setLocalPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    defaultCapo,
    hasSharedPreferences,
    initialOffset,
    legacyPreferenceKey,
    preferenceKey,
  ]);
  useEffect(() => {
    if (!hasSharedPreferences || !songPreferenceKey) return;
    let savedCapoOverride: number | null = null;
    let savedCapoMode: CapoMode = defaultCapo > 0 ? "shape" : "sounding";
    let hasSavedCapoMode = false;
    try {
      const saved =
        window.localStorage.getItem(songPreferenceKey) ??
        (legacyPreferenceKey
          ? window.localStorage.getItem(legacyPreferenceKey)
          : null);
      if (saved) {
        const value: unknown = JSON.parse(saved);
        if (typeof value === "object" && value !== null) {
          const prefs = value as Record<string, unknown>;
          if (
            typeof prefs.capoOverride === "number" &&
            Number.isInteger(prefs.capoOverride) &&
            prefs.capoOverride >= 0 &&
            prefs.capoOverride <= 11
          ) {
            savedCapoOverride = prefs.capoOverride;
          }
          if (prefs.capoMode === "shape" || prefs.capoMode === "sounding") {
            savedCapoMode = prefs.capoMode;
            hasSavedCapoMode = true;
          }
        }
      }
    } catch (error) {
      console.warn("Preferensi capo tidak dapat dibaca.", error);
    }
    const timer = window.setTimeout(() => {
      setCapoOverride(savedCapoOverride);
      setLocalCapoMode(savedCapoMode);
      setCapoModeExplicit(hasSavedCapoMode);
      setSongPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    defaultCapo,
    hasSharedPreferences,
    legacyPreferenceKey,
    songPreferenceKey,
  ]);
  useEffect(() => {
    if (!preferenceKey || hasSharedPreferences || !localPreferencesLoaded) return;
    try {
      window.localStorage.setItem(
        preferenceKey,
        JSON.stringify({
          resetToC,
          viewerOffset: offset,
          flatsOverride: useFlats,
          instrumentPov,
          capoOverride,
          capoMode: localCapoMode,
          mode,
        }),
      );
    } catch (error) {
      console.warn("Preferensi tampilan chart tidak dapat disimpan.", error);
    }
  }, [
    preferenceKey,
    offset,
    resetToC,
    useFlats,
    instrumentPov,
    capoOverride,
    localCapoMode,
    mode,
    hasSharedPreferences,
    localPreferencesLoaded,
  ]);
  useEffect(() => {
    if (!hasSharedPreferences || !songPreferenceKey || !songPreferencesLoaded) {
      return;
    }
    try {
      const saved = window.localStorage.getItem(songPreferenceKey);
      let preferences: Record<string, unknown> = {};
      if (saved) {
        const value: unknown = JSON.parse(saved);
        if (typeof value === "object" && value !== null) {
          preferences = value as Record<string, unknown>;
        }
      }
      window.localStorage.setItem(
        songPreferenceKey,
        JSON.stringify({
          ...preferences,
          capoOverride,
          capoMode: localCapoMode,
        }),
      );
    } catch (error) {
      console.warn("Preferensi capo tidak dapat disimpan.", error);
    }
  }, [
    capoOverride,
    hasSharedPreferences,
    localCapoMode,
    songPreferenceKey,
    songPreferencesLoaded,
  ]);

  useEffect(() => {
    if (!openVoicing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenVoicing(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openVoicing]);

  const displayBaseKey = resetToC ? "C" : baseKey;
  const transposed = useMemo(
    () =>
      transposeContent(
        content,
        keyOffsetFromC(displayBaseKey) + offset,
        useFlats,
      ),
    [content, displayBaseKey, offset, useFlats],
  );
  const currentKey = useMemo(
    () => transposeRoot(displayBaseKey, offset, useFlats),
    [displayBaseKey, offset, useFlats],
  );
  const hasNotation = useMemo(() => contentHasNotation(content), [content]);
  const formula = hasNotation
    ? formatTransposeFormula(displayBaseKey, currentKey)
    : "";
  const offsets = useMemo(
    () => sectionOffsets(sections ?? [], baseKey, offset, resetToC),
    [baseKey, offset, resetToC, sections],
  );
  const stageSections = useMemo(
    () =>
      sections
        ? sections.map((section, index) => ({
            index,
            label: section.label,
            lineIndex: index,
          }))
        : getStageSections(transposed),
    [sections, transposed],
  );
  const effectiveCapoMode = localCapoMode;

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
    const jump = (next: number) => {
      setActiveSection(next);
      document
        .getElementById(`stage-section-${next}`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStageActive(false);
      if (event.key === "ArrowDown") {
        jump(moveStageSection(activeSection, 1, stageSections.length));
      }
      if (event.key === "ArrowUp") {
        jump(moveStageSection(activeSection, -1, stageSections.length));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeSection, stageActive, stageSections.length]);

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
  }, [autoScroll, scrollSpeed, stageActive]);

  function resetViewerToC() {
    setResetToC(true);
    setOffset(0);
    setUseFlats(false);
  }

  function returnToSongKey() {
    setResetToC(false);
    setOffset(0);
  }

  function chooseCapo(value: number) {
    if (value > 0 && !capoModeExplicit) setLocalCapoMode("shape");
    setCapoOverride(value === defaultCapo ? null : value);
  }

  function chooseCapoMode(value: CapoMode) {
    setLocalCapoMode(value);
    setCapoModeExplicit(true);
  }

  function jumpToSection(index: number) {
    const next =
      stageSections.length === 0
        ? 0
        : Math.min(stageSections.length - 1, Math.max(0, index));
    setActiveSection(next);
    document
      .getElementById(`stage-section-${next}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-3">
      {showPOV || showKey || showCapo ? (
        <InstrumentPovBar
          instrumentPov={instrumentPov}
          onInstrumentPov={setInstrumentPov}
          resetToC={resetToC}
          onResetToC={resetViewerToC}
          onReturnToSongKey={returnToSongKey}
          capo={capo}
          defaultCapo={defaultCapo}
          onCapo={chooseCapo}
          capoMode={effectiveCapoMode}
          onCapoMode={chooseCapoMode}
          showPov={false}
          showKeyControls={showKey}
          showCapo={showCapo}
        />
      ) : null}
      <div data-chart-controls="">
        <KeyTransposeBar
          baseKey={displayBaseKey}
          offset={offset}
          useFlats={useFlats}
          formula={formula || undefined}
          onOffset={setOffset}
          onFlats={setUseFlats}
          onReset={resetViewerToC}
          showResetButton={false}
        />
        <div className="mt-2">
          <NotationSymbolGuide compact />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Mode tampil">
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              aria-pressed={mode === item.value}
              className={`min-h-[44px] rounded-lg px-3 text-sm font-medium ${
                mode === item.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {showPOV ? (
          <InstrumentPovBar
            instrumentPov={instrumentPov}
            onInstrumentPov={setInstrumentPov}
            resetToC={resetToC}
            onResetToC={resetViewerToC}
            onReturnToSongKey={returnToSongKey}
            capo={capo}
            defaultCapo={defaultCapo}
            onCapo={chooseCapo}
            capoMode={effectiveCapoMode}
            onCapoMode={chooseCapoMode}
            showKeyControls={false}
            showCapo={false}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="min-h-[44px] rounded-lg border border-zinc-300 px-3 text-sm font-medium dark:border-zinc-700"
          onClick={() => setTextSize((size) => clampTextSize(size - 2))}
          disabled={textSize <= 14}
        >
          A−
        </button>
        <button
          type="button"
          className="min-h-[44px] rounded-lg border border-zinc-300 px-3 text-sm font-medium dark:border-zinc-700"
          onClick={() => setTextSize((size) => clampTextSize(size + 2))}
          disabled={textSize >= 24}
        >
          A+
        </button>
        <span className="text-xs text-zinc-500">{textSize}px</span>
        <button
          type="button"
          className="min-h-[44px] rounded-lg border border-zinc-300 px-3 text-sm font-medium dark:border-zinc-700"
          onClick={() => {
            setActiveSection(0);
            setStageActive(true);
          }}
        >
          Mode panggung
        </button>
      </div>
      <div
        data-chart-body=""
        className="min-w-0 max-w-full rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900"
      >
        {sections ? (
          <div className="flex min-w-0 flex-col gap-5">
            {sections.map((section, index) => {
              const annotations = getSectionAnnotations?.(section.id);
              const sectionOffset = offsets[index] ?? keyOffsetFromC(baseKey) + offset;
              const sectionMetadata = instrumentData?.sections[section.id];
              const rhythmParts = [
                sectionMetadata?.rhythm?.meter?.trim(),
                instrumentPov === "guitar" || instrumentPov === "chart"
                  ? sectionMetadata?.rhythm?.guitar?.trim()
                  : null,
                instrumentPov === "piano" || instrumentPov === "chart"
                  ? sectionMetadata?.rhythm?.piano?.trim()
                  : null,
              ].filter((part): part is string => Boolean(part));
              const openDisplayedChord = (symbol: string) => {
                try {
                  const baseSymbol = transposeChord(
                    symbol,
                    -sectionOffset,
                    useFlats,
                  );
                  const voicing = resolveInstrumentVoicing({
                    baseSymbol,
                    sectionOffset,
                    capo,
                    capoMode: effectiveCapoMode,
                    useFlats,
                    override: instrumentData?.voicings,
                  });
                  if (voicing) setOpenVoicing({ chord: symbol, voicing });
                } catch {
                  setOpenVoicing(null);
                }
              };
              const chords =
                instrumentPov === "guitar" || instrumentPov === "piano"
                  ? listChords(section.content)
                  : [];
              return (
                <section
                  key={`${section.id}-${index}`}
                  data-chart-section={section.id}
                  className="min-w-0 border-b border-zinc-200 pb-4 last:border-b-0 last:pb-0 dark:border-zinc-800"
                >
                  <div className="mb-2 flex min-w-0 flex-col gap-2">
                    <h3 className="text-xs font-semibold tracking-wide text-zinc-500">
                      {section.label}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {sectionMetadata?.dynamic ? (
                        <Badge
                          tone={
                            ["f", "ff", "cresc.", "decresc.", "rit."].includes(
                              sectionMetadata.dynamic,
                            )
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {sectionMetadata.dynamic}
                        </Badge>
                      ) : null}
                      {rhythmParts.length > 0 ? (
                        <span className="break-words text-xs text-zinc-600 dark:text-zinc-400">
                          {rhythmParts.join(" · ")}
                        </span>
                      ) : null}
                    </div>
                    {section.modulationSemitones ? (
                      <p className="text-xs text-indigo-700 dark:text-indigo-300">
                        Modulasi setelah bagian:{" "}
                        {formatKeyChange(
                          transposeRoot("C", sectionOffset, useFlats),
                          section.modulationSemitones,
                          useFlats,
                        )}
                      </p>
                    ) : null}
                    {annotations?.targeted}
                    {chords.length > 0 ? (
                      <div
                        className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1"
                        aria-label={`${section.label} chord voicings`}
                      >
                        {chords.map((chord) => {
                          let voicing: ResolvedInstrumentVoicing | null = null;
                          try {
                            voicing = resolveInstrumentVoicing({
                              baseSymbol: chord,
                              sectionOffset,
                              capo,
                              capoMode: effectiveCapoMode,
                              useFlats,
                              override: instrumentData?.voicings,
                            });
                          } catch {
                            voicing = null;
                          }
                          return (
                            <button
                              key={chord}
                              type="button"
                              className="flex min-h-[44px] shrink-0 flex-col items-center rounded-lg border border-zinc-300 p-2 text-xs dark:border-zinc-700"
                              onClick={() =>
                                voicing
                                  ? setOpenVoicing({ chord, voicing })
                                  : setOpenVoicing(null)
                              }
                            >
                              <span className="font-semibold">
                                {instrumentPov === "guitar"
                                  ? voicing?.shape ?? chord
                                  : voicing?.sounding ?? chord}
                              </span>
                              {instrumentPov === "guitar" && voicing?.guitar ? (
                                <SafeVoicingBoundary>
                                  <GuitarChordDiagram
                                    chord={voicing.shape}
                                    shape={voicing.guitar}
                                    compact
                                  />
                                </SafeVoicingBoundary>
                              ) : instrumentPov === "piano" && voicing?.piano ? (
                                <SafeVoicingBoundary>
                                  <PianoVoicing
                                    chord={voicing.sounding}
                                    voicing={voicing.piano}
                                    compact
                                  />
                                </SafeVoicingBoundary>
                              ) : (
                                <span className="px-2 py-4 text-zinc-500">
                                  Voicing belum ada
                                </span>
                              )}
                              {instrumentPov === "guitar" &&
                              capo > 0 &&
                              effectiveCapoMode === "shape" &&
                              voicing ? (
                                <span className="text-[10px] text-zinc-500">
                                  terdengar: {voicing.sounding}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={`grid min-w-0 grid-cols-1 gap-3 ${
                      annotations?.general
                        ? "lg:grid-cols-[minmax(0,1fr)_16rem]"
                        : ""
                    }`}
                  >
                    <div className="min-w-0 max-w-full overflow-x-auto">
                      {renderChart(
                        transposeContent(section.content, sectionOffset, useFlats),
                        mode,
                        `${sectionOffset}-${useFlats}-${mode}-${section.id}-${index}`,
                        instrumentPov === "chart"
                          ? undefined
                          : openDisplayedChord,
                      )}
                    </div>
                    {annotations?.general}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <ChartBody
              content={transposed}
              mode={mode}
              renderKey={`${offset}-${useFlats}-${mode}`}
              onChordClick={
                instrumentPov === "chart"
                  ? undefined
                  : (symbol) => {
                      const sectionOffset =
                        keyOffsetFromC(displayBaseKey) + offset;
                      const baseSymbol = transposeChord(
                        symbol,
                        -sectionOffset,
                        useFlats,
                      );
                      const voicing = resolveInstrumentVoicing({
                        baseSymbol,
                        sectionOffset,
                        capo,
                        capoMode: effectiveCapoMode,
                        useFlats,
                        override: instrumentData?.voicings,
                      });
                      if (voicing) setOpenVoicing({ chord: symbol, voicing });
                    }
              }
            />
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
            <button
              type="button"
              className="min-h-[44px] rounded-lg border border-zinc-500/50 px-3 text-sm"
              onClick={() => jumpToSection(moveStageSection(activeSection, -1, stageSections.length))}
              disabled={stageSections.length === 0 || activeSection === 0}
            >
              Sebelumnya
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-lg border border-zinc-500/50 px-3 text-sm"
              onClick={() => jumpToSection(moveStageSection(activeSection, 1, stageSections.length))}
              disabled={stageSections.length === 0 || activeSection >= stageSections.length - 1}
            >
              Berikutnya
            </button>
            <select
              value={activeSection}
              onChange={(event) => jumpToSection(Number(event.target.value))}
              aria-label="Lompat ke section"
              className="h-11 max-w-[45vw] rounded-lg border border-zinc-500/50 bg-transparent px-2 text-sm"
            >
              {stageSections.length === 0 ? (
                <option value={0}>Tanpa section</option>
              ) : (
                stageSections.map((section) => (
                  <option key={`${section.lineIndex}-${section.label}`} value={section.index}>
                    {section.index + 1}. {section.label}
                  </option>
                ))
              )}
            </select>
            <button type="button" className="min-h-[44px] rounded-lg border border-zinc-500/50 px-3 text-sm" onClick={() => setTextSize((size) => clampTextSize(size - 2))} disabled={textSize <= 14}>A−</button>
            <button type="button" className="min-h-[44px] rounded-lg border border-zinc-500/50 px-3 text-sm" onClick={() => setTextSize((size) => clampTextSize(size + 2))} disabled={textSize >= 24}>A+</button>
            <button type="button" className="min-h-[44px] rounded-lg border border-zinc-500/50 px-3 text-sm" onClick={() => setStageTheme((theme) => (theme === "dark" ? "light" : "dark"))}>
              {stageTheme === "dark" ? "Terang" : "Gelap"}
            </button>
            <button type="button" className="min-h-[44px] rounded-lg border border-zinc-500/50 px-3 text-sm" onClick={() => setAutoScroll((enabled) => !enabled)} aria-pressed={autoScroll}>
              {autoScroll ? "Jeda gulir" : "Gulir otomatis"}
            </button>
            <label className="flex items-center gap-2 text-xs">
              Kecepatan
              <input type="range" min={1} max={5} value={scrollSpeed} onChange={(event) => setScrollSpeed(Number(event.target.value))} aria-label="Kecepatan auto-scroll" />
            </label>
            <button type="button" className="min-h-[44px] rounded-lg border border-zinc-500/50 px-3 text-sm" onClick={() => setStageActive(false)}>Keluar</button>
          </div>
          <div
            ref={stageScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8"
            style={{ fontSize: textSize }}
          >
            {sections ? (
              <div className="flex flex-col gap-5">
                {sections.map((section, index) => {
                  const sectionOffset = offsets[index] ?? keyOffsetFromC(baseKey) + offset;
                  return (
                    <section
                      key={section.id}
                      id={`stage-section-${index}`}
                      className={`rounded-lg border px-3 py-4 ${
                        activeSection === index
                          ? "border-sky-500"
                          : "border-zinc-500/30"
                      }`}
                    >
                      <h2 className="mb-3 font-bold">
                        {index + 1}. {section.label}
                      </h2>
                      {renderChart(
                        transposeContent(section.content, sectionOffset, useFlats),
                        mode,
                        `stage-${sectionOffset}-${useFlats}-${mode}-${section.id}-${index}`,
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <ChartBody
                content={transposed}
                mode={mode}
                renderKey={`stage-${offset}-${useFlats}-${mode}`}
              />
            )}
          </div>
        </div>
      ) : null}
      {openVoicing ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpenVoicing(null);
          }}
          onTouchStart={(event) => {
            if (event.target === event.currentTarget) setOpenVoicing(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Voicing ${openVoicing.chord}`}
            className="max-h-[90vh] max-w-full overflow-auto rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                {instrumentPov === "guitar"
                  ? openVoicing.voicing.shape
                  : openVoicing.voicing.sounding}
              </h2>
              <button
                type="button"
                className="min-h-[44px] rounded-lg border px-3 text-sm"
                onClick={() => setOpenVoicing(null)}
              >
                Tutup
              </button>
            </div>
            {instrumentPov === "guitar" && openVoicing.voicing.guitar ? (
              <SafeVoicingBoundary>
                <GuitarChordDiagram
                  chord={openVoicing.voicing.shape}
                  shape={openVoicing.voicing.guitar}
                />
              </SafeVoicingBoundary>
            ) : instrumentPov === "piano" && openVoicing.voicing.piano ? (
              <SafeVoicingBoundary>
                <PianoVoicing
                  chord={openVoicing.voicing.sounding}
                  voicing={openVoicing.voicing.piano}
                />
              </SafeVoicingBoundary>
            ) : (
              <p>Voicing belum ada</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
