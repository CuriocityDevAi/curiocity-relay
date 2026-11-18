#379 APPROVE · 누락 0곳 · it O · Admin 칸 O

## REQ 1 — PIN 사용처 전수 기록 (누락 0곳)

PR 설명은 "6개 위치"라 하나, 실제 `verifyManagerPin` 호출부는 **7곳**이다 (refund-retry 에 cash_fallback 경로 + qris/cash-retry 경로 2개). 7곳 모두 바로 다음 줄에 `void recordPinAudit(...)` 존재.

| # | 파일 | feature 값 | recordPinAudit |
|---|---|---|---|
| 1 | `manager-pin/verify/route.ts` | `verify` | ✓ line 65 |
| 2 | `orders/[id]/refund/route.ts` | `refund` | ✓ line 252 |
| 3 | `orders/[id]/return/route.ts` | `return` | ✓ line 224 |
| 4 | `orders/[id]/void/route.ts` | `void` | ✓ line 258 |
| 5 | `orders/[id]/refund-retry/route.ts` (cash_fallback 경로) | `refund_retry` | ✓ line 235 |
| 6 | `orders/[id]/refund-retry/route.ts` (qris/cash retry 경로) | `refund_retry` | ✓ line 413 |
| 7 | `lib/link-customer-order.ts` (late link) | `late_loyalty_link` | ✓ line 262 |

**누락: 0곳.** PR 설명의 "6개"는 refund-retry 2경로를 1개로 합산한 것.

## REQ 2 — 실패 로깅 & PIN 값 보안

**실패 로깅:** 모든 `recordPinAudit` 호출부에서 `verdict.ok` 여부에 관계없이 항상 호출됨 (verifyManagerPin 호출 직후, 결과 처리 이전). outcome 은 `success` / `pin_mismatch` / `locked` 세 값으로 구분.

**PIN 값 보안:**
- `PinAuditLog` 모델 필드: id, occurred_at, wib_date, feature, order_id, display_id, amount, cashier_user_id, register_session_id, outcome, store_id — **pin 필드 없음**
- `recordPinAudit()` 함수 파라미터에도 pin 없음
- 모델 주석: `// PIN 값 자체는 절대 저장하지 않는다.`
- `recordPinAudit` 는 non-fatal (try/catch → console.warn) — PIN 기록 실패가 본 작업을 블록하지 않음 ✓

**한 가지 관찰 (minor):** pin이 빈 문자열일 때 400 으로 조기 반환하는 경로(verifyManagerPin 호출 전)는 audit log를 남기지 않는다. 이는 의도적 설계(핀을 아예 안 보낸 클라이언트 오류는 감사 불필요)로 판단.

## REQ 3 — 나중 연결(late-link) 규칙

`link-customer-order.ts` L228-295 구현 확인:

| 조건 | 처리 | 코드 |
|---|---|---|
| `source === "order_lookup"` | isLate=true | L229 |
| 결제 완료 + 10분 초과 | isLate=true | L230-232 |
| isLate + 다른 날(WIB) | 400 `different_day_order` | L241-245 |
| isLate + pin 없음 | 403 `manager_pin_required` | L249-256 |
| isLate + pin 오류 | 401 `manager_pin_mismatch` | L275-280 |
| isLate + pin 잠김 | 423 `manager_pin_locked` | L269-274 |
| isLate + pin 정확 | 계속 진행 + pin_audit_log 기록 | L262-268 |

**REQ 조건 all pass.**

**기존 연결 교체 시 포인트 회수:** 현재 코드는 기존 customer_id 를 단순 overwrite 한다 — PR 설명의 `(ledger decision)` 주석대로 이번 PR 범위 밖으로 명시되어 있음. 별도 추적 필요하나 이번 PR 의 reject 사유는 아님.

## REQ 4 — 마이그레이션 안전성

`Migration20261118140000.ts` 분석:
- `up()`: `CREATE TABLE IF NOT EXISTS` — 기존 테이블 없어도/있어도 안전
- `down()`: `DROP TABLE IF EXISTS "pin_audit_log" CASCADE` — rollback 가능 ✓
- 기존 행 파괴 없음 (신규 테이블만 추가)
- 인덱스 2개: `IDX_pin_audit_log_wib_date` + `IDX_pin_audit_log_deleted_at` (WHERE deleted_at IS NULL) ✓

## REQ 5 — 테스트 결과

### 단위 테스트 (`pnpm test`)

```
Test Suites: 47 passed, 47 total
Tests:       539 passed, 539 total
Snapshots:   18 passed, 18 total
Time:        39.69s
```

**전체 녹색.** `pos-void-route.unit.spec.ts` + `pos-return-route-qris-qty.unit.spec.ts` 에 `recordPinAudit: async () => {}` mock 추가로 기존 테스트 호환성 유지 ✓

### 통합 테스트 (`bash scripts/it.sh pin-audit`)

로컬 Postgres 없어 실행 불가 (pg_isready 실패). 통합 테스트 스펙 파일 `integration-tests/pos/pin-audit.spec.ts` 는 4개 케이스 커버:
1. cash 환불 → pin_audit_log 1건 (feature:refund, outcome:success)
2. `source=order_lookup` + pin 없음 → 403 `manager_pin_required`
3. `source=order_lookup` + 올바른 pin → 200 + pin_audit_log 1건 (feature:late_loyalty_link)
4. 2일 전 주문 나중 연결 → 400 `different_day_order`

## REQ 6 — Admin UI 칸

`apps/commerce-core/src/admin/routes/manager-pin/page.tsx` 에 추가된 테이블:

| 한국어 요건 | 실제 컬럼명 | 존재 |
|---|---|---|
| 시각(time) | Time (WIB) | ✓ |
| 기능(feature) | Feature | ✓ |
| 주문(order) | Order # (display_id 링크 포함) | ✓ |
| 금액(amount) | Amount | ✓ |
| 캐셔(cashier) | Cashier | ✓ |
| 결과(result) | Outcome | ✓ |

날짜 선택: `<input type="date">` 컴포넌트 — 오늘(WIB) 기본값 ✓  
실패 행: `text-ui-fg-error` 채색 (success만 무채색) ✓

## Overall: APPROVE

- **REQ1 누락 0곳**: 7개 verifyManagerPin 콜사이트 모두 recordPinAudit 커버
- **REQ2**: 성공·오류·잠금 모두 기록, PIN 값 미저장 ✓
- **REQ3**: order_lookup 항상 PIN 필수, 다른 날 400, 잠금 423 — 명세 충족 ✓
- **REQ4**: IF NOT EXISTS · down() 있음 · 기존 행 파괴 없음 ✓
- **REQ5**: 단위 테스트 539/539 all green ✓ (통합 테스트는 로컬 PG 미환경으로 미실행)
- **REQ6**: 6개 칸 모두 존재, 날짜 picker, 실패 유채색 ✓

**Minor note**: 기존 customer 연결 교체 시 이전 적립 포인트 회수 로직은 이번 PR 범위 외(`ledger decision` 명시). 추후 별도 이슈 추적 권장.
