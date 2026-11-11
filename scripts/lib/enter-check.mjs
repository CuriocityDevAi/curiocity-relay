// scripts/lib/enter-check.mjs — REQ(a) Enter 누락 재전송 · REQ(b) 네트워크/API 오류 복구 순수 함수

const SESSION_STARTED_RE =
  /(❯|⏵⏵|⏺|✻|Deliberating…|esc to interrupt|bypass permissions|shift\+tab to cycle)/;

export function hasSessionStarted(screen) {
  if (!screen) return false;
  return SESSION_STARTED_RE.test(screen);
}

const API_ERROR_TAIL_RE = /api.?error|api error|connection|could not resolve/i;

export function hasApiErrorInTail(screen, tailLines = 5) {
  if (!screen) return false;
  const lines = screen.split('\n').filter((l) => l.trim());
  const tail = lines.slice(-tailLines);
  return tail.some((l) => API_ERROR_TAIL_RE.test(l));
}

export function shouldSendEnterRetry({ sessionStarted, retriesSent, maxRetries = 2 }) {
  if (sessionStarted) return false;
  if (retriesSent >= maxRetries) return false;
  return true;
}

export function shouldSendContinue({
  apiErrorInTail,
  retriesSent,
  maxRetries = 2,
  firstSeenAt,
  now,
  cooldownMs = 60_000,
}) {
  if (!apiErrorInTail) return false;
  if (retriesSent >= maxRetries) return false;
  if (firstSeenAt === null || firstSeenAt === undefined) return false;
  return now - firstSeenAt >= cooldownMs;
}
