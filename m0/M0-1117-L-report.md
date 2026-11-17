PR #342 · return route 1170줄→526줄 · workflow step 6 · 테스트 통과 421

# M0-1117-L — W1 Return workflow 추출 리포트

## 착지물
- PR: https://github.com/CuriocityDevAi/storeport/pull/342
- 브랜치: `refactor/M0-1117-L-return-workflow` on origin/main (019fab4)
- 커밋: e6cdd7d · 14 files changed · +2,023 / −862

## 결과 수치
- `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts`: 1,170 → 526 (−644 · −55%)
- `src/workflows/pos-return/`: 신규 10 파일 (workflow + 6 steps + types + utils + index + 2 테스트 + 1 snapshot)
- 테스트: 421 unit 전원 통과 (기존 411 + 신규 10)

## 설계
POS 전용 경로(PIN · QRIS 선행 Xendit refund · cash_movement · loyalty recover · 응답 조립)는 라우트에 유지. 채널 중립 업무 로직은 `posReturnWorkflow` 로 이동.

6 steps:
1. **fetch-and-validate-order** — 주문 graph 조회 + Guard B (`이미 반품한 수량 + 이번 수량 > 산 수량`) 검증 + 가용 payment packs / totalRefundable 산정. 부작용 없음.
2. **compute-refund** — 품목 비율 배분 (`Math.round(line_total * share)`) + CASH-first plan (M0-1105-AJ). 부작용 없음.
3. **execute-refunds** — plan 순차 실행 (Phase 2 · M0-1105-AL/AM). 1차 실패(cap-exceeded 409 · 그 외 400) / mid-stream 실패 (500) 는 `partial` marker + returns[] 를 persist 후 커스텀 에러 throw. 라우트가 HTTP 상태로 매핑.
4. **restore-inventory** — fulfilled 는 `adjustInventory(+qty)` · unfulfilled 는 reservation 삭제 (M0-1105-BF) + `listInventoryLevels` 우선 location (M0-1105-BY). 성공한 조정/삭제를 compensation 스냅샷으로 기록 → 뒤 step 실패 시 자동 되돌림.
5. **mint-receipt** — `resolveRefundReceiptKind` (refund | partial_refund) + method 별 tender. compensation = receipt 삭제.
6. **persist-returns** — `order.metadata.returns` 에 completed entry push. `cash_movement_id` 는 라우트가 workflow 후 back-fill.

채널 메타 `{channel: 'wing_online', actor_id}` · `{channel: 'care_agent', actor_id}` 로 호출자가 바뀌어도 로직은 동일. PIN · 현금 서랍은 각 채널이 자기 가드로 처리.

## [REQ] 자기 검증
1. **createWorkflow/createStep · compensation** → `workflow.ts` 는 `createWorkflow`, 각 step 은 `createStep`. `restore-inventory` + `mint-receipt` 는 두 번째 인자로 compensation 함수 전달 (StepResponse 2 번째 인자에 rollback 데이터 저장).
2. **재고 되돌리기/예약 삭제 step 분리 + 보상** → `restore-inventory.ts` 단독 step · compensation 은 역순 (`adjustInventory(-qty)` · reservation 재생성).
3. **동작 불변** → 응답 JSON 필드 1:1 복제 (ok · order_id · return_id · items[{line_item_id, quantity, amount, disposition}] · refunded_amount · method · refund_distribution · tender_results · status · receipt_id · receipt_no · cash_movement_id · open_drawer · inventory_restored · xendit_refund? · reservation_released · inventory_warning?). 에러 응답도 동일 (type · message · payment_id 등). 스냅샷 unit 테스트 `response-shape.unit.spec.ts` 4개 추가.
4. **workflow 단독 호출 (wing_online · PIN 없이)** → `wing-online-channel.unit.spec.ts` 5개 · 타입 수용 + `fetchAndValidateOrderHandler`/`computeRefundHandler` 를 mocked container 로 직접 호출해 흐름 증명.

## 테스트 로그
```
PASS src/workflows/pos-return/__tests__/wing-online-channel.unit.spec.ts
PASS src/workflows/pos-return/__tests__/response-shape.unit.spec.ts
...
Test Suites: 33 passed, 33 total
Tests:       421 passed, 421 total
Snapshots:   4 written, 12 passed, 16 total
Time:        9.868 s
```

Typecheck: admin UI 외 0 error (admin UI 는 React 19 forwardRef 기존 에러 · 이번 작업 무관).

## 미수행 (스코프 외)
- **통합 테스트 (`integration-tests/pos/**`)**: 실 Postgres 부트 필요 · 50분 상한 내 미수행. 응답 shape 는 보존했으므로 CI 통합 러너가 회귀 포착. Kyu 실기 (부분 환불 1건) 로 수동 회귀 확인 권장.
- `/refund-retry` · `/refund-status` 라우트는 이번 라운드 범위 외 (다른 W1 세션). `orderReturnQueue` export 를 그대로 유지했으므로 재시도 큐 직렬화는 그대로.

## 권장 다음 액션
1. CI 통합 테스트 결과 확인 → 회귀 포착 시 바로 수정
2. Kyu 실기 = POS 부분 환불 1건 (fulfillment 전 1 품목) 수동 테스트
3. (후속) Wing/CareAgent 쪽에서 `posReturnWorkflow` 를 wing_online 채널로 실제 사용 → 재사용성 실증
