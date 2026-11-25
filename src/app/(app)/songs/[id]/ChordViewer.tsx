"use client";

import { Component, memo, type CSSProperties, type ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { KeyTransposeBar } from "@/components/KeyTransposeBar";
import { ChartLineView } from "@/components/ChartLineView";
import { NotationSymbolGuide } from "@/components/NotationSymbolGuide";
import { ChartSectionNavigator } from "@/components/ChartSectionNavigator";
import { Badge } from "@/components/ui/Badge";
import {
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
  preferredInstrumentPov,
  roleTabVisible,
  type ArrangementRoleSlug,
} from "@/lib/arrangement-roles";
import {
  contentHasNotation,
  formatTransposeFormula,
} from "@/lib/jianpu-align";
import {
  clampTextScale,
  getStageSections,
  getAutoScrollNextTop,
  moveStageSection,
} from "@/lib/chart-stage";
import {
  CHART_DISPLAY_MODE_KEY,
  CHART_VIEW_MODES,
  layersForMode,
  readChartViewMode,
  type ChartViewMode,
} from "@/lib/chart-view-mode";
import {
  buildLineModel,
  buildSectionModels,
  sectionIsInstrumental,
} from "@/lib/chart-cells";

type ViewMode = ChartViewMode;

class SafeVoicingBoundary extends Component<
  { children: ReactNode; fallback?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {}

  render() {
    return this.state.failed ? (
      <span className="chart-section-label px-2 py-4">
        {this.props.fallback ?? "Voicing belum ada"}
      </span>
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
  const [mode, setMode] = useState<ViewMode>("detail");
  const [instrumentPov, setInstrumentPov] = useState<InstrumentPov>("chart");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  useEffect(() => {
    let savedOffset = 0;
    let savedResetToC = false;
    let savedFlats = false;
    let savedMode: ViewMode = "detail";
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
            prefs.instrumentPov === "chart" ||
            prefs.instrumentPov === "guitar" ||
            prefs.instrumentPov === "piano" ||
            prefs.instrumentPov === "drum" ||
            prefs.instrumentPov === "guitar_lead" ||
            prefs.instrumentPov === "piano_layer" ||
            prefs.instrumentPov === "bass" ||
            prefs.instrumentPov === "vocal"
          ) {
            savedInstrumentPov = prefs.instrumentPov;
          }
        }
      }
      savedMode = readChartViewMode(
        window.localStorage.getItem(CHART_DISPLAY_MODE_KEY),
      );
    } catch (error) {
      console.warn("Preferensi tampilan chart tidak dapat dibaca.", error);
    }
    savedMode = readChartViewMode(
      window.localStorage.getItem(CHART_DISPLAY_MODE_KEY),
    );
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
  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      window.localStorage.setItem(CHART_DISPLAY_MODE_KEY, mode);
    } catch (error) {
      console.warn("Mode tampilan chart tidak dapat disimpan.", error);
    }
  }, [mode, preferencesLoaded]);
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

const MODES = CHART_VIEW_MODES;

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


