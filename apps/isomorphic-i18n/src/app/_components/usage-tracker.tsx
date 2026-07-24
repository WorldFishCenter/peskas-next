'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/trpc/react';
import { languages } from '../i18n/settings';

/**
 * How often to flush accumulated active time to the server. Active time is
 * accrued precisely on the client from timestamps, so this interval only bounds
 * how much recent time could be lost if the tab is hard-closed between flushes.
 */
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Upper bound on the active time attributed to a single flush. Normal deltas are
 * at most one heartbeat interval; anything much larger means timers were paused
 * (system sleep/suspend while the tab stayed "visible"), which is not real
 * active time, so we cap it rather than record the gap.
 */
const MAX_ACTIVE_MS_PER_FLUSH = 2 * HEARTBEAT_INTERVAL_MS;

const SESSION_ID_KEY = 'peskas.usageSession';

/**
 * Stable id for this browser tab, scoped to the user that owns it. Persists
 * across reloads within the tab (sessionStorage), but is regenerated when a
 * different user signs in on the same tab — otherwise a second user's heartbeats
 * would accumulate onto the first user's session document. Falls back to an
 * ephemeral id if storage is unavailable (e.g. some private-browsing modes).
 */
function getOrCreateSessionId(ownerKey: string): string {
  const generate = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const stored = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { owner?: string; id?: string };
      if (parsed?.id && parsed.owner === ownerKey) return parsed.id;
    }
    const id = generate();
    window.sessionStorage.setItem(
      SESSION_ID_KEY,
      JSON.stringify({ owner: ownerKey, id })
    );
    return id;
  } catch {
    return generate();
  }
}

/**
 * Strip a leading language segment (`/en/…`, `/sw/…`) so the same logical page
 * aggregates under one path regardless of UI language. Language is tracked
 * separately. `/en` → `/`, `/en/catch_composition` → `/catch_composition`.
 */
function normalizePath(rawPath: string): { path: string; language?: string } {
  const segments = rawPath.split('/').filter(Boolean);
  let language: string | undefined;
  if (segments.length && (languages as string[]).includes(segments[0])) {
    language = segments.shift();
  }
  return { path: '/' + segments.join('/'), language };
}

/**
 * Tracks authenticated app usage (access, time spent, and per-route activity)
 * by sending periodic heartbeats to `api.usage.heartbeat`. Mounted once in the
 * `[lang]` layout, next to UserAnalyticsTracker. Renders nothing.
 *
 * Time is only accrued while the tab is visible, so idle/background time is not
 * counted. Session end is inferred server-side from the last heartbeat.
 */
export default function UsageTracker() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const heartbeat = api.usage.heartbeat.useMutation();

  // Gate on authentication only (mirrors UserAnalyticsTracker). We intentionally
  // do NOT require session.user.id: it may be undefined depending on how the user
  // record was created, and userId is optional in the usage record anyway.
  const isAuthed = status === 'authenticated' && !!session?.user;

  // Identity that owns this tab's usage session, used to scope the sessionId so a
  // different user signing in on the same tab starts a fresh session.
  const ownerKey =
    session?.user?.email ?? session?.user?.id ?? session?.user?.name ?? 'anon';

  // Latest values read inside effects without retriggering them.
  const heartbeatRef = useRef(heartbeat);
  heartbeatRef.current = heartbeat;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const ownerKeyRef = useRef(ownerKey);
  ownerKeyRef.current = ownerKey;

  const sessionIdRef = useRef<string | null>(null);
  const currentPathRef = useRef<string | null>(null);
  // Timestamp (ms) when the current visible period began; null while hidden.
  const activeSinceRef = useRef<number | null>(null);
  // Active ms accrued for currentPath since the last flush.
  const pendingMsRef = useRef(0);
  const initializedRef = useRef(false);
  // Serializes heartbeats for this tab so concurrent sends can't race the
  // server-side upsert / per-route array update.
  const flushChainRef = useRef<Promise<unknown>>(Promise.resolve());

  const flush = useCallback((newView: boolean) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    // Roll the currently-open visible period into the pending total.
    if (activeSinceRef.current != null) {
      const now = Date.now();
      pendingMsRef.current += now - activeSinceRef.current;
      activeSinceRef.current = now;
    }

    // Cap so a sleep/suspend gap can't inflate active time (see constant).
    const activeMsDelta = Math.min(
      pendingMsRef.current,
      MAX_ACTIVE_MS_PER_FLUSH
    );
    pendingMsRef.current = 0;

    // Nothing worth reporting: no new navigation and no elapsed active time.
    if (!newView && activeMsDelta === 0) return;

    const raw = currentPathRef.current;
    const { path, language } = raw
      ? normalizePath(raw)
      : { path: undefined, language: undefined };

    const vars = {
      sessionId,
      path,
      activeMsDelta,
      newView,
      language,
      // Send the (unchanging) user agent only when a view is registered.
      userAgent:
        newView && typeof navigator !== 'undefined'
          ? navigator.userAgent
          : undefined,
    };

    // Chain onto the previous send so writes are ordered and never concurrent.
    // If a send fails, re-accrue its active time so it isn't silently lost.
    flushChainRef.current = flushChainRef.current
      .catch(() => {})
      .then(() => heartbeatRef.current.mutateAsync(vars))
      .catch(() => {
        pendingMsRef.current += activeMsDelta;
      });
  }, []);

  // Session lifecycle: init on authentication, tear down on logout/unmount.
  useEffect(() => {
    if (!isAuthed) return;

    sessionIdRef.current = getOrCreateSessionId(ownerKeyRef.current);
    currentPathRef.current = pathnameRef.current;
    activeSinceRef.current =
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible'
        ? Date.now()
        : null;
    pendingMsRef.current = 0;
    initializedRef.current = true;

    // Register the session start + first page view.
    flush(true);

    const interval = setInterval(() => flush(false), HEARTBEAT_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        activeSinceRef.current = Date.now();
      } else {
        flush(false);
        activeSinceRef.current = null;
      }
    };
    const handlePageHide = () => {
      flush(false);
      activeSinceRef.current = null;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      flush(false);
      initializedRef.current = false;
      activeSinceRef.current = null;
    };
  }, [isAuthed, flush]);

  // Route changes: attribute pending time to the previous path, then count the
  // new page view. The initial navigation is skipped (path already matches).
  useEffect(() => {
    if (!isAuthed || !initializedRef.current) return;
    if (currentPathRef.current === pathname) return;

    flush(false);
    currentPathRef.current = pathname;
    flush(true);
  }, [pathname, isAuthed, flush]);

  return null;
}
