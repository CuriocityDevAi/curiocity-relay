---
round: K0-0917-I
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/126
base: c86c1b5
spec_bump: v1.K0-0917-I
req: [K0-BL-1, K0-BL-2, K0-BL-3]
ledger: [R003]
processes: [pr-detail-view, env-open-sse, common-utils]
finished_at: 2026-09-17
---

# K0-0917-I · 딥링크 조립 정본 + 데몬 /open 경유 (BL · R003) 착지 리포트

**Kyu 원문 (2026-09-17)**: "R003 · 테스트 열기 마지막 단계 · 딥링크 주소 오조립".

**base** = main@c86c1b5 (K0-0917-H 오케 머지 후).
**PR** = #126.
**착지 직전 origin/main 재병합** = 완결 (K1 파일 3개 병합).

## 3 항목 소화

### BL-1 · 딥링크 URL 조립 정본

- **뿌리 파일:줄** = `src/routes/pr/[owner]/[repo]/[id]/+page.svelte:325~329` `startTraining` · 이전 `window.open(envHomeUrl, '_blank')` = 데몬 완주 URL 그대로 소비 · 포털 origin 붙일 위험.
- **정본** = `src/lib/deep-link.ts` `assembleDeepLink({ base_url, deep_link, autologin })`:
  - 절대 URL (http/https) = 그대로 · autologin 쿼리 병합.
  - 상대 경로 = `base_url + deep_link` · autologin 쿼리 병합 · leading/trailing slash 정합.
  - base_url 부재 + 상대 = **"서버 주소를 못 받았어요"** 문장 · 열지 않음.
- SSE `ready` 이벤트 = `{ base_url?, home?, autologin_query? }` 3 필드 소비 · `envBaseUrl` / `envHomeUrl` / `envAutologinParams` state.

### BL-2 · 데몬 /open 경유

- **정본** = `POST http://127.0.0.1:9876/open?token=<x> { url }` (K1 계약 · 캐시 0 · 새 Chrome 프로필).
- 데몬 미도달 / 토큰 부재 = `window.open(url, '_blank')` 폴백.

### BL-3 · 계약 테스트 export

- `assembleDeepLink` · `mergeQuery` **named export** (K1 contract-portal import 대상).
- `src/lib/deep-link.test.ts` = **11 tests pass**:
  - 상대 · 절대 · leading slash · trailing slash · autologin 병합 · 기존 쿼리 병합 · base_url 부재 상대 · base_url 부재 절대 · deep_link 부재 · 중복 키 · hash fragment.

## 프로덕션 workflow 실행

- **Run ID** = `35194461183`
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35194461183
- **결과** = **7 tests · 7 pass · 0 fail · 0 skip · 26.9s**

## Kyu 맥 확증 스샷 회부

- **후속 확증** = Kyu 맥 실 Chrome 에서 PR#23 접근 → [테스트 열기] → SSE ready 이벤트 확인 → base_url + deep_link 조립 → 데몬 /open 경유 → `http://localhost:4321/payroll/run?...` 오픈 확증.
- **로컬 실행** = daemon + K1 계약 필요 · Kyu 세션 회부.

## 자기 검증

- `pnpm check` = 0 err · 88 warnings.
- `pnpm build` = adapter-cloudflare done.
- `deep-link.test.ts` = 11 pass.
- Playwright chromium-phone = **37 pass · 25 skip · 0 fail**.

## 파일 변경 요약

- **A** `src/lib/deep-link.ts` (BL-1 · 순수 함수 · K1 contract-portal export)
- **A** `src/lib/deep-link.test.ts` (BL-3 · 11 tests)
- **M** `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (BL-1 SSE ready 3 필드 · BL-2 startTraining 재편)
- **M** `docs/spec/k0.md § K0-BL-1~3`
- **M** `docs/state/k0.md · docs/tracking/k0.md § K113`
