storeport PR #402 · 시나리오 6개 · 통합 테스트 CI pending/6 · 렌더 스냅샷 12 · CI 연결 O ~25분

## PR
https://github.com/CuriocityDevAi/storeport/pull/402
브랜치: test/M3-1119-V-cd-flow-e2e (base: fix/M3-1119-O-cd-sync / PR #400)

## 파일
- `apps/commerce-core/integration-tests/pos/cd-full-flow.spec.ts` (신규 · IT 6개)
- `apps/customer-display/e2e/cd-flow-overlap.spec.ts` (신규 · Playwright 12개)

## 시나리오 표

| # | POS 메시지 순서 | 손님 화면 기대 | 커버 버그 |
|---|---|---|---|
| ① | checkout-snapshot(loyalty_entry) | keypad | M3-1119-O |
| ② | loyalty_entry → PATCH skipped=true | cart | M3-1119-R/S |
| ③ | checkout-snapshot(payment_qris, qr_string, amount) | qris | M3-1119-O |
| ④ | paid → RECEIPT_DONE → DONE_TIMER → 재진입 금지 | receipt→done→main | M3-1119-R/U |
| ⑤ | pre_entry=true + paid → RECEIPT_DONE | done (keypad-after X) | M3-1119-O |
| ⑥ | grand_total NaN 없음 · display_id 숫자 | — | M3-1119-O |

## Playwright 렌더 스냅샷
2뷰포트(507×834 · 507×500) × 6화면(main·cart·keypad·qris·receipt·done) = 12 테스트
검증: globe-button ↔ 헤드라인 bounding-box 겹침 없음 · 가로 overflow 없음

## CI 연결
- `pos-integration` 잡: `commerce_core` 필터(`apps/commerce-core/integration-tests/**`) → 자동 포함
- `customer-display` 잡: `customer_display` 필터(`apps/customer-display/**`) → 자동 포함
- workflow 수정 불요 (기존 경로에 포함 확인)

## 단위 테스트 (pre-push hook 통과)
customer-display 213 passed · commerce-core unit 539 passed

## 소요: ~25분
