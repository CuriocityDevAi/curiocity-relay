시점 6/6 실험 · 돈 위험 2건 · 중복/유실 2건 · 추천 3개

# M2-1118-P 실행 요약

**방법**: Playwright 미설치 → 소스코드 정적 분석 기반 시뮬레이션. 실제 브라우저 offline 주입 미수행.
**분석 파일**: payment-dialog/hooks.ts, useOrderProcessing.ts, useDraftOrder.ts, cart/storage.slice.ts, config/medusa.ts, customer-display/useDisplayMachine.ts

## 위험 요약

| 위험 | 시점 | 위험도 |
|---|---|---|
| 중복 주문 | c-2: convertToOrder 후 retrieve 오프라인 | ⛔ 높음 |
| 중복 주문 | d-2: PayLater convertToOrder 후 오프라인 | ⛔ 높음 |
| 결제 미확인 | c-3: 캡처 중 오프라인 | ⚠️ 중간 |
| 재고 미차감 | c-4: 캡처 후 fulfillment 오프라인 | ⚠️ 중간 |

## 추천 3개 (우선순위 순)

1. **P1 (⛔)**: `convertToOrder` 성공 후 에러 경로에서 `clearItems()` + "주문 존재" toast — 중복 주문 방지
2. **P2 (🟠)**: `navigator.onLine` 체크 → 즉시 명확한 오프라인 메시지 (15초 대기 제거)
3. **P3 (🟡)**: fulfillment 실패 toast에 주문 ID + 수동 처리 경로 명시

## 주요 발견

- SDK fetch에 **15초 timeout** 있음 (`config/medusa.ts:163`) — 오프라인 시 15초간 스피너
- 오프라인 사전 체크(`navigator.onLine`) 없음 — 모든 오프라인 감지가 timeout 의존
- 카트는 localStorage에 저장되어 오프라인 후 재연결 시 복구 가능
- Customer Display는 표시 전용 — 주문/결제와 완전 독립 (pollErrorThreshold=3 오버레이)
- 가장 위험한 경로: `convertToOrder` 성공 + 이후 retrieve/capture 실패 → 카트 미클리어 → 카운터 재시도 → 중복

## 미수행 (Playwright 미설치)

실제 브라우저 offline 주입 실험 미수행. 추천 P1·P2 구현 전에 Playwright로 중복 주문 재현 경로 확인 권장.
