"use client";

import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import {
  moveStageSection,
  nextActiveSection,
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
  const navRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const pendingTargetRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<number | null>(null);

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
        if (pendingTargetRef.current !== null) return;
        const header = document.querySelector<HTMLElement>(
          "[data-app-header]",
        );
        const activationLine = root
          ? root.getBoundingClientRect().top + 24
          : (header?.getBoundingClientRect().height ?? 72) + 16;
        const visibility = targets.map(({ index, target }) => ({
          index,
          isIntersecting:
            target.getBoundingClientRect().top <= activationLine,
        }));
        const atBottom = root
          ? root.scrollTop + root.clientHeight >= root.scrollHeight - 2
          : window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 2;
        const next =
          nextActiveSection({
            pendingTarget: pendingTargetRef.current,
            visibility,
            atBottom,
          }) ?? 0;
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
    const clearPending = () => {
      pendingTargetRef.current = null;
      if (pendingTimeoutRef.current !== null) {
        window.clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      scheduleUpdate();
    };
    scrollTarget.addEventListener("scrollend", clearPending);
    scrollTarget.addEventListener("wheel", clearPending, { passive: true });
    scrollTarget.addEventListener("touchstart", clearPending, { passive: true });
    scheduleUpdate();

    return () => {
      observer.disconnect();
      scrollTarget.removeEventListener("scroll", scheduleUpdate);
      scrollTarget.removeEventListener("scrollend", clearPending);
      scrollTarget.removeEventListener("wheel", clearPending);
      scrollTarget.removeEventListener("touchstart", clearPending);
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
    const activeButton = navRef.current?.querySelector<HTMLButtonElement>(
      'button[aria-pressed="true"]',
    );
    const strip = stripRef.current;
    if (activeButton && strip) {
      const stripRect = strip.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      if (buttonRect.left < stripRect.left || buttonRect.right > stripRect.right) {
        strip.scrollLeft +=
          buttonRect.left -
          stripRect.left -
          (stripRect.width - buttonRect.width) / 2;
      }
    }
  }, [activeIndex, sections, targetIdPrefix]);

  function jumpTo(index: number) {
    const next = Math.min(sections.length - 1, Math.max(0, index));
    const target = document.getElementById(`${targetIdPrefix}-${next}`);
    if (!target) return;
    pendingTargetRef.current = next;
    if (pendingTimeoutRef.current !== null) {
      window.clearTimeout(pendingTimeoutRef.current);
    }
    pendingTimeoutRef.current = window.setTimeout(() => {
      pendingTargetRef.current = null;
      pendingTimeoutRef.current = null;
    }, 1000);
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
      ref={navRef}
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
          className="chart-toggle min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-lg font-semibold"
          aria-label="Bagian sebelumnya"
          onClick={() =>
            jumpTo(moveStageSection(activeIndexRef.current, -1, sections.length))
          }
          disabled={activeIndex === 0}
        >
          ‹
        </button>
        <div ref={stripRef} className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
          {sections.map((section) => (
            <button
              key={`${section.index}-${section.label}`}
              type="button"
              aria-pressed={activeIndex === section.index}
              aria-label={`Pilih bagian ${section.index + 1}: ${section.label}`}
              className="chart-toggle flex min-h-11 max-w-36 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-medium"
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
          className="chart-toggle min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-lg font-semibold"
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
