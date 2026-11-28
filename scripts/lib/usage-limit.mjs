// scripts/lib/usage-limit.mjs — M1-1128-E: 사용량 한도 화면 감지 순수 함수

export const USAGE_LIMIT_RE = /You'?ve hit your limit|\/rate-limit-options/i;
export const USAGE_LIMIT_RESETS_RE = /resets\s+([^\n\r]+)/i;

/**
 * pane 화면 텍스트에서 사용량 한도 화면을 감지.
 * @param {string} screen
 * @returns {{ resetsText: string } | null}
 */
export function detectUsageLimitInScreen(screen) {
  if (!screen || !USAGE_LIMIT_RE.test(screen)) return null;
  const m = USAGE_LIMIT_RESETS_RE.exec(screen);
  const resetsText = m ? m[1].replace(/\s+/g, ' ').trim() : '(unknown)';
  return { resetsText };
}
