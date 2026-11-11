// scripts/lib/cmux-hubs.mjs · M2-1105-AN
// Pure decision functions for cmux Hubs workspace management.

/**
 * Returns true when a cmux spawnSync result is non-authoritative
 * (timeout: status===null, or any other error). Used to detect UNKNOWN state.
 */
export function isCmuxUnknown(r) {
  return !r.ok;
}

/**
 * Parse `list-workspaces` stdout → [{ref, num}] for workspace name === hubsName.
 * Sorted by num ascending (oldest first).
 */
export function parseHubsWorkspaces(stdout, hubsName = 'Hubs') {
  const found = [];
  for (const line of String(stdout || '').split('\n')) {
    const stripped = line.replace(/^[*\s]+/, '').trim();
    const m = stripped.match(/^workspace:(\d+)\s+(.+?)(?:\s+\[[^\]]+\])?$/);
    if (!m) continue;
    const num = parseInt(m[1], 10);
    if (m[2].trim() === hubsName) found.push({ ref: `workspace:${num}`, num });
  }
  found.sort((a, b) => a.num - b.num);
  return found;
}

/**
 * Parse `list-workspaces` stdout → all workspace ref strings.
 */
export function parseWorkspaceRefs(stdout) {
  const refs = [];
  for (const line of String(stdout || '').split('\n')) {
    const m = line.match(/workspace:\d+/);
    if (m) refs.push(m[0]);
  }
  return refs;
}

/**
 * Classify a Hubs workspace based on its surfaces.
 * surfaces: [{surfaceRef, title, hub}] from inspecting the workspace tree.
 * Returns 'empty' | 'has-hub-pane' | 'unsure'.
 */
export function classifyHubsWorkspace(surfaces) {
  if (!surfaces || surfaces.length === 0) return 'empty';
  if (surfaces.some((s) => s.hub)) return 'has-hub-pane';
  return 'unsure';
}

/**
 * Returns true if workspace creation is allowed by the rate-limit window.
 * lastCreateAt: epoch ms of last creation attempt, or null/undefined.
 */
export function shouldAllowCreate({ lastCreateAt, now, windowMs = 10 * 60 * 1000 }) {
  if (lastCreateAt == null) return true;
  return now - lastCreateAt >= windowMs;
}

/**
 * Assess overall layout validity from cmux query outcomes.
 * When cmuxListOk is false (timeout/error), always returns 'unknown' — never 'invalid'.
 * Returns 'valid' | 'invalid' | 'unknown'.
 */
export function assessLayoutValidity({ cmuxListOk, workspaceFound, allPanesFound }) {
  if (!cmuxListOk) return 'unknown';
  if (!workspaceFound) return 'invalid';
  if (!allPanesFound) return 'invalid';
  return 'valid';
}

/**
 * After a new-workspace attempt (success OR timeout), determine which workspace
 * ref to adopt. Prefers the ref returned by new-workspace if it appears in the
 * re-queried list; otherwise picks the newest newly-appeared workspace.
 * Returns a ref string or null.
 */
export function pickCreatedWorkspace({ prevList, newList, createdRef }) {
  if (!newList || newList.length === 0) return null;
  if (createdRef) {
    const found = newList.find((w) => w.ref === createdRef);
    if (found) return found.ref;
  }
  const prevRefs = new Set((prevList || []).map((w) => w.ref));
  const newOnes = newList.filter((w) => !prevRefs.has(w.ref));
  if (newOnes.length > 0) return newOnes[0].ref;
  return newList[newList.length - 1].ref;
}
