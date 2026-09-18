---
round: K0-0918-A
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/133
base: 1bcd39f
spec_bump: v1.K0-0918-A
req: [K0-BO-1, K0-BO-2, K0-BO-3, K0-BO-4, K0-BO-5, K0-BO-6]
ledger: [R031, R003, R004]
processes: [pr-detail-view, env-open-sse, my-checks, training-tab]
finished_at: 2026-09-18
---

# K0-0918-A · ✓✗ 판정 버튼 · 진행 로그 사람 문장 · 자동 Chrome + URL 링크 · 시크릿 안내 (BO · R031·R003·R004) 착지 리포트

**Kyu 원문 (2026-09-18)**: 4 항목 · 착지 조건 = **"프로덕션 PR#23 실 스샷에 [✓][✗] 버튼이 보이고 클릭 저장까지"**.

**base** = main@1bcd39f (K1-0918-A env-prepare 오케 머지 후).
**PR** = #133.
**착지 직전 origin/main 재병합** = 완결 · K1 파일 (env-prepare · ready payload base_url/home/port · 오디트 로그 3건) 편입 · 충돌 없음.

## 4 항목 소화

### BO-1 · [✓ 통과] [✗ 실패] 버튼 부재 뿌리 회수 (R031·R004)

**뿌리 확증** (G·D·K 3 라운드에서 '복원' 이 프로덕션 미노출 원인 규명):
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:1867` `my-checks` 절 render = `title + ok/ng` 텍스트만 · **✓✗ 버튼 부재**.
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:119` `checksFiles` (K0-0917-G · 2 신설 · 다중 파일 절 정본) = fetch 채워지지만 **렌더 미소비**.
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:470` `myDeviceItems = filter(device === currentDevice || 'any')` = 다른 기기 항목 (마일스톤·T0 절) **필터 아웃** (Kyu 실기 실측).

**정본 (K0-0918-A)**:
- `checkItemCaseId(title) = "check:<title.trim()>"` = 안정 case_id · 기존 `setCase` / `setNote` / `caseStates` (D1 저장 경로) 재사용.
- `{#each checksFiles as file}` + `{#each file.items as it}` = 모든 파일 절 · 모든 항목 렌더 (기기 필터 제거 · `[phone]/[tablet]/[desktop]/[any]` 태그 표기).
- 각 항목 = `[✓ 통과] [✗ 실패]` 세그먼트 + `<textarea>` 메모 + D1 audit line + `class:pass` / `class:fail` border.
- N/M 카운트 = `<span class="check-progress">({evaluatedChecksAll}/{totalChecksAll})</span>` · `$derived` 실시간.
- `checksFiles` 부재 (K0-0917-G 이전 폴백) = `checksItems` 통짜 렌더.

### BO-2 · 진행 로그 사람 문장 · "[]" 금지 (R031)

- `stageLabel(EnvStage)` = `idle→"대기 중" · clone→"워크트리 준비 중" · install→"설치 중" · migrate→"마이그레이션 중" · seed→"시드 데이터 준비 중" · start→"서버 시작 중" · health→"헬스 체크 중" · ready→"준비됨" · failed→"실패"`.
- **`progress` SSE 이벤트 정본 소비** (이전 미구현 · 데몬 emit 은 progress 로 step 전이 알림) · `label ?? message ?? stageLabel(stage)` 폴백.
- `.env-current-stage` = 사람 문장 헤더 (예: "설치 중…").
- 진행 띠 5 단계 = 설치 중 → 마이그레이션 중 → 시드 → 서버 시작 중 → 준비됨.
- envLogs render = `{stageLabel(l.stage)} · {l.message}` (개발자 `[stage]` 코드 폐기).
- `error` SSE 이벤트 = `{step, message}` 파싱 · `envError = "[<step>] <message>"` 원문 노출 (삼킴 금지 · Kyu 원문 정본).

### BO-3 · 준비됨 후 자동 Chrome + URL 링크 (R003)

- **데몬 실측 확증** = `tools/kyu-bridge/src/env.mjs:225·428` `openChromeCleanProfile(url, profileDir)` = **Chrome 새 프로필 창 자동 열림**. 이후 `sseSend(res, 'ready', { url, base_url, home, port, ... })` emit.
- **K1-0917-H · env.mjs:353·584** = ready payload 안 `base_url · home · port` 3 필드 편입 완료 (K0-0917-K 회부 반영). K0 폴백 (previewPort 로 localhost 조립) 은 이중 안전망 상주.
- **포털 정본 편입** = `envStage === 'ready'` 시 `.env-opened-url` 배너:
  - "✓ 데몬이 새 Chrome 창을 열었어요 · 안 열렸으면 이 링크로:" 안내 문장.
  - `<a href={envHomeUrl ?? envBaseUrl}>` 링크 노출 = 수동 복구 백업 경로.

### BO-4 · 시크릿/새 프로필 창 안내 (R003)

- **뿌리** = 이전 `envError = DAEMON_FAIL_MESSAGE + ' (브리지 토큰 미저장)'` = 개발자 말 · Kyu 에게 조치 방향 불명확.
- **정본 (Kyu 원문 정본)** = `envError = '평소 쓰는 Chrome 창에서 열어 주세요 · 시크릿/새 프로필 창은 브리지 토큰이 저장 안 됩니다 · 또는 [브리지 재설정]'`.
- 3 경로 통일 = `connectEnvOpen` · `startExpo` · `startTraining` (grep -c 3 hits · replace_all).

### BO-5 · Playwright 회귀 방지 (K0-0918-A 신 spec)

- **신 spec** = `e2e/portal-production-k0-0918-a.spec.ts` (4 tests):
  - `k0918a-1` = PR#23 진입 · `[data-testid="check-btn-pass"]` · `[data-testid="check-btn-fail"]` 각 ≥ 1 · pass count === fail count · 스샷 (Kyu 착지 조건 필수).
  - `k0918a-2` = 첫 [✓ 통과] 클릭 → 새로고침 → `data-status="pass"` 유지 확증 · D1 저장 왕복.
  - `k0918a-3` = `[data-testid="check-progress"]` 텍스트 `(N/M)` 형식 매치.
  - `k0918a-4` = [테스트 열기] 클릭 → `.env-current-stage` 사람 문장 · "[]" 시작 금지 어설션.

### BO-6 · 파일 경계

- **K0 소유 전량** · 이번 라운드 = **파일 경계 예외 없음**.

## 프로덕션 workflow 실행

- **Run ID** = `35304460965` (진행 중 · 완결 시점에 결과 편입)
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35304460965
- **결과** = CI 완결 후 편입.

## Kyu 맥 확증 스샷 회부

- **핵심 스샷 1** (착지 조건 정본): PR#23 상세 · 각 checks 항목마다 [✓ 통과] [✗ 실패] 버튼 노출.
- **핵심 스샷 2**: [✓] 클릭 후 D1 audit 노출 + 새로고침 후 상태 유지.
- **스샷 3**: N/M 카운트 헤더 (내가 확인할 것 · N건 (X/N)).
- **스샷 4**: 진행 로그 = "설치 중" 등 사람 문장 · "[install]" 개발자 코드 없음.
- **스샷 5**: 준비됨 후 새 Chrome 창 자동 열림 (localhost:4321/...) · 포털 화면에 링크 노출.
- **스샷 6**: 시크릿 창 진입 후 "평소 쓰는 Chrome 창에서 열어 주세요" 안내.

## 자기 검증

- `pnpm check` = 0 err · 89 warnings.
- `pnpm build` = adapter-cloudflare done.
- `pnpm test` = 81 files · 1050 tests pass · 0 fail.

## 파일 변경 요약

- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (BO-1 my-checks 재구성 · BO-2 stageLabel + progress SSE · BO-3 env-opened-url · BO-4 시크릿 안내)
- **A** `e2e/portal-production-k0-0918-a.spec.ts` (BO-5 · 4 tests)
- **M** `docs/spec/k0.md § K0-BO-1~6` (신설)
- **M** `docs/state/k0.md § K0-BO Active` (편입)
- **M** `docs/tracking/k0.md § K116` (신설)
