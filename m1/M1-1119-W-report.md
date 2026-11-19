storeport #403 · QRIS at O · webhook 공통빌더 O · Cash→QRIS 일치 IT O · IT 99/99 · tsc 0

## 커밋
e5c23f8 fix(commerce-core): M1-1119-W — QRIS at · webhook 공통빌더 · Cash→QRIS 일치 IT

## CHANGES 3건
1. **QRIS POST 응답 `at` O** — `tenders/route.ts` QRIS short-circuit(1077행) 응답에
   `at`, `qris_receipt_id: null`, `reference_no` 추가. `qrisAt` 를 try 블록 바깥에서
   호이스팅해 `qrisTenderDetail.at` 와 동일 타임스탬프를 사용.

2. **webhook 공통빌더 O** — `tender-utils.ts buildTenderEntry` 규칙 갱신:
   - `at = captured_at ?? at`
   - QRIS `reference_no = qris_receipt_id ?? reference_no` (손님앱 번호 우선)
   - QRIS `xendit_payment_id` 필드 추가
   `xendit/route.ts` tenderList 인라인 빌더 → `buildTenderEntry` 치환
   (import 추가 · legacy fallback 도 buildTenderEntry 경유).

3. **Cash→QRIS 일치 IT O** — `tenders.spec.ts` #74 추가:
   CASH 50k split + QRIS 50k split → webhook paid → 완결.
   `quote.tenders[i]` === `snapshot.tenders[i]` (키·값 완전 일치) × 2건.
   QRIS short-circuit 응답 `at` 존재 검증도 포함.

## 검증
- IT 99/99 (tenders.spec.ts full run)
- tsc 0 (commerce-core)
- unit 539 passed
