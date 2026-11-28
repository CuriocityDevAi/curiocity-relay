// scripts/lib/usage-limit.mjs — M1-1128-F: resets_at ISO 변환 · AND 감지

const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

export const HIT_LIMIT_RE = /You'?ve hit your limit/i;
export const RATE_LIMIT_OPTIONS_RE = /\/rate-limit-options/;
// 첫 그룹: 날짜 문자열, 둘째 그룹(선택): 같은 캡처 내 다음 줄 "(Asia/Jakarta)" 형식 타임존
export const USAGE_LIMIT_RESETS_RE =
  /resets\s+([^\n\r]+)(?:[\r\n]+[ \t]*(\([A-Za-z]+\/[A-Za-z_\/]+\)))?/i;

function tzOffsetMs(timeZone, refDate) {
  try {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const parts = Object.fromEntries(
      f.formatToParts(refDate).filter(p => p.type !== 'literal').map(p => [p.type, p.value])
    );
    const h = +parts.hour % 24; // "24" → 0 방어
    const localEquiv = Date.UTC(+parts.year, +parts.month - 1, +parts.day, h, +parts.minute, +parts.second);
    return localEquiv - refDate.getTime(); // ms (양수 = UTC+)
  } catch {
    return 0;
  }
}

/**
 * "Nov 30 at 9am" + "(Asia/Jakarta)" → "2026-11-30T02:00:00.000Z"
 * 과거면 연도 +1 · 파싱 불가면 null.
 */
export function parseResetsAt(resetsText, tzString = '') {
  const dm = /(\w{3,9})\s+(\d{1,2})\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(resetsText);
  if (!dm) return null;

  const [, monthStr, dayStr, hourStr, minStr, ampm] = dm;
  const month = MONTHS[monthStr.toLowerCase().slice(0, 3)];
  if (month === undefined) return null;

  const day = parseInt(dayStr, 10);
  let hour = parseInt(hourStr, 10);
  const minute = minStr ? parseInt(minStr, 10) : 0;
  if (ampm) {
    if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
    if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
  }

  const tzMatch = /\(([A-Za-z]+\/[A-Za-z_\/]+)\)/.exec(tzString);
  const timezone = tzMatch ? tzMatch[1] : 'UTC';

  const now = Date.now();
  const baseYear = new Date(now).getUTCFullYear();

  for (let delta = 0; delta <= 1; delta++) {
    const year = baseYear + delta;
    const approxUTC = new Date(Date.UTC(year, month, day, hour, minute, 0));
    const utcMs = approxUTC.getTime() - tzOffsetMs(timezone, approxUTC);
    if (utcMs >= now) return new Date(utcMs).toISOString();
  }
  return null; // 2년 후도 과거라면 null (이론상 불가)
}

/**
 * pane 화면 텍스트에서 사용량 한도 화면을 감지.
 * 감지 조건: "You've hit your limit" 필수 + "/rate-limit-options" AND.
 * @param {string} screen
 * @returns {{ resetsText: string, resetsAt: string | null } | null}
 */
export function detectUsageLimitInScreen(screen) {
  if (!screen) return null;
  if (!HIT_LIMIT_RE.test(screen)) return null;
  if (!RATE_LIMIT_OPTIONS_RE.test(screen)) return null;

  const m = USAGE_LIMIT_RESETS_RE.exec(screen);
  const resetsText = m ? m[1].replace(/\s+/g, ' ').trim() : '(unknown)';
  const tzString = m?.[2] ?? '';
  const resetsAt = m ? parseResetsAt(resetsText, tzString) : null;

  return { resetsText, resetsAt };
}
