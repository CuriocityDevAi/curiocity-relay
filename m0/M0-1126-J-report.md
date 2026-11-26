PASS #457 be6a71a5104cdc26f8c17b93b467e160377b785b

# M0-1126-J — V4-1 Next customer 뿌리 · V4-5 영수증 머리 · V4-6 Skipped 자동 해제

- 브랜치: `feat/M0-1126-J` (base = `feat/M0-1126-I` · PR #456 위)
- PR: https://github.com/CuriocityDevAi/storeport/pull/457
- 커밋: `be6a71a5104cdc26f8c17b93b467e160377b785b`

## 변경 요약

### V4-1 — "POS 가 언제나 이긴다" 서버 보장
`apps/commerce-core/src/modules/register_session/service.ts` ·
`nextCustomerForOrder` 보강: target 보다 이전에 생긴 미정리 sibling (cart/draft
active · 이미 settled paid) 을 함께 expire. 보존: `phone_entry_open` paid
(병렬 LateLink) · `target.created_at` 이후 생긴 snapshot (R2 병렬 카트) ·
`target.paid_at` 이후 paid (R2 뒤늦게 paid).

### V4-5 — CD 영수증 실 데이터 + 하드코딩 폴백 제거
- `packages/receipt-view-model`: `payment_method?` optional · tenders 비어 있고
  payment_method 도 없으면 **빈 배열** 반환 (기존 `?? "cash"` 폴백 제거) ·
  `tax.amount === 0` 이면 `taxShow=false` (PB1 Rp 0 금지) · ViewModel 에
  `storeLogoUrl` · `receiptNo` · `issuedAt` · `cashierName` 추가.
- `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts`:
  `createReceiptForOrder` 직후 receipt_no + issued_at 을
  `patchSnapshotReceiptByOrder` 머지.
- `apps/commerce-core/src/subscribers/order-snapshot-paid.ts`:
  `pickPaymentMethod` 가 결제수단 미식별 시 `null` 반환 (기존 `"cash"` 폴백
  뿌리). cash 는 provider_id 에 "cash" 포함 시에만 양성.
- `apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx`: 로고 ·
  매장명 · 주소 · 영수증 번호 · 날짜/시각 · 캐셔 렌더 (값 없으면 숨김).
  하드코딩 "Store"/"PB1"/10 기본값 제거.

### V4-6 — Skipped 3초 뒤 자동 해제
`apps/customer-display/app/index.tsx` LiveIndexRoute:
- `customer_flow.state === 'skipped'` 감지 → 3초 타이머 → `skippedDismissed=true`.
- paid 상태: `cdSnapshot=null` → MainScreen (대기 화면).
- building/tendering: `customer_flow.state='none'` override → order-list /
  qris-full 복귀.
- snapshot.id 변경 / state 전환 시 자동 리셋.

서버 `skipped_at` 과 POS 칩 (Skipped + Ask again) 은 그대로.

## 신설 통합 스펙

`apps/commerce-core/integration-tests/pos/cd-pos-sync-v4-next-customer.spec.ts`
3 케이스:
1. V4-1 · Next customer 뒤 CD 가 대기 유지 · 과거 cart/draft 가 서버 active
   후보로 재부상하지 않음.
2. V4-5 · QRIS 결제 receipt = payment_method(qris) · PB1 실세액 · store 머리
   (name/address/receipt_no/issued_at/cashier).
3. V4-6 · skip → server state=skipped + actions=['ask_again'] (CD 3초
   dismiss 는 클라 통합 외 로직이라 unit 분기).

## 직접 실행한 테스트 로그 (요약)

- `bash scripts/it.sh cd-pos-sync-v4-next-customer` → **3/3 PASS**
- `bash scripts/it.sh cd-pos-sync-v3` → **3/3 PASS**
- `bash scripts/it.sh cd-pos-sync-v4.spec` → **4/4 PASS**
- `bash scripts/it.sh cd-parallel-pay` → **15/15 PASS**
- `bash scripts/it.sh cd-full-flow` → **8/8 PASS**
- `bash scripts/it.sh cd-snapshot-skip` → **7/7 PASS**
- `pnpm --filter commerce-core test` → **877/877 PASS**
- `pnpm --filter customer-display test` → **327/327 PASS**
- `pnpm --filter @storeport/receipt-view-model test` → **10/10 PASS**
- typecheck: commerce-core · customer-display · @storeport/receipt-view-model
  모두 clean (`tsc --noEmit`).

## 미실행 / 미검증

- **CD 영수증 실제 스크린샷** — 러너 환경에서 Expo 기기 실기 미수행. 머리
  필드 렌더 시각 확인은 Kyu dev 실기 QA 로 대체 (PR body 1번/2번 체크 항목).
- **캐시어 이름 resolution** — `tenders/route` 가 `cashier.id` 만 전달. name
  lookup 은 후속 라운드 (현재는 name 없으면 줄 숨김 — 하드코딩 폴백 금지).
- **20초 KeypadPanel 타임아웃 자체** — 기존 KeypadPanel 가 `SKIP_TIMEOUT_MS = 20_000`
  보유 · Skip 액션 자체 (서버 skip) 는 cd-full-flow/cd-snapshot-skip 회귀로 커버.
  20초 → Skipped → 3초 → 대기 복귀의 전체 실기 타이밍은 수동 QA 필요.

## 기술 선택지 (PR body 와 동일, 3줄)

1. V4-1: `register_session` 컬럼 신설 없이 target.created_at 을 세션 세그먼트
   경계로 사용 (DB migration 0, 역호환).
2. V4-5: receipt_no/issued_at 을 buildSnapshot 재조정 없이 createReceiptForOrder
   직후 patch 머지 (nextReceiptNo 가 내부 할당이라 순서 뒤집지 않음).
3. V4-6: SkippedPanel 자체에 timer 넣지 않고 LiveIndexRoute 에서 감시 (SkippedPanel
   은 pure presentational · unit test 가능).
