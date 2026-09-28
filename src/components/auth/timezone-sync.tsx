"use client";

import { useEffect, useRef } from "react";
import { detectBrowserTimeZone } from "@/lib/events/timezone";

/**
 * The bot has no way to know where an organizer is, so the web app reports the
 * browser's zone once per session and event creation over Telegram reuses it.
 */
export function TimezoneSync() {
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;

    const timezone = detectBrowserTimeZone();

    const sync = async () => {
      const me = await fetch("/api/auth/me", { credentials: "include" });
      if (!me.ok) return;

      const data = (await me.json()) as { user?: { timezone?: string | null } };
      if (data.user?.timezone === timezone) return;

      await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ timezone }),
      });
    };

    void sync().catch(() => {});
  }, []);

  return null;
}
