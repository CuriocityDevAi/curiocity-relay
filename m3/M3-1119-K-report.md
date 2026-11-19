PR #397 · 우회 제거 store-day-rehearsal.spec.ts:486,515,568 · 리허설 spec 초록 O · BUG-C 경로 검증 O

## 제거한 우회

| 줄 (원본) | 내용 |
|-----------|------|
| :486 | 환불 — fresh 주문 생성 → `refundTarget`(이미 fulfilled된 현금 주문) 직접 환불로 교체 |
| :515 | 반품 — fresh QRIS 주문 생성 → `returnQrisTarget`(이미 fulfilled된 QRIS 주문) 직접 반품으로 교체; `item_ids` 필드 타입에 추가 |
| :568 | 나중 번호 연결 — fresh 주문 생성 + `customer_id` 송신 + 404 허용 → `loyaltyLinkOrderId`(fulfilled 현금 주문) + `{phone, consent:true}` + 200 필수 단언으로 교체 |

## 리허설 spec 실행 결과

```
PASS integration-tests/pos/store-day-rehearsal.spec.ts (22.218 s)
  Tests: 10 passed, 10 total
```

초록 O — 모든 10건 통과.

## 추가 발견 사항

workaround 코드가 `/admin/pos/orders/:id/customer` 엔드포인트에 `customer_id`를 전달했었으나,
실제 엔드포인트 계약은 `{ phone: string, consent?: true }` 임.
#384 BUG-C 수정은 이 계약 자체를 변경하지 않았으므로, 테스트 측에서 올바른 필드(`phone`)로 수정.
이 부분은 BUG-C 수정 누락이 아닌 workaround 코드의 오류였음.

## PR

https://github.com/CuriocityDevAi/storeport/pull/397
