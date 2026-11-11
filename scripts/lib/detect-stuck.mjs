const PROGRESS_MARKERS_RE = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]|esc to interrupt|tokens?:/i;

export function hasProgressMarkers(screen) {
  return PROGRESS_MARKERS_RE.test(screen);
}

export function evaluateIdleNoLanding({
  paneState,
  currentScreen,
  history,
  now,
  minUnchangedMs = 5 * 60_000,
}) {
  if (paneState !== 'shell') return { result: false, history: null };
  if (!currentScreen) return { result: false, history: null };

  const unchanged = history !== null && history !== undefined && history.screen === currentScreen;
  const nextHistory = unchanged ? history : { screen: currentScreen, firstSeenAt: now };

  if (!unchanged) return { result: false, history: nextHistory };
  if (now - history.firstSeenAt < minUnchangedMs) return { result: false, history: nextHistory };
  if (hasProgressMarkers(currentScreen)) return { result: false, history: nextHistory };

  return { result: true, history: nextHistory };
}
