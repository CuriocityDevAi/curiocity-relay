// scripts/lib/usage-limit.mjs — M1-1128-F: resets_at ISO 변환 · AND 감지 조건

const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };

export const USAGE_LIMIT_HIT_RE = /You'?ve hit your limit/i;
export const USAGE_LIMIT_MENU_RE = /\/rate-limit-options/i;
// resets text: 1줄 + 선택적으로 다음 줄 "(Asia/Jakarta)" 형식
const USAGE_LIMIT_RESETS_RE = /resets\s+([^\n\r]+(?:\n[^\n\r]*\([^)]+\))?)/i;

function getIanaOffsetStr(tz, refDate) {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(refDate);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (!tzPart) return null;
    const v = tzPart.value.replace('GMT', '');
    return v || '+00:00';
  } catch { return null; }
}

/**
 * "Nov 30 at 9am (Asia/Jakarta)" → ISO 문자열 (or null).
 * nowMs: 기준 시각(ms). 이미 경과했으면 다음 해로 추론.
 */
export function parseResetsIso(resetsText, nowMs = Date.now()) {
  if (!resetsText) return null;
  const norm = resetsText.replace(/\s+/g, ' ').trim();
  const m = /^([A-Za-z]{3})\s+(\d{1,2})\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?:\s*\(([^)]+)\))?/i.exec(norm);
  if (!m) return null;
  const [, mon, dayStr, h12Str, minStr, ampm, tz = 'UTC'] = m;
  const monthIdx = MONTHS[mon.toLowerCase()];
  if (!monthIdx) return null;
  let h = parseInt(h12Str, 10);
  if (ampm.toLowerCase() === 'pm' && h !== 12) h += 12;
  if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
  const min = parseInt(minStr || '0', 10);
  const day = parseInt(dayStr, 10);
  let year = new Date(nowMs).getFullYear();

  function tryYear(y) {
    const refDate = new Date(Date.UTC(y, monthIdx - 1, day));
    const offsetStr = getIanaOffsetStr(tz, refDate);
    if (offsetStr === null) return null;
    const pad2 = n => String(n).padStart(2, '0');
    const isoStr = `${y}-${pad2(monthIdx)}-${pad2(day)}T${pad2(h)}:${pad2(min)}:00${offsetStr}`;
    const ms = Date.parse(isoStr);
    return isNaN(ms) ? null : ms;
  }

  let ms = tryYear(year);
  if (ms === null) return null;
  if (ms <= nowMs) {
    const nextMs = tryYear(year + 1);
    if (nextMs === null) return null;
    ms = nextMs;
  }
  return new Date(ms).toISOString();
}

/**
 * pane 화면 텍스트에서 사용량 한도 화면을 감지.
 * 감지 조건: "You've hit your limit" 필수 AND "/rate-limit-options" 필수.
 * @param {string} screen
 * @returns {{ resetsText: string, resetsAt: string|null } | null}
 */
export function detectUsageLimitInScreen(screen) {
  if (!screen) return null;
  if (!USAGE_LIMIT_HIT_RE.test(screen)) return null;
  if (!USAGE_LIMIT_MENU_RE.test(screen)) return null;
  const m = USAGE_LIMIT_RESETS_RE.exec(screen);
  const resetsText = m ? m[1].replace(/\s+/g, ' ').trim() : '(unknown)';
  const resetsAt = parseResetsIso(resetsText);
  if (resetsAt === null) console.warn(`[usage-limit] resets_at 파싱 실패 — 수동 해제 필요 · text="${resetsText}"`);
  return { resetsText, resetsAt };
}
