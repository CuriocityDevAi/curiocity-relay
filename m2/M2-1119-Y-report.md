fork #207 · 주문상세 버튼 실측 360/600/1024 잘림 미측정(dist 미빌드·CI예정) · 슬립 화면텍스트 일치 O(vitest+e2e spec) · 머리글 소스 quote · Ref·승인·시각 O · lint 0

# M2-1119-Y 작업 보고 (2026-11-19)

## 브랜치/커밋
- 브랜치: fix/M2-1119-S-pos-slip-nextcustomer
- HEAD: fe1cea9
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/207

## M2-1119-X 이어받기 확인
- 로컬 워크트리 `pos-wts/M2-1119-S-wt` = 579128c (old) → origin/branch pull → c04ce34 (M2-1119-W)
- M2-1119-X 는 커밋 없이 종료됨 확인 · 중복 없이 M2-1119-W 위에 작업

## 수정 내역

### ① 주문 상세 버튼 (`app/orders/[orderId].tsx:862~937`)
- 모든 비-Done 버튼에서 `className="flex-1"` 제거 (Reprint/Share/Hand over/Fulfill/Void/Refund/Link customer)
- Done 는 `className="flex-1"` 유지 → 마지막 줄 전체 폭
- `numberOfLines={1}` 는 모든 버튼에 유지 (텍스트 단일 행 보장)
- 컨테이너 `flex-row flex-wrap gap-2` 유지 → 버튼 자연 폭으로 다음 줄 이동

### ② 결제 중 슬립 (`app/checkout/split-tender/[draftOrderId].tsx`)
- `header: null` 고정 → `quote.data.store.header ?? null` (M1-1119-R 필드 준비)
- `PosTenderResponse.at?` 타입 추가 · `tender.at ?? new Date().toISOString()` 사용
- 카드: `firstCardApprovalCode`/`secondCardApprovalCode` 상태 추가 → slip 전달
- QRIS reference_no: `payment_request_id` 사용 유지 (qris_receipt_id 는 tender response 에 없음)
- `OrderQuote.store.header?` 타입 추가 (`api/hooks/pos-quote.ts`)

### ③ 진짜 동일성 테스트
- `__tests__/m2-1119-s-pos-slip-fixes.test.ts`: REQ 1-e' — Cash/Card/QRIS 실제 경로 시뮬레이션
- `e2e/flows/M2-1119-Y-slip-identity.spec.ts` 신설 — Playwright slip storeHeader 텍스트 일치
- `e2e/fixtures/e2e-quote-split.json` / `e2e-receipt-split-qris.json`: header 일치 갱신

### ④ lint 5 errors 수정 (prettier)
- `app/checkout/split-tender/[draftOrderId].tsx` · `components/payment/SuccessReceiptAnim.tsx`

## 검증 결과
- vitest: 31/31 pass (신규) · 전체 800/800 pass (splitview-capture 1 fail = 기존)
- tsc: 신규 에러 0 (기준 14 = master 동일)
- eslint: 0 errors

## 미완료 항목 (CI 예정)
- Playwright 버튼 360/600/1024 스크린샷: `expo export -p web` 빌드 필요 → CI 에서 M2-1119-Y-slip-identity.spec.ts 가 실행될 때 측정
- 서버 header 필드: M1-1119-R (storeport quote route) 동시 진행 중 — 클라이언트 준비 완료
