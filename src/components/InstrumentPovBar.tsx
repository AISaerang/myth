import type { ArrangementRoleSlug } from "@/lib/arrangement-roles";
import type { ReactNode } from "react";
import { ARRANGEMENT_ROLE_CATALOG } from "@/lib/arrangement-roles";

export type InstrumentPov =
  | "chart"
  | "guitar"
  | "piano"
  | ArrangementRoleSlug;
export type CapoMode = "shape" | "sounding";

const buttonClass =
  "chart-toggle min-h-[44px] rounded-lg border px-3 text-sm font-medium";

export function InstrumentPovBar({
  instrumentPov,
  onInstrumentPov,
  resetToC,
  onResetToC,
  onReturnToSongKey,
  capo,
  defaultCapo,
  onCapo,
  capoMode,
  onCapoMode,
  showPov = true,
  showKeyControls = true,
  showCapo = true,
  visibleRoleTabs = [],
  trailingAction,
}: {
  instrumentPov: InstrumentPov;
  onInstrumentPov: (value: InstrumentPov) => void;
  resetToC: boolean;
  onResetToC: () => void;
  onReturnToSongKey: () => void;
  capo: number;
  defaultCapo: number;
  onCapo: (value: number) => void;
  capoMode: CapoMode;
  onCapoMode: (value: CapoMode) => void;
  showPov?: boolean;
  showKeyControls?: boolean;
  showCapo?: boolean;
  visibleRoleTabs?: readonly ArrangementRoleSlug[];
  trailingAction?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {showPov ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sudut pandang instrumen">
          {([
            ["chart", "Lirik + Chord"],
            ["guitar", "Gitar"],
            ["piano", "Piano"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={buttonClass}
              aria-pressed={instrumentPov === value}
              onClick={() => onInstrumentPov(value)}
            >
              {label}
            </button>
          ))}
          {ARRANGEMENT_ROLE_CATALOG.filter((role) =>
            visibleRoleTabs.includes(role.slug),
          ).map((role) => (
            <button
              key={role.slug}
              type="button"
              className={buttonClass}
              aria-pressed={instrumentPov === role.slug}
              onClick={() => onInstrumentPov(role.slug)}
            >
              {role.label}
            </button>
          ))}
          {trailingAction}
        </div>
      ) : null}
      {showKeyControls ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            aria-pressed={resetToC}
            onClick={onResetToC}
          >
            Reset ke C
          </button>
          {resetToC ? (
            <button type="button" className={buttonClass} onClick={onReturnToSongKey}>
              Kembali ke nada dasar
            </button>
          ) : null}
        </div>
      ) : null}
      {showCapo && (instrumentPov === "guitar" || capo > 0) ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-h-[44px] flex-col gap-1 text-xs font-medium">
            Capo
            <select
              value={capo}
              onChange={(event) => onCapo(Number(event.target.value))}
              className="h-11 min-w-24 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {Array.from({ length: 12 }, (_, value) => (
                <option key={value} value={value}>
                  {value}
                  {value === defaultCapo ? " · default" : ""}
                </option>
              ))}
            </select>
          </label>
          {capo > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Mode capo">
              <button
                type="button"
                className={buttonClass}
                aria-pressed={capoMode === "shape"}
                onClick={() => onCapoMode("shape")}
              >
                Bentuk (shape)
              </button>
              <button
                type="button"
                className={buttonClass}
                aria-pressed={capoMode === "sounding"}
                onClick={() => onCapoMode("sounding")}
              >
                Nada terdengar (sounding)
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
