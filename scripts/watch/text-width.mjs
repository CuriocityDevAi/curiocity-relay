// scripts/watch/text-width.mjs  EAW(East Asian Width) 표시 폭 · pad · truncate
// 외부 의존성 없음. 한글·CJK·전각 기호(●■▲)·이모지 = 2칸, ANSI 코드 = 0칸.

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const _seg = new Intl.Segmenter();

/** ANSI 이스케이프 코드 제거. */
export function stripAnsi(s) {
  return String(s || '').replace(ANSI_RE, '');
}

/**
 * 단일 Unicode 코드 포인트의 터미널 표시 폭 (0, 1 or 2).
 * Wide/Fullwidth = 2, Ambiguous(한국 환경) 포함, 그 외 = 1.
 * Zero-width: ZWJ · VS(변형선택자) · 결합문자 · 피부색 수식어 = 0.
 */
function cpWidth(cp) {
  // ── zero-width ──────────────────────────────────────────────────────
  // 결합 발음 부호·오버레이 (combining diacriticals)
  if (cp >= 0x0300 && cp <= 0x036F) return 0;
  if (cp >= 0x1AB0 && cp <= 0x1AFF) return 0;
  if (cp >= 0x1DC0 && cp <= 0x1DFF) return 0;
  if (cp >= 0x20D0 && cp <= 0x20FF) return 0;
  // ZWJ U+200D
  if (cp === 0x200D) return 0;
  // 변형선택자 U+FE00–FE0F (VS-1 … VS-16, U+FE0F 포함)
  if (cp >= 0xFE00 && cp <= 0xFE0F) return 0;
  // Combining Half Marks U+FE20–FE2F
  if (cp >= 0xFE20 && cp <= 0xFE2F) return 0;
  // 피부색 수식어 (Fitzpatrick) U+1F3FB–1F3FF
  if (cp >= 0x1F3FB && cp <= 0x1F3FF) return 0;

  // ── fast path ───────────────────────────────────────────────────────
  if (cp < 0x1100) return 1; // ASCII + Latin

  if (cp <= 0x115F) return 2; // U+1100-115F: Hangul Jamo

  if (cp < 0x2026) return 1; // 1160-2025
  if (cp === 0x2026) return 2; // U+2026: … HORIZONTAL ELLIPSIS (전각)
  if (cp < 0x2329) return 1; // 2027-2328
  if (cp <= 0x232A) return 2; // U+2329-232A: Angle Brackets

  if (cp < 0x25A0) return 1; // 232B-259F (Box Drawing 등 1칸)
  if (cp <= 0x27BF) return 2; // U+25A0-27BF: Geometric Shapes + Dingbats (●■▲)

  if (cp < 0x2E80) return 1; // 27C0-2E7F
  if (cp <= 0x303E) return 2; // U+2E80-303E: CJK Radicals, Kangxi, CJK Symbols

  if (cp < 0x3041) return 1; // 303F
  if (cp <= 0x33FF) return 2; // U+3041-33FF: Hiragana · Katakana · Bopomofo · Hangul Compat · CJK Compat
  if (cp <= 0x4DBF) return 2; // U+3400-4DBF: CJK Extension A

  if (cp < 0x4E00) return 1; // 4DC0-4DFF
  if (cp <= 0xA4CF) return 2; // U+4E00-A4CF: CJK Unified + Yi

  if (cp < 0xA960) return 1;
  if (cp <= 0xA97F) return 2; // U+A960-A97F: Hangul Jamo Extended-A

  if (cp < 0xAC00) return 1;
  if (cp <= 0xD7AF) return 2; // U+AC00-D7AF: Hangul Syllables (한글)
  if (cp <= 0xD7FF) return 2; // U+D7B0-D7FF: Hangul Jamo Extended-B

  if (cp < 0xF900) return 1;
  if (cp <= 0xFAFF) return 2; // U+F900-FAFF: CJK Compatibility Ideographs

  if (cp < 0xFE10) return 1; // FB00-FE0F (FE00-FE0F already returned 0 above)
  if (cp <= 0xFE19) return 2; // U+FE10-FE19: Vertical Forms

  if (cp < 0xFE30) return 1; // FE1A-FE1F + FE20-FE2F (FE20-FE2F already returned 0)
  if (cp <= 0xFE6F) return 2; // U+FE30-FE6F: CJK Compat Forms + Small Variants

  if (cp < 0xFF01) return 1;
  if (cp <= 0xFF60) return 2; // U+FF01-FF60: Fullwidth ASCII

  if (cp < 0xFFE0) return 1;
  if (cp <= 0xFFE6) return 2; // U+FFE0-FFE6: Fullwidth Signs

  if (cp < 0x1F300) return 1;
  if (cp <= 0x1FAFF) return 2; // U+1F300-1FAFF: Emoji (1F3FB-1F3FF already returned 0)

  if (cp < 0x20000) return 1;
  if (cp <= 0x3134F) return 2; // U+20000-3134F: CJK Extension B-H

  return 1;
}

/**
 * 문자열의 터미널 표시 폭. ANSI 이스케이프 코드는 0칸으로 처리.
 * Intl.Segmenter 로 grapheme 단위 순회 → ZWJ 묶음·결합 문자를 1덩어리로 계산.
 */
export function displayWidth(s) {
  if (!s) return 0;
  const plain = stripAnsi(String(s));
  let w = 0;
  for (const { segment } of _seg.segment(plain)) {
    w += cpWidth(segment.codePointAt(0));
  }
  return w;
}

/**
 * 최대 표시 폭 maxCols 로 자르기. 초과 시 마지막을 "…" 로 대체.
 * Intl.Segmenter 로 grapheme 단위 순회 → 결합 문자·ZWJ 묶음 중간을 자르지 않음.
 * 순수 텍스트(ANSI 코드 없음) 대상.
 */
export function truncateWidth(s, maxCols) {
  if (!s) return '';
  if (maxCols <= 0) return '';

  const ellW = cpWidth(0x2026); // "…" 표시 폭 = 2
  const graphemes = [..._seg.segment(String(s))].map(g => g.segment);

  let w = 0;
  let overflow = false;
  const result = [];

  for (const g of graphemes) {
    const gw = cpWidth(g.codePointAt(0));
    if (w + gw <= maxCols) {
      result.push(g);
      w += gw;
    } else {
      overflow = true;
      break;
    }
  }

  if (overflow) {
    // "…" 를 넣을 공간 확보 (grapheme 단위로 팝)
    while (result.length && w + ellW > maxCols) {
      const last = result.pop();
      w -= cpWidth(last.codePointAt(0));
    }
    if (w + ellW <= maxCols) result.push('…');
  }

  return result.join('');
}

/**
 * 오른쪽 공백 채움 (표시 폭 기준).
 * ANSI 코드가 있는 문자열도 처리 (ANSI 길이를 별도 계산).
 */
export function padEndWidth(s, targetCols) {
  const w = displayWidth(s);
  if (w >= targetCols) return s;
  return s + ' '.repeat(targetCols - w);
}
