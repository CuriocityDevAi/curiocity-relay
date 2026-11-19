#388 APPROVE · 로직변경0 O · 복제위험 O(단방향·위험없음) · unit O(539/539) · 파일겹침 #385

날짜: 2026-11-19  
리뷰어: R0-1119-G (CuriocityDevAi/storeport)

---

## REQ-1: 로직 대조 결과

### src/lib/manager-pin.ts ↔ 원본 (api/admin/pos/_shared/manager-pin.ts)

**결론: 로직 변경 0 · 완전 동일 복사본**

줄 단위 비교 결과:
- 모든 함수 (`getPinSecret`, `wibDateKey`, `nextWibRolloverIso`, `computeDailyPin`, `verifyManagerPin`, `resolveStoreId`, `recordPinAudit`, `timingSafeEqual`) 본문 1자도 변경 없음
- 상수 (`WIB_OFFSET_MINUTES=420`, `MAX_ATTEMPTS=5`, `LOCKOUT_MS=15*60*1000`, `DEV_FALLBACK_SECRET`) 동일
- 유일한 변경: import 경로 조정
  - 구 파일: `import type { PinAuditFeature } from "../../../../modules/pin_audit/service"`
  - 신 파일: `import type { PinAuditFeature } from "../modules/pin_audit/service"` (lib/ 위치에서의 상대경로)
- `src/api/admin/pos/_shared/manager-pin.ts` → 모든 export를 `../../../../lib/manager-pin`에서 re-export하는 15줄 thin wrapper로 교체 ✅ 하위호환 유지

### src/lib/pos-settings-module.ts ↔ 원본 (modules/pos_settings/index.ts)

**결론: 로직 변경 0 · 상수 추출만**

- 신 파일: `export const POS_SETTINGS_MODULE = "pos_settings"` (7줄)
- 구 파일에서 `export const POS_SETTINGS_MODULE = "pos_settings"` 한 줄만 추출
- `modules/pos_settings/index.ts` → `export { POS_SETTINGS_MODULE } from "../../lib/pos-settings-module"`으로 re-export ✅ 하위호환 유지
- `Module("pos_settings", ...)` 하드코딩 문자열로 변경 — 의미 동일 (상수 값이 "pos_settings"이므로)

### modules/payment_xendit/lib/xendit-refund.ts ↔ 원본 (api/admin/pos/_shared/xendit-refund.ts)

**결론: 로직 변경 0 · import 경로 2개 변경만**

- `tryXenditRefund`, `extractPaymentRequestId`, `isSimulatePayment`, `isWithinWindow` 함수 본문 1자도 변경 없음
- 모든 타입/상수 (`REFUND_WINDOW_MS`, `PARTIAL_NOT_SUPPORTED_PATTERNS`, `WINDOW_EXCEEDED_PATTERNS` 등) 동일
- Import 경로 변경:
  - 구: `from "../../../../modules/payment_xendit/lib/xendit-client"` → 신: `from "./xendit-client"` ✅
  - 구: `from "../../../../modules/pos_settings/lib/xendit-creds"` + `import type PosSettingsModuleService` → 신: `from "./creds"` + `POS_SETTINGS_MODULE from "../../../lib/pos-settings-module"` + `as any` 타입 캐스트
    - 주의: `PosSettingsModuleService` 타입 import 제거 → `as any` 로 대체. 런타임 동작 동일하나 타입 커버리지 소폭 약화 (non-fatal)
- `src/api/admin/pos/_shared/xendit-refund.ts` → thin re-export wrapper ✅ 하위호환 유지

### modules/payment_xendit/lib/qris-simulate-handler.ts ↔ 원본 (api/admin/pos/orders/[id]/qris-simulate/route.ts의 handleQrisSimulate)

**결론: 로직 변경 0 · import 경로 조정만**

- `handleQrisSimulate` 함수 본문 1자도 변경 없음 (179줄 완전 일치)
- Import 경로 변경:
  - 구: `from "../../../../../../modules/payment_xendit/lib/xendit-client"` → 신: `from "./xendit-client"` ✅
  - 구: `from "../../../../../../modules/payment_xendit/lib/webhook"` → 신: `from "./webhook"` ✅
  - 구: `from "../../../../../../modules/pos_settings/lib/xendit-creds"` + `import type PosSettingsModuleService` → 신: `from "./creds"` + `POS_SETTINGS_MODULE from "../../../lib/pos-settings-module"` + `as any` ✅
- route.ts는 `POST export`만 유지, `handleQrisSimulate`를 re-import ✅

### 한 줄 요약

| 파일 | 로직 변경 | thin re-export 유지 |
|---|---|---|
| manager-pin.ts | 0 | ✅ |
| pos-settings-module.ts | 0 | ✅ |
| xendit-refund.ts | 0 (PosSettingsModuleService → as any, non-fatal) | ✅ |
| qris-simulate-handler.ts | 0 (동일) | ✅ |

