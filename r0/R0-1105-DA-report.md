# R0-1105-DA — storeport #234 리뷰 결과

판정: **APPROVE**. BI fix 정확. 2개 commit으로 3개 gap 보정 완료. CI run 43259015105 전체 green.

| REQ | 항목 | 판정 | 비고 |
|-----|------|------|------|
| 1 | `/refund` 미출고 판정 — `packed_at` 포함 | ✅ PASS (CHANGED) | `hasShippedFulfillment`에 `|| f.packed_at` 추가 · `fulfillments.packed_at` query 추가 (2dc3f05) |
| 2 | 부분 환불 시 취소·예약 삭제 없음 | ✅ PASS | `amount < order.total` 분기로 취소 미진입 확인 |
| 3 | stale 모드 `refunded` 판정 보정 · `partially_refunded` 오포함 없음 | ✅ PASS (CHANGED) | `payment_collections.payments.refunds.id` 직조회로 `derivedPaymentStatus` 계산 (c7816e2) |
| 4 | Xendit 이벤트명 매핑 · refund `payment_id`-only 매칭 | ✅ PASS | 공식 docs 일치. BETA payload `refund_id` required → payment_id-only 케이스 없음 |
| 5 | `refund-ghost-reservation.spec` CI 실행·통과 | ✅ PASS (CHANGED) | `package.json` 스크립트 추가 + BB-query_open 로직 수정 (c7816e2). CI 43259015105 통과 |
| 6 | 판정 PR 코멘트 | ✅ DONE | github.com/CuriocityDevAi/storeport/pull/234#issuecomment-6829548674 |
