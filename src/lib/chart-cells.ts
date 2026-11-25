import { alignChordsToNotation, notationLineError, type NotationToken } from "@/lib/jianpu-align";
import { layoutChordLine, parseBarLine, splitChordBrackets } from "@/lib/chords";
import { classifyChartLine, chartComment, type ChartLineKind } from "@/lib/chart-view-mode";

export interface ChartCell {
  chord: string | null;
  note: NotationToken | null;
  text: string;
  joinNext: boolean;
}

export interface ChartWord {
  cells: ChartCell[];
  isBar: boolean;
}

export type ChartLineModel =
  | { kind: "lyric"; words: ChartWord[] }
  | { kind: "notation"; words: ChartWord[] }
  | { kind: "bars"; words: ChartWord[] }
  | { kind: "couplet"; words: ChartWord[] }
  | { kind: "label"; label: string }
  | { kind: "comment"; text: string }
  | { kind: "empty" }
  | { kind: "error"; raw: string; message: string };

export function buildLineModel(line: string): ChartLineModel {
  const kind: ChartLineKind = classifyChartLine(line);
  if (kind === "empty") return { kind: "empty" };
  if (kind === "label") {
    const match = /^\s*\{([^}]+)\}\s*$/.exec(line);
    return { kind: "label", label: (match?.[1] ?? "").trim() };
  }
  if (kind === "comment") return { kind: "comment", text: chartComment(line) ?? "" };

  const layout = layoutChordLine(line);
  if (kind === "notation") {
    const alignment = alignChordsToNotation(layout.chordLine, layout.lyricLine);
    if (!alignment) {
      return {
        kind: "error",
        raw: line,
        message: notationLineError(layout.lyricLine) ?? "Baris not angka tidak valid.",
      };
    }
    const words: ChartWord[] = [];
    let current: ChartCell[] = [];
    for (const token of alignment.tokens) {
      if (token.kind === "bar") {
        if (current.length) words.push({ isBar: false, cells: current });
        current = [];
        words.push({ isBar: true, cells: [{ chord: null, note: token, text: "|", joinNext: false }] });
        continue;
      }
      const chords = alignment.chords
        .filter((chord) => chord.renderCol === token.renderCol)
        .map((chord) => chord.token);
      const inBeam = token.beamGroup !== null;
      const inSlur = token.slurGroup !== null;
      current.push({
        chord: chords[0] ?? null,
        note: token,
        text: "",
        joinNext: inBeam || inSlur,
      });
      if (!inBeam && !inSlur) {
        if (token.renderWidth > 0) {
          words.push({ isBar: false, cells: current });
          current = [];
        }
      }
    }
    if (current.length) words.push({ isBar: false, cells: current });
    const attachedColumns = new Set(
      alignment.chords
        .filter((chord) => alignment.tokens.some((token) => token.renderCol === chord.renderCol))
        .map((chord) => chord.renderCol),
    );
    const trailing = alignment.chords.filter((chord) => !attachedColumns.has(chord.renderCol));
    if (trailing.length) {
      words.push({
        isBar: false,
        cells: trailing.map((chord) => ({
          chord: chord.token,
          note: null,
          text: "",
          joinNext: false,
        })),
      });
    }
    return { kind: "notation", words };
  }

  if (kind === "chords-only") {
    const parts = parseBarLine(line);
    if (parts) {
      const words: ChartWord[] = [];
      let measure: ChartCell[] = [];
      for (const part of parts) {
        if (part.kind === "bar") {
          if (measure.length) words.push({ isBar: false, cells: measure });
          measure = [];
          words.push({ isBar: true, cells: [{ chord: null, note: null, text: "|", joinNext: false }] });
        } else if (part.kind === "chord-slot") {
          measure.push({ chord: part.chords[0] ?? null, note: null, text: "", joinNext: part.chords.length > 1 });
        } else if (part.kind === "rest" || part.kind === "repeat") {
          measure.push({ chord: null, note: null, text: part.value, joinNext: false });
        }
      }
      if (measure.length) words.push({ isBar: false, cells: measure });
      return { kind: "bars", words };
    }

    const chords = splitChordBrackets(line).filter((part) => part.kind === "chord").map((part) => part.value);
    return {
      kind: "lyric",
      words: chords.length
        ? [{ isBar: false, cells: chords.map((chord) => ({ chord, note: null, text: "", joinNext: false })) }]
        : [],
    };
  }

  const parts = splitChordBrackets(line);
  const words: ChartWord[] = [];
  let current: ChartCell[] = [];
  let pending: string[] = [];

  const flushWord = () => {
    if (pending.length) {
      for (const chord of pending) {
        current.push({ chord, note: null, text: "", joinNext: false });
      }
      pending = [];
    }
    if (current.length) {
      words.push({ isBar: false, cells: current });
      current = [];
    }
  };

  for (const part of parts) {
    if (part.kind === "chord") {
      pending.push(part.value);
      continue;
    }
    const chunks = part.value.match(/\s+|[^ \t]+/g) ?? [];
    for (const chunk of chunks) {
      if (/^\s+$/.test(chunk)) {
        flushWord();
        continue;
      }
      const hyphenIndex = chunk.indexOf("-");
      if (hyphenIndex >= 0) {
        const left = chunk.slice(0, hyphenIndex);
        const right = chunk.slice(hyphenIndex + 1);
        if (current.length > 0) {
          current[current.length - 1]!.joinNext = true;
        }
        if (left) {
          current.push({
            chord: pending.shift() ?? null,
            note: null,
            text: left,
            joinNext: true,
          });
        }
        if (right) {
          current.push({
            chord: pending.shift() ?? null,
            note: null,
            text: right,
            joinNext: false,
          });
        }
      } else {
        current.push({
          chord: pending.shift() ?? null,
          note: null,
          text: chunk,
          joinNext: false,
        });
      }
    }
  }
  flushWord();
  return { kind: "lyric", words };
}