---

## REQ-2: 복제 위험 분석

**결론: 복제 위험 없음**

구조가 단방향 의존성이므로 갈라질 위험 없음:
- 원본 파일 (`_shared/manager-pin.ts`, `_shared/xendit-refund.ts`, `route.ts`)은 로직이 완전히 제거되고 신 lib를 re-export하는 wrapper만 남음
- 로직은 lib 파일 1개에만 존재 (single source of truth)
- 기존 import 경로를 사용하는 코드는 wrapper를 통해 동일 함수 참조 → 미래 수정 시 lib 1곳만 변경하면 됨
- 복사본 2개 공존 패턴 아님 ✅

**유일한 주의점:** `PosSettingsModuleService` 타입이 `as any`로 교체된 부분이 2곳 (`xendit-refund.ts`, `qris-simulate-handler.ts`)에 있으나, 이는 모듈 순환 참조를 피하기 위한 의도적 설계이며 런타임 안전성에 영향 없음. 향후 타입 복원을 원한다면 `XenditSettingsReader` interface (이미 `creds.ts`에 정의됨)를 사용하면 됨.

---

## REQ-3: 테스트 결과

### Unit 전체 ✅
```
Test Suites: 47 passed, 47 total
Tests:       539 passed, 539 total
Snapshots:   18 passed, 18 total
Time:        20.365 s
```
브랜치: `refactor/M1-1119-B-lib-boundary` (commit e34cf88)

### TypeScript typecheck ✅
```
npx tsc --noEmit → 출력 없음 (오류 0건)
```

### it.sh pin-audit ⚠️ 1건 실패 (기존 버그 · #388 무관)
```
✕ cash 환불 성공 시 pin_audit_log 1건 (feature:refund, outcome:success) — 400 받음
✓ source=order_lookup + PIN 없음 → 403 (통과)
✓ source=order_lookup + 올바른 PIN → 200 (통과)
✓ 2일 전 주문에 나중 연결 → 400 (통과)
```

**실패 원인 분석**: cash 환불 route에서 400 반환. PR #386 (`fix(test): M2-1119-B — pin-audit spec pp_cash_default 수정`)이 이 테스트를 수정하는 PR이며, #388 적용 전 main 브랜치에서도 동일하게 실패함. #388이 도입한 변경 (경로 이동)과 무관한 기존 실패.

---

## REQ-4: 파일 겹침 & 머지 순서

### 파일 겹침 체크

| PR | 변경 파일 | #388과 겹침 |
|---|---|---|
| #385 (fulfillment lib 승격) | `eslint.config.ts`, `_shared/fulfillment-cancel.ts`, `_shared/fulfillment-items.ts`, `src/lib/fulfillment-cancel.ts`, `src/lib/fulfillment-polyfill-items.ts`, `workflows/pos-fulfill/steps/*`, `workflows/pos-void/steps.ts` | 없음 |
| #383 (register-session BUG-D/B) | `integration-tests/pos/store-day-rehearsal.spec.ts`, `api/admin/register-sessions/_helpers.ts` | 없음 |
| #384 (fulfilled 주문 환불 BUG-C) | `integration-tests/pos/fulfilled-order-after-sales.spec.ts`, `api/admin/pos/orders/[id]/return/route.ts` | 없음 |
| #386 (pin-audit spec 수정) | `integration-tests/pos/pin-audit.spec.ts` | 없음 |

**직접 파일 겹침: 0건**

### 간접 의존 주의
- #385는 `eslint.config.ts`를 수정해 경계 경고를 에러로 승격할 예정. #388이 경계 위반을 제거했으므로, #385보다 #388이 먼저 머지되어야 eslint error 0 달성 가능. PR 본문에 명시됨.
- #384는 `return/route.ts`를 수정 — `xendit-refund.ts` import 경로가 wrapper를 통해 동일 함수 참조하므로 충돌 없음.

### 권고 머지 순서
1. **#388** (lib 경계 정리) — 먼저 머지해야 #385의 eslint error 모드에서 오류 없음
2. **#385** (fulfillment lib 승격 + eslint error 모드) — #388 이후
3. **#386** (pin-audit spec 수정) — 독립적, 아무 순서 가능하나 CI pin-audit 초록을 위해 조기 머지 권장
4. **#383, #384** — 각각 독립적, 순서 무관

---

## 최종 판정

**APPROVE** — 로직 변경 0 확인, 단방향 복제 구조로 diverge 위험 없음, unit 539/539 통과, tsc 오류 0. pin-audit 1건 실패는 #386 대상 기존 버그로 #388과 무관.
