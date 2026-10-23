"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface HintSelectItem {
  value: string;
  label: string;
  hint?: string;
  group?: string;
}

interface Row {
  kind: "group" | "option";
  groupLabel?: string;
  item?: HintSelectItem;
  index?: number;
}

export function HintSelect({
  items,
  value,
  onChange,
  placeholder = "Pilih…",
  id,
  className = "",
  ariaLabel,
}: {
  items: HintSelectItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;

  const selected = items.find((item) => item.value === value);

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    let lastGroup: string | undefined;
    items.forEach((item, index) => {
      if (item.group && item.group !== lastGroup) {
        result.push({ kind: "group", groupLabel: item.group });
        lastGroup = item.group;
      } else if (!item.group && lastGroup) {
        lastGroup = undefined;
      }
      result.push({ kind: "option", item, index });
    });
    return result;
  }, [items]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  useLayoutEffect(() => {
    if (!open) return;
    const tip = tooltipRef.current;
    if (!tip) return;
    const index = hoverIndex ?? activeIndex;
    const target = index >= 0 ? optionRefs.current[index] : null;
    if (!target) {
      tip.style.opacity = "0";
      return;
    }
    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = rect.right + 8;
    if (left + tipRect.width > window.innerWidth - 8) {
      left = Math.max(8, rect.left - tipRect.width - 8);
    }
    const maxTop = Math.max(8, window.innerHeight - tipRect.height - 8);
    const top = Math.min(Math.max(8, rect.top), maxTop);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.opacity = "1";
  }, [open, hoverIndex, activeIndex]);

  function openListbox() {
    const index = items.findIndex((item) => item.value === value);
    setActiveIndex(index >= 0 ? index : items.length > 0 ? 0 : -1);
    setHoverIndex(null);
    setOpen(true);
  }

  function closeListbox() {
    setOpen(false);
    setHoverIndex(null);
  }

  function choose(item: HintSelectItem) {
    onChange(item.value);
    closeListbox();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeListbox();
      }
      return;
    }
    if (event.key === "Tab") {
      closeListbox();
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openListbox();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(items.length > 0 ? 0 : -1);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = items[activeIndex];
      if (item) choose(item);
    }
  }

  const tooltipIndex = hoverIndex ?? activeIndex;
  const tooltipItem = open && tooltipIndex >= 0 ? items[tooltipIndex] : undefined;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => (open ? closeListbox() : openListbox())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
        }
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-left text-sm dark:border-zinc-700 dark:bg-zinc-900 ${
          selected ? "" : "text-zinc-500"
        }`}
      >
        <span className="min-w-0 truncate">
          {selected?.label ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <ul
            id={listboxId}
            role="listbox"
            className="max-h-72 overflow-y-auto py-1"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {rows.map((row) =>
              row.kind === "group" ? (
                <li
                  key={`g-${row.groupLabel}`}
                  role="presentation"
                  className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
                >
                  {row.groupLabel}
                </li>
              ) : (
                <li
                  key={`opt-${row.index}`}
                  ref={(el) => {
                    optionRefs.current[row.index as number] = el;
                  }}
                  id={`${listboxId}-opt-${row.index}`}
                  role="option"
                  aria-selected={row.item?.value === value}
                  onMouseEnter={() => setHoverIndex(row.index as number)}
                  onClick={() => row.item && choose(row.item)}
                  className={`flex cursor-pointer items-start justify-between gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    row.index === activeIndex ||
                    row.item?.value === value
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate">{row.item?.label}</p>
                    {row.item?.hint ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 lg:hidden">
                        {row.item.hint}
                      </p>
                    ) : null}
                  </div>
                  {row.item?.value === value ? (
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-zinc-500"
                    >
                      ✓
                    </span>
                  ) : null}
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}

      {tooltipItem?.hint ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="pointer-events-none fixed z-50 hidden w-72 rounded-lg border border-zinc-200 bg-white p-2 text-xs text-zinc-600 opacity-0 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 lg:block"
        >
          <span className="font-medium text-zinc-800 dark:text-zinc-100">
            {tooltipItem.label}
          </span>
          <span className="mt-0.5 block">{tooltipItem.hint}</span>
        </div>
      ) : null}
    </div>
  );
}