export function buildSectionModels(lines: string[]): ChartLineModel[] {
  const models: ChartLineModel[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const model = buildLineModel(lines[index] ?? "");
    if (model.kind !== "notation") {
      models.push(model);
      continue;
    }

    const nextModel =
      index + 1 < lines.length ? buildLineModel(lines[index + 1] ?? "") : null;
    if (
      nextModel?.kind === "lyric" &&
      !nextModel.words.some((word) =>
        word.cells.some((cell) => cell.chord),
      )
    ) {
      const notationCells = model.words.flatMap((word) =>
        word.isBar ? [] : word.cells.filter((cell) => cell.note),
      );
      const lyricCells = nextModel.words.flatMap((word) => word.cells);
      const mergedWords: ChartWord[] = [];
      let lyricIndex = 0;

      for (const word of model.words) {
        if (word.isBar) {
          mergedWords.push(word);
          continue;
        }
        const cells = word.cells.map((cell) => {
          if (!cell.note) return cell;
          const lyric = lyricCells[lyricIndex++];
          return lyric
            ? { ...cell, text: lyric.text, joinNext: lyric.joinNext }
            : { ...cell, text: "", joinNext: false };
        });
        mergedWords.push({ isBar: false, cells });
      }

      if (lyricIndex < lyricCells.length) {
        mergedWords.push({
          isBar: false,
          cells: lyricCells.slice(lyricIndex).map((cell) => ({
            chord: null,
            note: null,
            text: cell.text,
            joinNext: cell.joinNext,
          })),
        });
      }

      if (notationCells.length > 0) {
        models.push({ kind: "couplet", words: mergedWords });
        index += 1;
        continue;
      }
    }

    models.push(model);
  }

  return models;
}

export function sectionIsInstrumental(lines: string[]): boolean {
  const body = lines.slice(1);
  return !body.some((line) => {
    const layout = layoutChordLine(line);
    if (layout.label || layout.isEmpty) return false;
    return classifyChartLine(line) === "lyric";
  });
}
