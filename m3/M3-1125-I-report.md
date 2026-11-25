PASS

## M3-1125-I — vitest 실패 0 대응

**PR:** https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/260  
**브랜치:** `feat/M3-1125-I-fix-failing-tests` (base: master 1d24314)

---

## 파일별 분류 표

| 파일 | 분류 | 원인 | 처리 |
|------|------|------|------|
| `__tests__/m0-1121-a-logo-print.test.ts` | **(b)** | upng-js 환경 미설치 — package.json `dependencies` 에 `upng-js ^2.1.0` 존재, npm install 필요 | 현재 master 에서 통과. 추가 조치 없음 |
| `__tests__/m2-1123-e-receipt-queue-num.test.ts` | **(b)** | 환경 문제 — 소스/테스트 모두 f3decf5 에 존재하나 R0-1125-P runner 환경에서 모듈 해상도 불일치 추정 | 현재 master 에서 통과 |
| `__tests__/m3-1117-g.test.ts` | **(b)** | 환경 문제 (동일) | 현재 master 에서 통과 |
| `__tests__/m3-1117-u.test.ts` | **(b)** | 환경 문제 (동일) | 현재 master 에서 통과 |
| `tests/flows/screen-calcs.test.ts` | **(b)** | 환경 문제 (동일) | 현재 master 에서 통과 |
| `__tests__/m2-1119-s-pos-slip-fixes.test.ts` (2 cases) | **(a)** | stale: Next customer 버튼 헤더 배치(M2-1120-B) 기대 → M0-1123-E/M1-1124-B 로 하단 고정 바 이동 | M2-1125-G (#256) 에서 갱신 완료 |
| `__tests__/m3-1119-o-cd-emit.test.ts` (1 case) | **(a)** | stale: `revertDisplayToPaid` order_id 기대 → M1-1124-B 에서 `useAskPhoneOnDisplay` 로 교체 | M2-1125-G (#256) 에서 갱신 완료 |

---

## vitest 전후 요약

| 시점 | Test Files | Tests |
|------|------------|-------|
| before (f3decf5, R0-1125-P) | 7 failed / 67 passed | — |
| after (master 1d24314 + this PR) | **79 passed** | 1011 passed / 6 expected fail / 3 todo |

---

## 이 PR 에서 한 작업

**`vitest.config.ts`** 2건 수정:

1. `.claude/**` 를 `exclude` 에 추가  
   → 에이전트 worktree (`.claude/worktrees/*`) 안에 stale 버전 테스트 파일이 있을 때 main repo 에서 `vitest run` 을 실행하면 그 파일들도 스캔돼 오탐 실패가 발생한다.  
   b 분류 환경 문제의 근본 원인 중 하나로 추정.

2. 중복 `define` 키 제거 (esbuild `duplicate-object-key` 경고 해소)

---

## (c) 미구현 요구 원문 목록

**없음.** 7건 모두 (a)/(b) 처리 완료. it.todo 전환 없음.

---

## CI 커버리지 갭 (보고 · 추가는 별도)

`__tests__/` 디렉터리가 CI 에 포함되지 않음.

- `assertions` job: `node scripts/run-all.mjs assertions` → `*-assertions.mjs` 스크립트 전용
- `flow-tests` job: `npm run test:flows` = `vitest run tests/flows/` → `tests/flows/` 만 커버
- `playwright` job: Playwright e2e 전용

**`__tests__/` 는 어느 CI job 에도 없다.**  
7건 중 5건 (m0-1121-a, m2-1123-e, m3-1117-g, m3-1117-u, screen-calcs) 이 CI 에서 greencheck 를 받으면서도 실제로는 실패 상태였던 이유가 여기에 있음.  
`__tests__/` 를 커버하는 CI job 추가 필요 — 별도 태스크로 발부 요망.

---

## qrcode 모듈 경로 이슈 (보조 조사)

`m3-1124-n-custom-display-id-priority.test.ts` 의 worktree qrcode 실패 문제 — 이 worktree 에서는 재현되지 않음. `npm install` 후 정상 통과.

---

## 셀프 머지 금지

PR #260 셀프 머지 하지 않음.
