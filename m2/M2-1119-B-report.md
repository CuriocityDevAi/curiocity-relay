pin-audit · 분류 a · PR #386 · 초록 O

## 진단

**실패 test**: "cash 환불 성공 시 pin_audit_log 1건" — 1/4 fail (3/4 pass)

**실패 로그 (main)**:
```
Expected: 200
Received: 400
at integration-tests/pos/pin-audit.spec.ts:115
```

**근본 원인**:
`createAndPayOrder`가 `pos-complete` 호출 → 내부 `markPaymentCollectionAsPaid` → `provider_id = "pp_system_default"`

환불 route의 `providerToMethod("pp_system_default")` = `"pp_system_default"` (≠ `"cash"`)
→ cash tender 매칭 실패: `tender.method 'cash' has no matching captured payment` → 400

다른 환불 테스트(`partial-refund-anytime` 등)는 `/tenders` + `provider_id: "pp_cash_default"` 사용 → 정상.

## 분류: (a) 테스트 낡음

기능(`pin_audit` 모듈, 환불 route PIN 검증)은 정상. 테스트 헬퍼가 잘못된 결제 provider로 주문을 생성했던 것.

## 수정 (pin-audit.spec.ts 단독)

- `createAndPayOrder`: `pos-complete` → `/tenders` (`provider_id: "pp_cash_default"`, `isDraft: true`)
- 미사용 `Modules` import 제거

## 초록 로그 (수정 후)

```
PASS integration-tests/pos/pin-audit.spec.ts (23.6 s)
  ✓ cash 환불 성공 시 pin_audit_log 1건 (feature:refund, outcome:success) (3772 ms)
  ✓ source=order_lookup + PIN 없음 → 403 manager_pin_required (3911 ms)
  ✓ source=order_lookup + 올바른 PIN → 200 + pin_audit_log 1건 (791 ms)
  ✓ 2일 전 주문에 나중 연결 → 400 different_day_order (956 ms)
Tests: 4 passed, 4 total
```

## #384 PR "PASS" 불일치 원인

PR #379 머지 시 spec이 함께 머지됐으나 `pp_system_default` 문제는 로컬 CI 환경 차이 또는 테스트 미실행으로 감지되지 않았던 것으로 추정. spec 자체는 main/feature/M2-1118-N 브랜치 모두 동일.

## PR

https://github.com/CuriocityDevAi/storeport/pull/386
