PR #345 · NET preview/confirm · 테스트 15 · 하위호환 OK

## 완료 내용

- `lib/loyalty/preview-recover.ts` 신설: `previewRecoverForOrder(container, {order_id, refund_amount, tenders, priority_override?})` — DB 쓰기 없이 §3.2 식 계산. 반환: `{earned, already_recovered, requested_debit, available_balance, shortfall, net_refund_amount, tender_adjustments[], confirm_required}`.
- `applyShortfallToTenders(tenders, shortfall, priority?)` — 현금→QRIS→카드 순 차감, override 가능.
- `refund/route.ts` 분기: `body.preview=true` → 미리보기만(DB 0), `body.confirmed=true` → NET 조정 후 workflow 실행. 하위 호환 유지.
- workflow `original_refund_amount` 추가 → `recoverLoyaltyStep` 이 gross 기준 비례 회수(addDebt 보존).
- 테스트 15개: §6 시나리오 1·2·3 + 환불<부족분(net=0) + fallback + priority_override.

## 테스트 결과

전체 476 tests 통과 · TypeScript non-admin 에러 0
