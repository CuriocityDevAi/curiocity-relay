const KNOWN_MODELS = new Set(['opus', 'sonnet', 'haiku']);

export function parseModelLine(text) {
  const lines = text.split('\n').slice(0, 10);
  for (const line of lines) {
    const m = line.match(/^\s*(?:모델|model)\s*[:：]\s*(\S+)/iu);
    if (!m) continue;
    const val = m[1].toLowerCase();
    if (KNOWN_MODELS.has(val)) return val;
    console.error(`[parseModelLine] 알 수 없는 모델 값 "${m[1]}" · 기본값 사용`);
  }
  return null;
}
