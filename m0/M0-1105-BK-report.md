# M0-1105-BK — QRIS 테스트 모드 "Simulate payment" 서버 + 앱 (완료 보고)

**일시**: 2026-11-13 KST
**실행자**: Claude Opus 4.7 (Claude Code)
**상태**: PR 2개 open · 새 CI run 중 (storeport 4/5 pass · pos-integration 진행중)

---

## 1. PR 2개

- **storeport**: https://github.com/CuriocityDevAi/storeport/pull/236
  - base: `main` · head: `feat/m0-1105-bk-qris-simulate`
  - 의존: PR #233 (feat/m1-1105-bj-xendit-admin · `resolveXenditCreds`) — 머지 순서 중요.
- **fork**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/119
  - base: `master` · head: `feat/m0-1105-bk-qris-simulate`

## 2. 변경 파일

### storeport (6 files)
- `apps/commerce-core/src/modules/payment_xendit/lib/xendit-client.ts` — `simulatePayment(id, amount)` 추가 (POST /v3/payment_requests/{id}/simulate · api-version 2024-11-11 · 응답 whitelist)
- `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-simulate/route.ts` (신규) — 테스트키 200 · live 키 403 `simulate_live_forbidden` · session.order_id 불일치 400 `payment_request_mismatch` · 세션 amount 서버 SoT
- `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-status/route.ts` — 응답에 `test_mode: boolean` 추가
- `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` — QRIS short-circuit 응답에 `test_mode` 추가
- `apps/commerce-core/src/modules/payment_xendit/__tests__/qris-simulate-bk.unit.spec.ts` (신규) — 9 unit tests (fetch mock)
- `docs/runbooks/qris-test-simulation.md` — §0 "기본 = iPad 버튼, 터미널 curl 은 예비" + Transactions PENDING 미노출 기록

### fork (10 files)
- `api/hooks/pos-qris.ts` — `useQrisSimulate` · `QrisSimulateResponse` · `test_mode?: boolean`
- `api/hooks/pos-payments.ts` — `PosTenderResponse.test_mode?: boolean`
- `app/checkout/tender-qris/[draftOrderId].tsx` — `testMode` param · `onSimulate` · `qris-simulate-btn` (variant=outline · test_mode AND !isExpired AND pr_id 일 때만 렌더)
- `app/checkout/tender-cash/[draftOrderId].tsx` — QRIS 생성 후 `testMode` param 전달
- `__tests__/qris-simulate-bk.test.ts` (신규) — 6 unit tests (버튼 노출 판정 + hook body shape)
- `e2e/flows/06-qris-simulate-bk.spec.ts` (신규) — Playwright 3 스샷 (테스트 노출 · 클릭 · live 미노출)
- `e2e/helpers/api-mocks.ts` + `fixtures/pos-qris-tender-response-test.json` + `fixtures/pos-qris-status-pending-test.json` + `fixtures/pos-qris-simulate-pending.json` — testMode 분기 + simulate mock

## 3. 테스트 결과

- `apps/commerce-core`: `npx jest --testPathPattern='payment_xendit|qris'` → **3 files · 56 tests pass** (신규 BK 9 포함).
- `apps/commerce-core`: `npx tsc --noEmit` → error 0.
- `fork`: `npx vitest run __tests__/` → **9 files · 91 tests pass** (신규 BK 6 포함).
- `fork`: `npm run lint` → pre-existing errors (components/orders/VoidRefundSheet.tsx · components/payment/QrisTenderPanel.tsx). master 자체가 Lint failure 상태 (최근 run 확증) → BK PR 이 **새로 깨뜨린 것은 없음**. 내 파일은 `npx prettier --write` 로 통과.

## 4. CI 상태 (push 후 새 run · 2026-11-13 00:35 KST 기준)

- **storeport PR #236**: changes-filter ✅ · check ✅ · markers-and-forbidden ✅ · unit-commerce-core ✅ · pos-integration pending · docker-smoke skipping.
- **fork PR #119**: assertions ✅ · flow-tests ✅ · playwright pending · lint ❌ (pre-existing · master 동일 실패).

## 5. 보안·경계 체크

- 테스트 키 (`xnd_development_`) 일 때만 서버가 simulate 수행 · live 면 **403**.
- amount 는 서버 payment_session SoT (클라 금액 무시).
- secret key · Xendit raw body 는 응답/로그에 미노출 (xendit-client whitelist 재사용).
- 결제수단 선택 버튼 파일 (components/payment/PaymentMethodTabs.tsx · M3-1105-BN 소유) **미수정**.
- 운영 SSH · railway CLI · DB · 키체인 · 허브 폴더 밖 · /loop · Monitor 미사용.
- Xendit 실 API 는 테스트 (mock) 에서 호출되지 않음. 실제 호출은 운영 iPad 가 테스트 키로 수행.

## 6. 선택지 기록 (각 PR 본문 3줄)

### storeport
1. `simulate` 함수는 `xendit-client.ts` 에 포함 (별도 파일 아님) — 기존 `cancelPaymentRequest` / `createRefund` 와 같은 whitelist 패턴 재사용.
2. 라우트 핸들러를 `handleQrisSimulate(req, res, deps)` 로 분리 → `clientFactory` DI 로 unit test 에서 fetch 실호출 0.
3. `test_mode` flag 는 두 응답 (`qris-status` + `tenders` QRIS short-circuit) 에 동시 노출 → 앱이 QR 화면 진입 시점과 폴링 시점 양쪽에서 확인 가능.

### fork
1. `test_mode` 1차 소스 = tender 응답 (URL param) · 2차 소스 = qris-status 폴링 (서버 설정 변화 늦게 반영).
2. 즉시 폴링 (`checkStatus()`) 을 시뮬 호출 직후 1회 수행 → UX 체감 ~1s (기본 10s 폴링 대기 제거).
3. 서버 route 와 shape 일치: body `{ payment_request_id }` 만 송신 · 클라 amount 는 안 보냄.

## 7. Kyu 확인 항목 (각 PR 본문)

### storeport
- 테스트 키 상태에서 iPad 앱 "Simulate payment (test)" 클릭 → 10s 이내 영수증 화면.
- live 키 전환 후 버튼 미노출 확인.
- Admin → 주문 상세 Paid · Xendit Webhook Logs 200.

### fork
- 테스트 키 설정 상태에서 QR 화면 하단 "Simulate payment (test)" 노출.
- 클릭 → 토스트 "Test payment sent · waiting for webhook" → 영수증 전환.
- live 키 전환 후 QR 화면에 버튼 미노출.

---

## 8. 요약 한 줄 (claim)

**M0-1105-BK done · storeport#236 + fork#119 · test key qris-simulate route + iPad btn · unit 15 pass · Xendit mock only**
