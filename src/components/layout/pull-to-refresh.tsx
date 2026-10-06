"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;
const MAX_PULL = 112;

function insideVerticalScroller(target: Element) {
  let element: Element | null = target;
  while (element && element !== document.body) {
    const overflowY = getComputedStyle(element).overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      element.scrollHeight > element.clientHeight + 4
    ) {
      return true;
    }
    element = element.parentElement;
  }
  return false;
}

export function PullToRefresh() {
  const router = useRouter();
  const refreshPage = useRef(router.refresh);
  refreshPage.current = router.refresh;

  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [headerBottom, setHeaderBottom] = useState(64);

  const pullAmount = useRef(0);
  const refreshingNow = useRef(false);

  useEffect(() => {
    const mobile = window.matchMedia("(hover: none) and (pointer: coarse)");
    if (!mobile.matches) return;

    let startY = 0;
    let startX = 0;
    let tracking = false;
    let armed = false;

    const measureHeader = () => {
      const header = document.querySelector("header");
      setHeaderBottom(header ? Math.round(header.getBoundingClientRect().bottom) : 64);
    };
    measureHeader();

    const updatePull = (value: number) => {
      pullAmount.current = value;
      setPull(value);
    };

    const onStart = (event: TouchEvent) => {
      if (refreshingNow.current || event.touches.length !== 1) return;
      if (window.scrollY > 1) return;
      if (document.body.style.overflow === "hidden") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (insideVerticalScroller(target)) return;
      startY = event.touches[0].clientY;
      startX = event.touches[0].clientX;
      tracking = true;
      armed = false;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking || refreshingNow.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startY;
      const dx = touch.clientX - startX;

      if (!armed) {
        if (dy < 10 && Math.abs(dx) < 10) return;
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 1) {
          tracking = false;
          return;
        }
        armed = true;
        setDragging(true);
        measureHeader();
      }

      if (dy <= 0) {
        updatePull(0);
        return;
      }

      event.preventDefault();
      updatePull(Math.min(MAX_PULL, dy * 0.45));
    };

    const finish = () => {
      if (!tracking && !armed) return;
      tracking = false;
      setDragging(false);
      const shouldRefresh = armed && pullAmount.current >= THRESHOLD && !refreshingNow.current;
      armed = false;
      if (!shouldRefresh) {
        updatePull(0);
        return;
      }

      refreshingNow.current = true;
      setRefreshing(true);
      updatePull(THRESHOLD);
      refreshPage.current();
      window.setTimeout(() => {
        refreshingNow.current = false;
        setRefreshing(false);
        updatePull(0);
      }, 700);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", finish);
    document.addEventListener("touchcancel", finish);
    window.addEventListener("resize", measureHeader);
    document.documentElement.classList.add("kk-pull-refresh");

    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", finish);
      document.removeEventListener("touchcancel", finish);
      window.removeEventListener("resize", measureHeader);
      document.documentElement.classList.remove("kk-pull-refresh");
    };
  }, []);

  const visible = pull > 8 || refreshing;
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center"
      style={{ top: headerBottom + 8 }}
      data-pull-to-refresh={refreshing ? "refreshing" : "pulling"}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-emerald-600 shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-emerald-400"
        style={{
          transform: `translateY(${Math.max(0, pull - 28)}px) scale(${0.85 + Math.min(pull, THRESHOLD) / THRESHOLD / 6})`,
          opacity: Math.min(1, pull / 36),
          transition: dragging ? "none" : "transform 180ms ease, opacity 180ms ease",
        }}
      >
        <RefreshCw
          className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
          style={refreshing ? undefined : { transform: `rotate(${pull * 2.2}deg)` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
