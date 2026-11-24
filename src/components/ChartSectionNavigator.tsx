"use client";

import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import {
  activeSectionFromVisibility,
  moveStageSection,
  type StageSection,
} from "@/lib/chart-stage";

export function ChartSectionNavigator({
  sections,
  targetIdPrefix,
  scrollRootRef,
  activeIndexRef,
  reducedMotion,
  stage = false,
}: {
  sections: readonly StageSection[];
  targetIdPrefix: "chart-section" | "stage-section";
  scrollRootRef?: RefObject<HTMLDivElement | null>;
  activeIndexRef: MutableRefObject<number>;
  reducedMotion: boolean;
  stage?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const root = scrollRootRef?.current ?? null;
    const targets = sections.flatMap((section) => {
      const target = document.getElementById(
        `${targetIdPrefix}-${section.index}`,
      );
      return target ? [{ index: section.index, target }] : [];
    });
    const scheduleUpdate = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        const header = document.querySelector<HTMLElement>(
          "[data-app-header]",
        );
        const activationLine = root
          ? root.getBoundingClientRect().top + 24
          : (header?.getBoundingClientRect().height ?? 72) + 16;
        const next =
          activeSectionFromVisibility(
            targets.map(({ index, target }) => ({
              index,
              isIntersecting:
                target.getBoundingClientRect().top <= activationLine,
            })),
          ) ?? 0;
        activeIndexRef.current = next;
        setActiveIndex((current) => (current === next ? current : next));
      });
    };
    const observer = new IntersectionObserver(scheduleUpdate, {
      root,
      rootMargin: stage ? "-24px 0px -65% 0px" : "-80px 0px -130px 0px",
      threshold: 0,
    });
    for (const { target } of targets) observer.observe(target);
    const scrollTarget: HTMLElement | Window = root ?? window;
    scrollTarget.addEventListener("scroll", scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener("scroll", scheduleUpdate);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [
    activeIndexRef,
    scrollRootRef,
    sections,
    stage,
    targetIdPrefix,
  ]);

  useEffect(() => {
    for (const section of sections) {
      const target = document.getElementById(
        `${targetIdPrefix}-${section.index}`,
      );
      if (!target) continue;
      if (section.index === activeIndex) {
        target.setAttribute("data-chart-section-active", "true");
      } else {
        target.removeAttribute("data-chart-section-active");
      }
    }
  }, [activeIndex, sections, targetIdPrefix]);

  function jumpTo(index: number) {
    const next = Math.min(sections.length - 1, Math.max(0, index));
    const target = document.getElementById(`${targetIdPrefix}-${next}`);
    if (!target) return;
    activeIndexRef.current = next;
    setActiveIndex(next);
    target.scrollIntoView({
      block: "start",
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  if (sections.length === 0) return null;

  return (
    <nav
      data-chart-section-nav=""
      aria-label="Pilih bagian lagu"
      className={`${
        stage
          ? "chart-section-nav shrink-0 border-t border-zinc-500/30"
          : "chart-section-nav fixed inset-x-0 bottom-0 z-[60] border-t shadow-lg backdrop-blur"
      } px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]`}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <button
          type="button"
          className="min-h-11 min-w-11 shrink-0 rounded-lg border border-zinc-300 px-2 text-lg font-semibold dark:border-zinc-700"
          aria-label="Bagian sebelumnya"
          onClick={() =>
            jumpTo(moveStageSection(activeIndexRef.current, -1, sections.length))
          }
          disabled={activeIndex === 0}
        >
          ‹
        </button>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
          {sections.map((section) => (
            <button
              key={`${section.index}-${section.label}`}
              type="button"
              aria-pressed={activeIndex === section.index}
              aria-label={`Pilih bagian ${section.index + 1}: ${section.label}`}
              className={`flex min-h-11 max-w-36 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-medium ${
                activeIndex === section.index
                  ? "bg-sky-700 text-white"
                  : "border border-zinc-300 bg-transparent dark:border-zinc-700"
              }`}
              onClick={() => jumpTo(section.index)}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  activeIndex === section.index ? "bg-white" : "bg-sky-600"
                }`}
                aria-hidden="true"
              />
              <span className="truncate">
                {section.index + 1}. {section.label}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="min-h-11 min-w-11 shrink-0 rounded-lg border border-zinc-300 px-2 text-lg font-semibold dark:border-zinc-700"
          aria-label="Bagian berikutnya"
          onClick={() =>
            jumpTo(moveStageSection(activeIndexRef.current, 1, sections.length))
          }
          disabled={activeIndex >= sections.length - 1}
        >
          ›
        </button>
      </div>
    </nav>
  );
}