function renderChart(
  content: string,
  mode: ViewMode,
  key: string,
  onChordClick?: (symbol: string) => void,
  sectionIdPrefix = "chart-section",
  simplify = false,
) {
  const lines = content.split("\n");
  const models = buildSectionModels(lines);
  let sectionIndex = 0;
  const layers = layersForMode(mode);
  let sourceIndex = 0;
  return models.map((model, index) => {
    const lineKey = `${key}-${index}`;
    while (
      sourceIndex < lines.length &&
      buildLineModel(lines[sourceIndex] ?? "").kind === "empty"
    ) {
      sourceIndex += 1;
    }
    if (model.kind !== "empty") sourceIndex += 1;
    if (model.kind === "couplet") sourceIndex += 1;
    if (model.kind === "label") {
      const labelSourceIndex = Math.max(0, sourceIndex - 1);
      const shownLabel = sectionLabelAt(lines, labelSourceIndex);
      const shown = shownLabel ?? model.label;
      const currentSectionIndex = sectionIndex++;
      const blockStart = labelSourceIndex + 1;
      let blockEnd = lines.length;
      for (let cursor = blockStart; cursor < lines.length; cursor += 1) {
        if (layoutChordLine(lines[cursor] ?? "").label) {
          blockEnd = cursor;
          break;
        }
      }
      const instrumental =
        mode === "lyrics" &&
        sectionIsInstrumental(lines.slice(labelSourceIndex, blockEnd));
      return (
        <div
          key={lineKey}
          id={`${sectionIdPrefix}-${currentSectionIndex}`}
          data-section-label={shown}
          data-chart-section-index={currentSectionIndex}
          className={`chart-section-label mt-3 scroll-mt-[var(--chart-scroll-offset,5rem)] text-xs font-semibold tracking-wide first:mt-0 ${
            shown === "Intro" ? "normal-case" : "uppercase"
          }`}
        >
          {shown}
          {instrumental ? (
            <span className="ml-2 text-zinc-500 dark:text-zinc-400 normal-case font-normal">
              (instrumental)
            </span>
          ) : null}
        </div>
      );
    }
    if (model.kind === "comment") {
      return <ChartLineView key={lineKey} model={model} layers={layers} simplify={simplify} onChordClick={onChordClick} />;
    }
    if (model.kind === "empty") {
      return <div key={lineKey} className="h-4" />;
    }
    if (model.kind === "error") {
      return <ChartLineView key={lineKey} model={model} layers={layers} simplify={simplify} onChordClick={onChordClick} />;
    }
    if (model.kind === "bars" && !layers.chords) return null;
    if (model.kind === "lyric" && mode === "lyrics-notation") {
      return <ChartLineView key={lineKey} model={model} layers={{ ...layers, chords: false }} simplify={simplify} onChordClick={onChordClick} />;
    }
    if (model.kind === "notation" && mode === "lyrics") return null;
    if (model.kind === "lyric" && mode === "lyrics") {
      return <ChartLineView key={lineKey} model={model} layers={{ ...layers, chords: false, notation: false }} simplify={simplify} onChordClick={onChordClick} />;
    }
    return <ChartLineView key={lineKey} model={model} layers={layers} simplify={simplify} onChordClick={onChordClick} />;
  });
}

