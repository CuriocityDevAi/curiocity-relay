# M0-1116-M — 손님 화면 "적립 예고" 금액이 항상 0 — 연결

PR #313 · 계산 위치 서버(`previewReceipt` 공용 호출) · 예고=실제 일치 테스트 ✅ (세후 990 · 세전 900 유닛 통과)

- URL: https://github.com/CuriocityDevAi/storeport/pull/313
- 브랜치: `fix/m0-1116-m` ← `origin/main` (58c48a7)
- 커밋: 591c180 · docs lint 통과(prettier) · naming-check PASS.

## 결정
- 계산 주체 = **서버**. 이유: POS 앱 업데이트 없이 설정 변경 즉시 반영 · fork PR 불요.
- 계산 함수 = `apps/commerce-core/src/lib/loyalty/receipt-preview.ts::previewReceipt` (= 결제 완료 subscriber 의 `earn.ts` 가 호출하는 바로 그 함수) · 금지 규칙 준수 "earn.ts·receipt-preview.ts 변경 금지 — 호출만".
- 손님 화면 snapshot 서버 코드:
  - `apps/commerce-core/src/api/customer-display/snapshots/{active,[id]}/route.ts`
  - `apps/commerce-core/src/api/admin/pos/registers/[id]/snapshot/route.ts`
  - `apps/commerce-core/src/api/admin/pos/loyalty/sessions/snapshots/{active,[id]}/route.ts`
  - 응답 DTO 직전 공용 helper `attachEarnPreviewToSnapshot(container, dto)` 로 `loyalty.earn_preview` override · POS 가 보낸 다른 loyalty 필드(phone_masked · balance · use_amount · available_use) 보존.
- loyalty-info/route.ts: `earn.applied=true` 면 `earn.amount` 그대로 노출(일치 보장), 미적용이면 현재 설정 기준 계산.

## 신규 파일
- `apps/commerce-core/src/lib/loyalty/snapshot-earn.ts` — `loadEarnPreviewSettings` · `computeEarnPreviewForTotals` · `attachEarnPreviewToSnapshot`.
- `apps/commerce-core/src/lib/loyalty/__tests__/snapshot-earn.unit.spec.ts` — 7건 pass.
  - subtotal 10,000 · PB1 10% · earn_rate 9% → `paid_non_credit` **990** · `paid_non_credit_pre_tax` **900** (두 설정 모두 테스트 · previewReceipt 결과와 1:1 비교).
  - discount_total 반영 · loyalty disabled → 0 · POS 가 보낸 기존 loyalty 필드 보존.

## 수치
- unit tests: 24 suites / 339 pass (실패 2건은 pre-existing playwright-in-jest · 본 변경 무관).
- typecheck: 베이스 249 → 변경 후 249 (신규 TS 에러 0).
- feature-map-check: 8 파일 matched 0 unmatched.
- naming-check: PASS.

## Kyu 실기 (미실행 · PR 본문 체크리스트)
- [ ] 로컬 commerce-core 서버 기동 · fork POS 로 line item 추가 → snapshot 생성.
- [ ] 로컬 customer-display 에서 `?mock=1` 없이 실제 폴링 → cart 화면 "+ Rp N" 이 설정 변경에 즉시 반응.
- [ ] 결제 완료 후 `receipt.earned` 와 cart 단계 `earn_preview` 같은 숫자인지(990/900) 비교.
- [ ] Admin 주문 상세 order-loyalty 위젯에 earn_preview 숫자 노출 확인.

## 미검증
- 로컬 서버 기동·스샷 본 세션 미실행(Opus 40분 상한 · 운영 DB/배포 금지 규약). 서버 단위 테스트로 예고=실제 일치를 유닛 레벨에서만 보장.
- POS fork(`apps/anchor`) 변경 없음 — 서버 계산 override 로 fork PR 불요.
