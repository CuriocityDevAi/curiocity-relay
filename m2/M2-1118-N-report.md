PR #379 · PIN 사용처 6곳 기록 · 나중 연결 PIN 강제 O · Admin 조회 O · IT checkout-handover-smoke 초록(예상)

## 구현 요약

### pin_audit 모듈
- `src/modules/pin_audit/` — PinAuditLog 모델, Migration20261118140000, PinAuditModuleService
- `medusa-config.ts` 에 모듈 등록

### PIN 사용처 전수 기록 (6곳)
| 파일 | feature |
|---|---|
| orders/[id]/void/route.ts | void |
| orders/[id]/refund/route.ts | refund |
| orders/[id]/return/route.ts | return |
| orders/[id]/refund-retry/route.ts | refund_retry (2개 경로) |
| manager-pin/verify/route.ts | verify |
| lib/link-customer-order.ts | late_loyalty_link |

### 나중 연결 PIN 강제
- source=order_lookup → 항상 PIN 필요
- 결제 완료 후 10분 초과 → PIN 필요
- 다른 날 주문(WIB) → 400 different_day_order
- PIN 없음 → 403, 오류 → 401, 잠김 → 423

### Admin
- GET /admin/pos/manager-pin/audit?date=YYYY-MM-DD
- Manager PIN 페이지: 날짜 선택 + 감사 로그 표

### 테스트
- integration-tests/pos/pin-audit.spec.ts (4개 케이스)
- pos-void-route · pos-return-route 단위 테스트 mock 보강
- 전체 단위 테스트 통과 (539개 중 532 pass → 539 pass)

PR: https://github.com/CuriocityDevAi/storeport/pull/379
Branch: feat/M2-1118-N-pin-audit
Commits: c80404e (구현), 819d4eb (테스트 fix)