/** Isi chart tanpa kontrol transpose, supaya rumus nada tidak diulang per bagian. */
export const ChartBody = memo(function ChartBody({
  content,
  mode = "detail",
  renderKey,
  onChordClick,
  sectionIdPrefix,
  simplify,
}: {
  content: string;
  mode?: ViewMode;
  renderKey: string;
  onChordClick?: (symbol: string) => void;
  sectionIdPrefix?: string;
  simplify?: boolean;
}) {
  return (
    <>
      {renderChart(
        content,
        mode,
        renderKey,
        onChordClick,
        sectionIdPrefix,
        simplify,
      )}
    </>
  );
});

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
  roleTabs = [],
  defaultPart = null,
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
  roleTabs?: readonly { role: string; data: unknown }[];
  defaultPart?: string | null;
}) {
  const sharedPreferences = useContext(ChartViewPreferencesContext);
  const hasSharedPreferences = Boolean(sharedPreferences);
  const [localOffset, setLocalOffset] = useState(initialOffset);
  const [localResetToC, setLocalResetToC] = useState(false);
  const [localFlats, setLocalFlats] = useState(false);
  const [localMode, setLocalMode] = useState<ViewMode>("detail");
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
  const visibleRoleTabs = useMemo(
    () =>
      roleTabs
        .filter((tab) => roleTabVisible(tab.data))
        .map((tab) => tab.role)
        .filter((role): role is ArrangementRoleSlug =>
          ["drum", "guitar_lead", "piano_layer", "bass", "vocal"].includes(role),
        ),
    [roleTabs],
  );
  useEffect(() => {
    const isVisible =
      instrumentPov === "chart" ||
      instrumentPov === "guitar" ||
      instrumentPov === "piano" ||
      visibleRoleTabs.includes(instrumentPov);
    if (!isVisible) {
      setInstrumentPov(preferredInstrumentPov(defaultPart, visibleRoleTabs));
    }
  }, [defaultPart, instrumentPov, setInstrumentPov, visibleRoleTabs]);
  const capo = capoOverride ?? defaultCapo;
  const showPOV = showPovControls ?? Boolean(songId);
  const showKey = showKeyControls ?? Boolean(songId);
  const showCapo = showCapoControls ?? Boolean(songId);
  const [textScale, setTextScale] = useState(100);
  const [textScaleLoaded, setTextScaleLoaded] = useState(false);
  const [stageActive, setStageActive] = useState(false);
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">("light");
  const [themeOverride, setThemeOverride] = useState<"dark" | "light" | null>(
    null,
  );
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const [simplify, setSimplify] = useState(false);
  const [simplifyLoaded, setSimplifyLoaded] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const scrollSpeedRef = useRef(2);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const activeSectionRef = useRef(0);
  const stageScrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef(0);
  const lastWrittenScrollRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const chartTheme = themeOverride ?? systemTheme;
  const renderMobileControls = (stage = false) => (
    <div className="chart-mobile-controls sticky inset-x-0 top-[var(--app-header-height,4rem)] z-[70] sm:hidden">
      <div
        role="toolbar"
        aria-label="Kontrol chart"
        className="flex items-center gap-2 overflow-x-auto px-2 py-1.5"
      >
        <div className="flex shrink-0 gap-1" role="group" aria-label="Mode tampil">
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              aria-pressed={mode === item.value}
              className="chart-toggle min-h-[44px] shrink-0 rounded-lg px-3 text-xs font-medium"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 gap-1" role="group" aria-label="Transpose nada">
          <button
            type="button"
            className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm"
            onClick={() => setOffset(offset - 1)}
            aria-label="Turunkan setengah nada"
          >
            −½
          </button>
          <button
            type="button"
            className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm"
            onClick={() => setOffset(offset + 1)}
            aria-label="Naikkan setengah nada"
          >
            +½
          </button>
          <button
            type="button"
            className="chart-toggle min-h-[44px] rounded-lg px-3 text-xs"
            onClick={resetViewerToC}
          >
            Reset nada
          </button>
        </div>
        <button
          type="button"
          className="chart-toggle min-h-[44px] shrink-0 rounded-lg px-3 text-xs font-medium"
          onClick={() => setSimplify((enabled) => !enabled)}
          aria-label="Sederhanakan chord"
          aria-pressed={simplify}
        >
          {simplify ? "Chord ringkas" : "Sederhanakan"}
        </button>
        <button
          type="button"
          className="chart-toggle min-h-[44px] shrink-0 rounded-lg px-3 text-sm"
          onClick={() => setTextScale((scale) => clampTextScale(scale - 10))}
          disabled={textScale <= 80}
        >
          A−
        </button>
        <span className="shrink-0 text-xs">{textScale}%</span>
        <button
          type="button"
          className="chart-toggle min-h-[44px] shrink-0 rounded-lg px-3 text-sm"
          onClick={() => setTextScale((scale) => clampTextScale(scale + 10))}
          disabled={textScale >= 200}
        >
          A+
        </button>
        <button
          type="button"
          className="chart-toggle min-h-[44px] shrink-0 rounded-lg px-3 text-xs font-medium"
          onClick={() =>
            setThemeOverride(chartTheme === "dark" ? "light" : "dark")
          }
          aria-label={`Gunakan tema ${chartTheme === "dark" ? "terang" : "gelap"}`}
          aria-pressed={themeOverride !== null}
        >
          {chartTheme === "dark" ? "Tema terang" : "Tema gelap"}
        </button>
        <button
          type="button"
          className="chart-toggle min-h-[44px] min-w-[9.5rem] rounded-lg px-3 text-sm font-medium"
          onClick={() => setAutoScroll((enabled) => !enabled)}
          aria-pressed={autoScroll}
          disabled={reducedMotion}
        >
          {autoScroll ? "Jeda gulir" : "Gulir otomatis"}
        </button>
        <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-300 px-2 text-xs dark:border-zinc-700">
          Kecepatan
          <input
            type="range"
            min={1}
            max={5}
            value={scrollSpeed}
            onChange={(event) => setScrollSpeed(Number(event.target.value))}
            aria-label="Kecepatan auto-scroll"
            disabled={reducedMotion}
          />
          <span>{scrollSpeed}</span>
        </label>
        {stage ? (
          <button
            type="button"
            className="chart-toggle min-h-[44px] shrink-0 rounded-lg px-3 text-xs font-medium"
            onClick={() => {
              setAutoScroll(false);
              setStageActive(false);
              window.requestAnimationFrame(() => {
                document.getElementById(`chart-section-${activeSectionRef.current}`)?.scrollIntoView({
                  block: "start",
                  behavior: "auto",
                });
              });
            }}
          >
            Keluar panggung
          </button>
        ) : (
          <button
            type="button"
            className="min-h-[44px] shrink-0 rounded-lg bg-sky-700 px-3 text-xs font-medium text-white"
            onClick={() => {
              setStageActive(true);
              window.requestAnimationFrame(() => {
                document.getElementById(`stage-section-${activeSectionRef.current}`)?.scrollIntoView({
                  block: "start",
                  behavior: "auto",
                });
              });
            }}
          >
            Mode panggung
          </button>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setAutoScroll(false);
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () =>
      setSystemTheme(preference.matches ? "dark" : "light");
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let savedSimplify = false;
    try {
      savedSimplify = window.localStorage.getItem("myth_chart_simplify") === "true";
    } catch (error) {
      console.warn("Preferensi penyederhanaan chord tidak dapat dibaca.", error);
    }
    const timer = window.setTimeout(() => {
      setSimplify(savedSimplify);
      setSimplifyLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!simplifyLoaded) return;
    try {
      window.localStorage.setItem("myth_chart_simplify", String(simplify));
    } catch (error) {
      console.warn("Preferensi penyederhanaan chord tidak dapat disimpan.", error);
    }
  }, [simplify, simplifyLoaded]);

  useEffect(() => {
    let savedTheme: "dark" | "light" | null = null;
    try {
      const saved = window.localStorage.getItem("myth_chart_theme");
      if (saved === "dark" || saved === "light") savedTheme = saved;
    } catch (error) {
      console.warn("Preferensi tema chart tidak dapat dibaca.", error);
    }
    const timer = window.setTimeout(() => {
      setThemeOverride(savedTheme);
      setThemeLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    try {
      if (themeOverride) {
        window.localStorage.setItem("myth_chart_theme", themeOverride);
      } else {
        window.localStorage.removeItem("myth_chart_theme");
      }
    } catch (error) {
      console.warn("Preferensi tema chart tidak dapat disimpan.", error);
    }
  }, [themeLoaded, themeOverride]);

  useEffect(() => {
    if (!preferenceKey || hasSharedPreferences) return;
    let savedOffset = initialOffset;
    let savedResetToC = false;
    let savedFlats = false;
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
            prefs.instrumentPov === "chart" ||
            prefs.instrumentPov === "guitar" ||
            prefs.instrumentPov === "piano" ||
            prefs.instrumentPov === "drum" ||
            prefs.instrumentPov === "guitar_lead" ||
            prefs.instrumentPov === "piano_layer" ||
            prefs.instrumentPov === "bass" ||
            prefs.instrumentPov === "vocal"
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
    const savedMode = readChartViewMode(
      window.localStorage.getItem(CHART_DISPLAY_MODE_KEY),
    );
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
    if (!localPreferencesLoaded || hasSharedPreferences) return;
    try {
      window.localStorage.setItem(CHART_DISPLAY_MODE_KEY, mode);
    } catch (error) {
      console.warn("Mode tampilan chart tidak dapat disimpan.", error);
    }
  }, [mode, hasSharedPreferences, localPreferencesLoaded]);
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
  const transposedSections = useMemo(
    () =>
      sections?.map((section, index) =>
        transposeContent(
          section.content,
          offsets[index] ?? keyOffsetFromC(baseKey) + offset,
          useFlats,
        ),
      ) ?? [],
    [baseKey, offset, offsets, sections, useFlats],
  );
  const transposedRoleContents = useMemo(() => {
    const result = new Map<string, string>();
    if (instrumentPov !== "guitar_lead" || !sections) return result;
    const roleTab = roleTabs.find((tab) => tab.role === instrumentPov)?.data;
    if (!roleTab || typeof roleTab !== "object") return result;
    const roleSections = (
      roleTab as { sections?: Record<string, { content?: string }> }
    ).sections;
    if (!roleSections) return result;
    sections.forEach((section, index) => {
      const sectionContent = roleSections[section.id]?.content;
      if (sectionContent) {
        result.set(
          section.id,
          transposeContent(
            sectionContent,
            offsets[index] ?? keyOffsetFromC(baseKey) + offset,
            useFlats,
          ),
        );
      }
    });
    return result;
  }, [
    baseKey,
    instrumentPov,
    offset,
    offsets,
    roleTabs,
    sections,
    useFlats,
  ]);
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
    let savedScale = 100;
    try {
      const current = window.localStorage.getItem("myth_chart_text_scale");
      if (current !== null) {
        const parsed = Number(current);
        if (Number.isFinite(parsed)) savedScale = clampTextScale(parsed);
      } else {
        const legacySize = Number(
          window.localStorage.getItem("myth-stage-text-size"),
        );
        if (Number.isFinite(legacySize) && legacySize > 0) {
          savedScale = clampTextScale((legacySize / 14) * 100);
        }
      }
    } catch (error) {
      console.warn("Preferensi ukuran teks chart tidak dapat dibaca.", error);
    }
    const timer = window.setTimeout(() => {
      setTextScale(savedScale);
      setTextScaleLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!textScaleLoaded) return;
    try {
      window.localStorage.setItem("myth_chart_text_scale", String(textScale));
      window.localStorage.removeItem("myth-stage-text-size");
    } catch (error) {
      console.warn("Preferensi ukuran teks chart tidak dapat disimpan.", error);
    }
  }, [textScale, textScaleLoaded]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setControlsCollapsed(
          window.localStorage.getItem("myth_chart_controls_collapsed") === "true",
        );
        const key = songId
          ? `myth_chart_auto_scroll_speed_${songId}`
          : "myth_chart_auto_scroll_speed";
        const saved = Number(window.localStorage.getItem(key));
        if (Number.isInteger(saved) && saved >= 1 && saved <= 5) {
          setScrollSpeed(saved);
          scrollSpeedRef.current = saved;
        }
      } catch (error) {
        console.warn("Preferensi kontrol chart tidak dapat dibaca.", error);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [songId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "myth_chart_controls_collapsed",
        String(controlsCollapsed),
      );
    } catch {}
  }, [controlsCollapsed]);

  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  useEffect(() => {
    try {
      const key = songId
        ? `myth_chart_auto_scroll_speed_${songId}`
        : "myth_chart_auto_scroll_speed";
      window.localStorage.setItem(key, String(scrollSpeed));
    } catch (error) {
      console.warn("Kecepatan auto-scroll tidak dapat disimpan.", error);
    }
  }, [scrollSpeed, songId]);

  useEffect(() => {
    const updateOffset = () => {
      const header = document.querySelector<HTMLElement>("[data-app-header]");
      const headerHeight = header?.getBoundingClientRect().height ?? 72;
      document.documentElement.style.setProperty(
        "--app-header-height",
        `${headerHeight}px`,
      );
      const toolbar = document.querySelector<HTMLElement>("[data-chart-controls]");
      const toolbarHeight = toolbar?.getBoundingClientRect().height ?? 0;
      document.documentElement.style.setProperty(
        "--chart-scroll-offset",
        `${headerHeight + toolbarHeight + 16}px`,
      );
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    const observer = new ResizeObserver(updateOffset);
    const header = document.querySelector<HTMLElement>("[data-app-header]");
    const toolbar = document.querySelector<HTMLElement>("[data-chart-controls]");
    if (header) observer.observe(header);
    if (toolbar) observer.observe(toolbar);
    return () => {
      window.removeEventListener("resize", updateOffset);
      observer.disconnect();
    };
  }, [controlsCollapsed, stageActive]);

  useEffect(() => {
    if (!stageActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const jump = (direction: -1 | 1) => {
      const next = moveStageSection(
        activeSectionRef.current,
        direction,
        stageSections.length,
      );
      document.getElementById(`stage-section-${next}`)?.scrollIntoView({
        block: "start",
        behavior: reducedMotion ? "auto" : "smooth",
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAutoScroll(false);
        setStageActive(false);
        window.requestAnimationFrame(() => {
          document.getElementById(`chart-section-${activeSectionRef.current}`)?.scrollIntoView({
            block: "start",
            behavior: "auto",
          });
        });
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        jump(1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        jump(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [reducedMotion, stageActive, stageSections.length]);

  useEffect(() => {
    if (!autoScroll) return;
    if (reducedMotion) return;

    const initialPosition = stageActive
      ? (stageScrollRef.current?.scrollTop ?? 0)
      : window.scrollY;
    scrollPosRef.current = initialPosition;
    lastWrittenScrollRef.current = initialPosition;

    let frame = 0;
    let previousTime = 0;
    const scroll = (time: number) => {
      if (previousTime === 0) previousTime = time;
      const elapsed = Math.min(time - previousTime, 50);
      previousTime = time;
      if (stageActive) {
        const element = stageScrollRef.current;
        if (!element) {
          frame = window.requestAnimationFrame(scroll);
          return;
        }
        const maxTop = element.scrollHeight - element.clientHeight;
        const realPosition = element.scrollTop;
        if (
          Math.abs(realPosition - lastWrittenScrollRef.current) > 2
        ) {
          scrollPosRef.current = realPosition;
        }
        scrollPosRef.current = getAutoScrollNextTop(
          scrollPosRef.current,
          scrollSpeedRef.current,
          elapsed,
          maxTop,
        );
        const roundedPosition = Math.round(scrollPosRef.current);
        element.scrollTop = roundedPosition;
        lastWrittenScrollRef.current = roundedPosition;
        if (roundedPosition >= maxTop - 1) {
          setAutoScroll(false);
          return;
        }
      } else {
        const root = document.documentElement;
        const maxTop = root.scrollHeight - window.innerHeight;
        const realPosition = window.scrollY;
        if (Math.abs(realPosition - lastWrittenScrollRef.current) > 2) {
          scrollPosRef.current = realPosition;
        }
        scrollPosRef.current = getAutoScrollNextTop(
          scrollPosRef.current,
          scrollSpeedRef.current,
          elapsed,
          maxTop,
        );
        const roundedPosition = Math.round(scrollPosRef.current);
        window.scrollTo({ top: roundedPosition, behavior: "auto" });
        lastWrittenScrollRef.current = roundedPosition;
        if (roundedPosition >= maxTop - 1) {
          setAutoScroll(false);
          return;
        }
      }
      frame = window.requestAnimationFrame(scroll);
    };
    frame = window.requestAnimationFrame(scroll);
    return () => window.cancelAnimationFrame(frame);
  }, [autoScroll, reducedMotion, stageActive]);

  useEffect(() => {
    if (!autoScroll) return;
    const pause = () => setAutoScroll(false);
    window.addEventListener("touchstart", pause, { passive: true });
    return () => window.removeEventListener("touchstart", pause);
  }, [autoScroll]);

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

  const openPlainChartChord = useCallback(
    (symbol: string) => {
      const sectionOffset = keyOffsetFromC(displayBaseKey) + offset;
      const baseSymbol = transposeChord(symbol, -sectionOffset, useFlats);
      const voicing = resolveInstrumentVoicing({
        baseSymbol,
        sectionOffset,
        capo,
        capoMode: effectiveCapoMode,
        useFlats,
        override: instrumentData?.voicings,
      });
      if (voicing) setOpenVoicing({ chord: symbol, voicing });
    },
    [
      capo,
      displayBaseKey,
      effectiveCapoMode,
      instrumentData?.voicings,
      offset,
      useFlats,
    ],
  );

  const sectionChordHandlers = useMemo(() => {
    const handlers = new Map<string, (symbol: string) => void>();
    for (const [index, section] of (sections ?? []).entries()) {
      const sectionOffset =
        offsets[index] ?? keyOffsetFromC(baseKey) + offset;
      handlers.set(section.id, (symbol: string) => {
        try {
          const baseSymbol = transposeChord(symbol, -sectionOffset, useFlats);
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
      });
    }
    return handlers;
  }, [
    baseKey,
    capo,
    effectiveCapoMode,
    instrumentData,
    offset,
    offsets,
    sections,
    useFlats,
  ]);

  return (
    <div className="flex flex-col gap-3" data-chart-theme={chartTheme}>
      {showPOV || showKey || showCapo ? (
        <InstrumentPovBar
          instrumentPov={instrumentPov}
          onInstrumentPov={setInstrumentPov}
          visibleRoleTabs={visibleRoleTabs}
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
      <div data-chart-controls="" className="chart-page-controls">
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
        {mode === "detail" || mode === "lyrics-notation" ? (
          <div className="mt-2">
            <NotationSymbolGuide compact />
          </div>
        ) : null}
      </div>
      <div className="chart-page-controls flex flex-wrap items-center justify-between gap-2">
        <div className="hidden flex-wrap gap-1 sm:flex" role="group" aria-label="Mode tampil">
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              aria-pressed={mode === item.value}
              className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm font-medium"
            >
              {item.label}
            </button>
          ))}
        </div>
        {showPOV ? (
          <InstrumentPovBar
            instrumentPov={instrumentPov}
            onInstrumentPov={setInstrumentPov}
            visibleRoleTabs={visibleRoleTabs}
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
            trailingAction={
              <button
                type="button"
                className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm font-medium"
                onClick={() => {
                  setStageActive(true);
                  window.requestAnimationFrame(() => {
                    document.getElementById(`stage-section-${activeSectionRef.current}`)?.scrollIntoView({
                      block: "start",
                      behavior: "auto",
                    });
                  });
                }}
              >
                Mode panggung
              </button>
            }
          />
        ) : null}
      </div>
      <div
        data-chart-controls=""
        className="chart-toolbar sticky z-40 hidden flex-wrap items-center gap-2 rounded-lg border px-2 py-2 sm:flex"
        style={{ top: "var(--app-header-height, 4rem)" }}
      >
        <button
          type="button"
          className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm font-medium"
          onClick={() => setControlsCollapsed((collapsed) => !collapsed)}
          aria-expanded={!controlsCollapsed}
        >
          {controlsCollapsed ? "Tampilkan kontrol" : "Sembunyikan kontrol"}
        </button>
        {controlsCollapsed ? null : (
        <>
          <button
            type="button"
            className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm font-medium"
            onClick={() => setSimplify((enabled) => !enabled)}
            aria-label="Sederhanakan chord"
            aria-pressed={simplify}
          >
            {simplify ? "Chord sederhana aktif" : "Sederhanakan chord"}
          </button>
          <button type="button" className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm font-medium" onClick={() => setTextScale((scale) => clampTextScale(scale - 10))} disabled={textScale <= 80}>A−</button>
          <button type="button" className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm font-medium" onClick={() => setTextScale((scale) => clampTextScale(scale + 10))} disabled={textScale >= 200}>A+</button>
          <span className="text-xs text-zinc-500">{textScale}%</span>
          <button
            type="button"
            className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm font-medium"
            onClick={() => setThemeOverride(chartTheme === "dark" ? "light" : "dark")}
            aria-label={`Gunakan tema ${chartTheme === "dark" ? "terang" : "gelap"}`}
            aria-pressed={themeOverride !== null}
          >
            {chartTheme === "dark" ? "Tema terang" : "Tema gelap"}
          </button>
          <button
            type="button"
            className="chart-toggle min-h-[44px] min-w-[9.5rem] rounded-lg px-3 text-sm font-medium"
            onClick={() => setAutoScroll((enabled) => !enabled)}
            aria-pressed={autoScroll}
            disabled={reducedMotion}
          >
            {autoScroll ? "Jeda gulir" : "Gulir otomatis"}
          </button>
          <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-300 px-2 text-xs dark:border-zinc-700">
            Kecepatan
            <input
              type="range"
              min={1}
              max={5}
              value={scrollSpeed}
              onChange={(event) => setScrollSpeed(Number(event.target.value))}
              aria-label="Kecepatan auto-scroll"
              disabled={reducedMotion}
            />
            <span>{scrollSpeed}</span>
          </label>
        </>
        )}
      </div>
      {!stageActive ? renderMobileControls(false) : null}
      <div
        data-chart-body=""
        className="chart-surface chart-scroll-content chart-no-anchor min-w-0 max-w-full rounded-lg p-4"
        style={{ "--chart-text-scale": textScale / 100 } as CSSProperties}
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
              const roleTab =
                visibleRoleTabs.includes(instrumentPov as ArrangementRoleSlug)
                  ? roleTabs.find((tab) => tab.role === instrumentPov)?.data
                  : null;
              const roleSection =
                roleTab && typeof roleTab === "object"
                  ? (
                      roleTab as {
                        sections?: Record<
                          string,
                          { notes?: string; pattern?: string; dynamic?: string; content?: string }
                        >;
                      }
                    ).sections?.[section.id]
                  : null;
              const chords =
                instrumentPov === "guitar" || instrumentPov === "piano"
                  ? listChords(section.content)
                  : [];
              return (
                <section
                  key={`${section.id}-${index}`}
                  id={`chart-section-${index}`}
                  data-chart-section={section.id}
                  data-chart-section-index={index}
                  className="min-w-0 scroll-mt-[var(--chart-scroll-offset,5rem)] border-b border-zinc-200 pb-4 last:border-b-0 last:pb-0 dark:border-zinc-800"
                >
                  <div className="mb-2 flex min-w-0 flex-col gap-2">
                    <h3 className="chart-section-label text-xs font-semibold tracking-wide">
                      {section.label}
                      {mode === "lyrics" &&
                      sectionIsInstrumental(section.content.split("\n")) ? (
                        <span className="ml-2 normal-case font-normal text-zinc-500 dark:text-zinc-400">
                          (instrumental)
                        </span>
                      ) : null}
                    </h3>
                    {roleSection ? (
                      <SafeVoicingBoundary fallback="Konten tab belum bisa ditampilkan">
                        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/30">
                          {instrumentPov === "drum" ? (
                            <div className="grid gap-1">
                              {roleSection.pattern ? <p><span className="font-semibold">Pola drum:</span> {roleSection.pattern}</p> : null}
                              {roleSection.dynamic ? <p><span className="font-semibold">Dinamika:</span> {roleSection.dynamic}</p> : null}
                              {roleSection.notes ? <p className="whitespace-pre-wrap">{roleSection.notes}</p> : null}
                            </div>
                          ) : instrumentPov === "guitar_lead" ? (
                            roleSection.content ? (
                              <ChartBody
                                content={
                                  transposedRoleContents.get(section.id) ??
                                  roleSection.content
                                }
                                mode={mode}
                                renderKey={`${sectionOffset}-${useFlats}-role-${instrumentPov}-${section.id}-${index}`}
                                simplify={simplify}
                              />
                            ) : roleSection.notes ? (
                              <p className="whitespace-pre-wrap">{roleSection.notes}</p>
                            ) : null
                          ) : (
                            roleSection.notes ? (
                              <p className="whitespace-pre-wrap">{roleSection.notes}</p>
                            ) : null
                          )}
                        </div>
                      </SafeVoicingBoundary>
                    ) : null}
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
                    <div className="min-w-0 max-w-full">
                      <ChartBody
                        content={transposedSections[index] ?? section.content}
                        mode={mode}
                        renderKey={`${sectionOffset}-${useFlats}-${mode}-${section.id}-${index}`}
                        simplify={simplify}
                        onChordClick={
                          instrumentPov === "chart"
                            ? undefined
                            : sectionChordHandlers.get(section.id)
                        }
                      />
                    </div>
                    {annotations?.general}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="min-w-0 max-w-full">
            <ChartBody
              content={transposed}
              mode={mode}
              renderKey={`${offset}-${useFlats}-${mode}`}
              simplify={simplify}
              onChordClick={
                instrumentPov === "chart"
                  ? undefined
                  : openPlainChartChord
              }
            />
          </div>
        )}
      </div>
      {stageActive ? (
        <div
          data-chart-theme={chartTheme}
          className="chart-stage-overlay fixed inset-0 z-[100] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Mode panggung"
        >
          <div className="hidden min-h-14 flex-wrap items-center gap-2 border-b border-zinc-700/40 px-3 py-2 sm:flex">
            <button
              type="button"
              className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm"
              onClick={() => setSimplify((enabled) => !enabled)}
              aria-label="Sederhanakan chord"
              aria-pressed={simplify}
            >
              {simplify ? "Chord ringkas" : "Sederhanakan chord"}
            </button>
            <button type="button" className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm" onClick={() => setTextScale((scale) => clampTextScale(scale - 10))} disabled={textScale <= 80}>A−</button>
            <button type="button" className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm" onClick={() => setTextScale((scale) => clampTextScale(scale + 10))} disabled={textScale >= 200}>A+</button>
            <span className="text-xs">{textScale}%</span>
            <button
              type="button"
              className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm"
              onClick={() =>
                setThemeOverride(chartTheme === "dark" ? "light" : "dark")
              }
              aria-label={`Gunakan tema ${chartTheme === "dark" ? "terang" : "gelap"}`}
              aria-pressed={themeOverride !== null}
            >
              {chartTheme === "dark" ? "Tema terang" : "Tema gelap"}
            </button>
            <button type="button" className="chart-toggle min-h-[44px] min-w-[9.5rem] rounded-lg px-3 text-sm" onClick={() => setAutoScroll((enabled) => !enabled)} aria-pressed={autoScroll} disabled={reducedMotion}>
              {autoScroll ? "Jeda gulir" : "Gulir otomatis"}
            </button>
            <label className="flex items-center gap-2 text-xs">
              Kecepatan
              <input type="range" min={1} max={5} value={scrollSpeed} onChange={(event) => setScrollSpeed(Number(event.target.value))} aria-label="Kecepatan auto-scroll" disabled={reducedMotion} />
            </label>
            <button
              type="button"
              className="chart-toggle min-h-[44px] rounded-lg px-3 text-sm"
              onClick={() => {
                setAutoScroll(false);
                setStageActive(false);
                window.requestAnimationFrame(() => {
                  document.getElementById(`chart-section-${activeSectionRef.current}`)?.scrollIntoView({
                    block: "start",
                    behavior: "auto",
                  });
                });
              }}
            >
              Keluar
            </button>
          </div>
          <div
            ref={stageScrollRef}
            data-chart-body=""
            className="chart-scroll-content chart-no-anchor min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8"
            style={{ "--chart-text-scale": textScale / 100 } as CSSProperties}
          >
            {sections ? (
              <div className="flex flex-col gap-5">
                {sections.map((section, index) => {
                  const sectionOffset = offsets[index] ?? keyOffsetFromC(baseKey) + offset;
                  return (
                    <section
                      key={section.id}
                      id={`stage-section-${index}`}
                      data-chart-section-index={index}
                      className="rounded-lg border border-zinc-500/30 px-3 py-4"
                    >
                      <h2 className="mb-3 font-bold">
                        {index + 1}. {section.label}
                      </h2>
                      {renderChart(
                        transposedSections[index] ?? section.content,
                        mode,
                        `stage-${sectionOffset}-${useFlats}-${mode}-${section.id}-${index}`,
                        undefined,
                        "stage-chart-label",
                        simplify,
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
                sectionIdPrefix="stage-section"
                simplify={simplify}
              />
            )}
            <div aria-hidden="true" className="h-[70vh] shrink-0" />
          </div>
          {renderMobileControls(true)}
          <ChartSectionNavigator
            sections={stageSections}
            targetIdPrefix="stage-section"
            scrollRootRef={stageScrollRef}
            activeIndexRef={activeSectionRef}
            reducedMotion={reducedMotion}
            stage
          />
        </div>
      ) : null}
      {openVoicing ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
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
