---
round: K0-0917-F
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/121
base: 2a3a3ca
spec_bump: v1.K0-0917-F
req: [K0-BI-1, K0-BI-2, K0-BI-3, K0-BI-4]
ledger: [R003, R031]
processes: [pr-detail-view, env-open-sse, expo-tunnel, common-utils]
finished_at: 2026-09-17
---

# K0-0917-F · 데몬 SSE 배선 정정 + 헬스 점 (BI · R003 · R031) 착지 리포트

**Kyu 원문 (2026-09-17)**: "PR 상세 [테스트 열기] SSE 배선 정정 · 브라우저 → 데몬 직접 · 헬스 점 · 전수 점검".

**base** = main@2a3a3ca (K0-0917-E 오케 머지 후).
**PR** = #121.
**착지 직전 origin/main 재병합** = fast-forward (K1 파일 3개 병합).

## 원장 대사

| R-id | 상태 | 이 라운드 |
|---|---|---|
| **R003** | 진행 중 (마일스톤 막힘) | 데몬 직접 배선 정정 · 헬스 점 · 사용자 말 문구 · Expo/close 전수 점검 |
| **R031** | 진행 중 | 09-17 실기 결함 뿌리 (Worker /api/env/open 404) 회수 |

## 4 항목 소화

### BI-1 · SSE 배선 정정

- **폐지** = `GET /api/env/open?repo&pr_id` (포털 Worker · 404).
- **정본** = 브라우저 → 데몬 직접 `http://127.0.0.1:9876/env/open` (K1 계약 · docs/env-recipes.md · tools/kyu-bridge/README).
- **인증** = EventSource 헤더 불가 → K1 계약대로 `?token=` 쿼리.
- **토큰 저장** = `localStorage[test-portal:kyu-bridge:token:v1]` · 재사용 · 미저장 시 `[브리지 재설정]` 유도.
- `DAEMON_BASE = 'http://127.0.0.1:9876'` 상수 · `getBridgeToken()` 헬퍼.

### BI-2 · 실패 문구 정정 + [브리지 재설정]

- **폐지** = "SSE 연결 실패 · K1 /env/open endpoint 확인 필요" (개발자 말).
- **정본** = `DAEMON_FAIL_MESSAGE` = **"내 맥의 실행 도우미에 연결 못 했어요 · 도우미가 켜져 있는지·토큰이 맞는지 확인"** (Kyu 원문).
- `[브리지 재설정]` 버튼 인라인 (`data-testid="btn-reset-bridge"`) · `resetBridge()` = localStorage 삭제 + `window.prompt()` 재입력 (tools/kyu-bridge/README plist EnvironmentVariables.BRIDGE_TOKEN 안내).

### BI-3 · 헤더 데몬 헬스 점

- `GET http://127.0.0.1:9876/health?token=...` · **60s 폴링** (setInterval · onMount).
- `daemonHealthy: boolean | null` · null = 미확인 · true = 초록 · false = 빨강.
- **마지막 응답 N초 전** = `daemonLastCheckMs` 기반 `healthAgoText()` (`data-testid="daemon-ago"`).
- 헤더 sticky 안 `.daemon-health` 배지 (`data-testid="daemon-health"` · `data-status="ok|fail|unknown"`).

### BI-4 · 전수 점검 (Expo · env-close)

- **[폰에서 열기]** `startExpo()` = `POST http://127.0.0.1:9876/expo/start` (Bearer 헤더) · fetch (SSE 아님) · 동일 문구 정본.
- **[환경 종료]** `closeEnv()` 신설 = `POST http://127.0.0.1:9876/env/close?token=...` · 동일 문구 정본.
- 모두 브라우저 → 데몬 직접 · Worker 프록시 폐기.

## 프로덕션 workflow 실행

- **Run ID** = `35189459663`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35189459663
- **결과** = **7 tests · 7 pass · 0 fail · 0 skip · 29.1s**

## Kyu 맥 4단계 완주 스샷 확증

- **후속 확증** = Kyu 맥에서 실 Chrome 열고 `test.curiocity.company/pr/<owner>/<repo>/<pr>` 접근 → [테스트 열기] 클릭 → 브리지 토큰 저장/미저장 시 [브리지 재설정] → 4단계 진행 로그 (install·migrate·seed·start) 확인 → K1 데몬 로그 대조.
- **로컬 실행** = daemon 실행 필요 (`tools/kyu-bridge` bin) · CI workflow 는 daemon 없어 skip 판정 (로컬 실 확증 = Kyu 세션).

## 자기 검증

- `pnpm check` = 1064 files · 0 err · 88 warnings.
- `pnpm build` = adapter-cloudflare done.
- Playwright chromium-phone = **37 pass · 25 skip · 0 fail**.

## 파일 변경 요약

- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (BI-1 SSE 재편 · BI-2 문구 + [브리지 재설정] · BI-3 헬스 폴링 + 배지 · BI-4 Expo + closeEnv 정정)
- **M** `docs/spec/k0.md § K0-BI-1~4`
- **M** `docs/state/k0.md · docs/tracking/k0.md § K110`
