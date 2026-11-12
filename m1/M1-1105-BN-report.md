# M1-1105-BN 착지 보고

## CJ-3/CJ-4 처리 표

| ID | 파일:줄 | 처리 내용 |
|----|---------|-----------|
| CJ-3 마커 | `tenders/route.ts:800-830` | `catch(e)` 에 non-fatal try/catch 추가 → `order.metadata.pos_tax_lines_insert_failed = { reason, at }` 기록 |
| CJ-3 테스트 | `pos-tax-lines.spec.ts:#CJ-3` | `jest.spyOn` 으로 실패 주입 → 결제 성공(200) · 금액 불변(33000) · 마커 존재 가드 |
| CJ-4 가드 | `pos-tax-lines.spec.ts:#CJ-4` | `it.failing` 고정 · TODO(M1-1105-BN) |

## PR

https://github.com/CuriocityDevAi/storeport/pull/238

## CI run

- Triggered after push to `fix/m1-1105-bn-tax-cj34`
- CI run: https://github.com/CuriocityDevAi/storeport/actions/runs/43333337529
- Status: pending (새 run 으로 판정 대기)

## head SHA

`a8e3ee1` (`fix(pos): CJ-3 세금 fallback 마커 · CJ-4 다품목 tax_total 가드 (M1-1105-BN)`)

## 테스트 결과 요약

```
test:integration:pos:
  tenders.spec          89 passed
  pos-tax-lines.spec     9 passed  (1 it.failing = #CJ-4)
  p6-e2e.spec           10 passed
  refund-ghost-reservation.spec  5 passed
  통합 Total: 113 passed, 0 failed

unit:
  commerce-core         132 passed
  event-contracts        21 passed
  unit Total: 153 passed, 0 failed
```

## 금액 변경 필요 여부

**CJ-4**: `query.graph` 로 `items.tax_total` 가 0 반환됨 — Medusa v2 에서 해당 필드가 computed field 로 선언되지 않은 것으로 추정. BigNumber drift 여부는 아직 불명. 올바른 쿼리 경로 확인 후 별도 라운드 처리 필요 → **Kyu 결정 사항**.

## CJ-4 계획서

| 항목 | 내용 |
|------|------|
| 현재 증상 | `items.tax_total` 항상 0 반환 |
| 오차 크기 | 불명 (필드 미노출) |
| 예시 주문 | subtotal 30,006 (10001+10002+10003) · PB1 10% → allocated 3,001 |
| 권장 수정안 | `items.total - items.subtotal` 로 간접 계산 or `orderModule.retrieveOrder` 직접 조회 |
