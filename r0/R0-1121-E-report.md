#223 APPROVE · 제품 코드 0 O · playwright 실행 O

## 체크 결과

### 1. `scripts/m3-1105-aa-assertions.mjs` — regex `<View\s+style=`

✅ **원래 의도 유지** — `flexDirection: 'row'` + `flexWrap: 'wrap'` + `testID="success-actions-secondary"` 세 조건 모두 그대로. `\s+` 변경은 `<View` 와 `style=` 사이 공백 처리만 느슨하게 한 것이며, 실제 layout 검사(row+wrap 한 줄)는 손대지 않음. Prettier 멀티라인 포맷 대응이므로 회귀 놓침 위험 없음.

### 2. `__tests__/m1-1117-e-slip-flow.test.ts` — 반환형 맞춤

✅ **수정 방향 정확** — `SplitQrisFirstPayload | null` 반환에 맞게 `toBe(true)` → `not.toBeNull()`, `toBe(false)` → `toBeNull()` 로 교체. 테스트 목적이 **1차/2차 신호 독립성** 확인이므로 payload 존재 여부만 검사하는 것은 범위 내.

⚠️ **선택적 권고** — 향후 payload 내용 테스트 강화 시 `expect(consumeSplitQrisFirstDone()?.orderId).toBeDefined()` 형태로 최소 1 필드 추가를 권고. `SplitQrisFirstPayload` 구조 변경을 조기 감지 가능. 이번 PR 블로커 아님.

### 3. `vitest.config.ts` — `docs/**` exclude

✅ **놓치는 테스트 0** — `docs/` 에는 `.md`, `.png`, `playwright-splitview.config.ts`, `splitview-capture.spec.ts`(Playwright 파일) 만 존재하며, vitest-compatible `.test.ts` 파일 없음 직접 확인. `splitview-capture.spec.ts`는 vitest 기본 include 패턴(`**/*.spec.ts`)에 포함되어 오탐되던 파일이므로 exclude 추가가 올바름.

### 4. 앱 화면/로직 변경 · CI 상태

✅ **제품 코드 변경 0** — 변경 파일 3개 전부 테스트/설정(`__tests__/`, `scripts/`, `vitest.config.ts`).

✅ **assertions 실행됨** — CI `assertions` job: `node scripts/run-all.mjs assertions` (unconditional). 로컬 32/32 확인.

✅ **playwright 실행됨** — CI `playwright` job: `node scripts/run-all.mjs playwright` (needs: route, assertions · `if:` 조건 없음). 실제 CI 결과는 GitHub API 권한(403)으로 직접 확인 불가 — PR 머지 전 CI 녹색 대기 권고.
