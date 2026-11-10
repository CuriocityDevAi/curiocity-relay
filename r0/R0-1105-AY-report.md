# R0-1105-AY Review Report — storeport #207 + fork #77 (P6 void/refund/PIN)

**Reviewer**: R0 relay · 2026-11-10  
**Ledger**: ledger/decision-p6-20261110.md · M0-1105-AB · M3-1105-AD  
**Verdict**: storeport #207 → **CHANGES** (contract key mismatch) · fork #77 → **APPROVE**

---

## ① PIN (security · lockout · audit)

| 항목 | 판정 | 위치 |
|---|---|---|
| HMAC-SHA256(secret, `${storeId}:${wibYmd}`) → 4자리 | ✅ | `_shared/manager-pin.ts:computeDailyPin` |
| WIB UTC+07 오프셋 계산 | ✅ | `wibDateKey()` |
| secret 미설정 → dev fallback + 부팅 경고 1회 | ✅ | `getPinSecret()` |
| 0000 같은 기본값 금지 | ✅ | HMAC 결과이므로 충돌 없음 |
| Admin 위젯 admin 권한만 | ✅ | Medusa `/admin/` 미들웨어 (자동 admin auth) |
| PIN 평문 로그·응답·에러에 없음 | ✅ | audit 객체: `{actor_id, store_id, order_id, action, at, outcome}` — PIN 필드 없음 |
| GET manager-pin 응답에 PIN 포함 | ✅ 의도적 | admin-only 위젯 전용 — REQ 설계 (Kyu 11-10) |
| 5회 잠금 15분 (매장 단위) | ✅ | `MAX_ATTEMPTS=5 · LOCKOUT_MS=900000` per `storeId` key |
| 성공 시 카운터 리셋 | ✅ | `attemptStore.delete(key)` on success |
| timing-safe 비교 | ✅ | `crypto.timingSafeEqual(bufA, bufB)` |
| WIB 자정 경계 테스트 (23:59→00:00) | ⚠️ 미흡 | 없음. `wibDateKeyForTest` 함수는 있으나 경계 시나리오 없음 |
| in-memory 잠금 (서버 재시작 시 초기화) | ⚠️ 한계 | 단일 인스턴스 POS 범위 — 허용되나 주석 필요 |

---

## ② 수단 규칙 우회 불가

| 시나리오 | 판정 | 위치 |
|---|---|---|
| CARD 원거래 + method:'cash' + PIN 없음 → 400 | ✅ | void/refund `manager_pin required` 분기 |
| CARD 원거래 + method:'cash' + 유효 PIN → 허용 (단말기 실패 대체) | ✅ | 의도적 허용 — Kyu Q2 |
| CASH/QRIS 원거래 + method:'card_terminal' → 400 | ✅ | `originMethod !== 'card'` 체크 |
| terminal_approval_code 6자리 아님 → 400 | ✅ | `/^\d{6}$/.test(code)` |
| 서버가 원거래 수단 DB에서 직접 읽는지 | ✅ | `providerToMethod(originPayment.provider_id)` — 클라 body 무시 |
| 환불 금액 서버 계산 (클라 금액 신뢰 안 함) | ✅ | `refundable = captured - alreadyRefunded` |

---

## ③ 보이드 = 같은 교대 · fulfill 제약 · 이중 처리 · Cash Movement

| 항목 | 판정 | 위치 |
|---|---|---|
| 같은 교대만 (다른 세션 → 400) | ✅ | `submittedSessionId !== originSessionId` → 400 "cross-shift void" |
| `register_session_id` metadata 없는 주문 → 교대 검증 미적용 | ⚠️ | `if (originSessionId)` 조건 — 기존 주문(metadata 미세팅)은 교대 무관 가능. 신규 주문은 POS tender flow에서 metadata 세팅되므로 MVP 허용 범위이나 명시 필요 |
| 활성 fulfillment 있으면 void → 400 | ✅ | `activeFulfills.length > 0` |
| 이미 canceled → 409 | ✅ | `order.status === 'canceled'` |
| 이중 환불 → 409 | ✅ | pre-check `refundable <= 0` + workflow catch `refund more than` |
| 현금 Cash Movement −금액 1건 | ✅ | `createCashMovements({type:'adjustment', signed_delta:-amount})` |
| X/Z report 반영 (`signed_delta`) | ✅ | X/Z 산식이 `adjustment.signed_delta` 반영 (기존 서비스 그대로) |
| 영수증 kind void/refund | ✅ | 테스트 #44 `row.kind === 'void'` 검증 |
| `open_drawer` 응답 | ✅ | cash payout일 때 true |
| 동시 2요청 race | ⚠️ 경미 | pre-check와 workflow call 사이 간격. Medusa workflow 자체 guard가 2차 방어. 단일 인스턴스 POS 범위에서 허용 수준 |

---

## ④ #77 ↔ #207 계약 대조 — **[CRITICAL MISMATCH]**

| 항목 | M0 계약 (M0-1105-AB · M3-1105-AD) | 서버 #207 실제 | 앱 #77 실제 | 판정 |
|---|---|---|---|---|
| 경로 `/admin/pos/manager-pin/verify` | ✅ | ✅ | ✅ | ✅ |
| 경로 `/admin/pos/orders/:id/void` | ✅ | ✅ | ✅ | ✅ |
| 경로 `/admin/pos/orders/:id/refund` | ✅ | ✅ | ✅ | ✅ |
| body 키: `method`, `terminal_approval_code`, `manager_pin` | ✅ | ✅ | ✅ | ✅ |
| 응답 `receipt_id` | ✅ | ✅ | ✅ | ✅ |
| 응답 `receipt_no` | ✅ | ✅ | ✅ | ✅ |
| 응답 `cash_movement_id?` | ✅ | ✅ | ✅ | ✅ |
| 응답 `open_drawer` | ✅ | ✅ | ✅ | ✅ |
| **401 필드명** | `remaining_attempts` | **`remaining`** ❌ | `remaining_attempts` ✅ | **불일치** |
| **423 필드명** | `locked_until` | **`retry_at`** ❌ | `locked_until` ✅ | **불일치** |
| 앱 refund-rules 표 == 서버 규칙 | — | ✅ | ✅ | ✅ |

**영향**: 앱 `ManagerPinSheet.tsx` 의 `extractPinError` 가 `body.remaining_attempts` / `body.locked_until`을 읽으나 서버가 `remaining` / `retry_at`을 보내므로 오입력 시 "N attempts left" 메시지와 잠금 해제 시각이 UI에 표시되지 않음.

**권장 수정 방향**: 서버 #207이 계약 정본(`remaining_attempts` / `locked_until`)에 맞출 것.  
수정 위치:
- `apps/commerce-core/src/api/admin/pos/_shared/manager-pin.ts:VerifyResult` 타입 — `remaining` → `remaining_attempts`, `retry_at` → `locked_until`
- `apps/commerce-core/src/api/admin/pos/manager-pin/verify/route.ts` — 응답 직렬화 필드명
- `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` — 동일
- `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts` — 동일
- `integration-tests/pos/tenders.spec.ts` — `caught.data?.remaining` → `caught.data?.remaining_attempts`, `locked.data?.retry_at` → `locked.data?.locked_until`

---

## ⑤ CI pos-integration

GitHub check-runs API가 `403 Resource not accessible by integration`을 반환하여 CI 결과를 프로그래밍적으로 확인 불가.  
PR 본문: "로컬 DB 없어 CI로 판정" 명시. CI가 통과했다면 7개 시나리오(#44~#50)가 storeport integration test suite에서 실행된 것.

**CI 범위 확인**:
- #44 same-shift card_terminal void → receipt kind=void ✅ (테스트 코드 직접 확인)
- #45 cross-shift → 400 ✅
- #46 card_terminal no approval_code → 400 ✅  
- #47 wrong PIN → 401 · 5회 → 423 ✅
- #48 cash refund correct PIN → cash_movement · open_drawer=true ✅
- #49 double refund → 409 ✅
- #50 GET PIN + verify ✅

**누락 테스트**:
- CASH/QRIS 원거래 + card_terminal method → 400 (단일 명시 테스트 없음; #46이 card 원거래 대상)
- WIB 23:59→00:00 경계 PIN 전환 테스트 없음
- PIN 성공 후 카운터 리셋 명시 테스트 없음

**#206과 파일 겹침**: `tenders/route.ts`, `receipt/service.ts`, `fulfill/**` 미수정 ✅ (`tenders.spec.ts`만 수정, route.ts 미접촉)

---

## ⑥ 금지 파일 · 영어 · 선택지

| 항목 | 판정 |
|---|---|
| storeport: `fulfill/**` 미수정 | ✅ |
| storeport: `tenders/route.ts` 미수정 | ✅ |
| storeport: `receipt/service.ts` 미수정 | ✅ |
| fork: `app/orders/[orderId].tsx` 미수정 (#75 대기) | ✅ |
| 오류 메시지 영어 | ✅ |
| PR 선택지 3줄 (#207 §2, #77 §선택지 3줄) | ✅ |
| fork 어설션 50/50 PASS (PR 본문 주장) | 직접 실행 불가 (트리거 경로 없음) |

---

## 판정 요약

### storeport #207 — **CHANGES**

> **`apps/commerce-core/src/api/admin/pos/_shared/manager-pin.ts`, `verify/route.ts`, `void/route.ts`, `refund/route.ts`**: 401 응답의 `remaining` → `remaining_attempts`, 423 응답의 `retry_at` → `locked_until` 으로 변경 (M0-1105-AB 계약 정본 · M3-1105-AD §0 기준). 테스트도 동일하게 수정.

나머지 항목(PIN HMAC · admin auth · 수단 규칙 · 교대 검증 · Cash Movement · 이중처리 409)은 계약 충족.

### fork #77 — **APPROVE**

새 파일만, 기존 `app/orders/[orderId].tsx` 미수정. `lib/refund-rules.ts` 규칙 표가 Kyu 결정과 일치. `ManagerPinSheet` / `VoidRefundSheet` raw hex 0 · `showToast.*` 전용. 계약 key name은 앱 측이 정본(`remaining_attempts` / `locked_until`)을 사용하므로 서버 수정 뒤 그대로 동작.

단, 서버 #207이 fix되기 전까지 PIN 오류/잠금 UI 메시지는 silent fail. 주문 상세 연결은 다음 라운드(#75 뒤)로 명시 ✅.

---

## 재실행 로그

```
git fetch origin (pos-r0): origin/master 1b593ba → 697649a
git fetch origin (storeport): forced update feat/m0-1105-z-delivery-address
GitHub check-runs API: 403 Resource not accessible by integration
로컬 assertions 직접 실행: 앱 경로 없어 불가 (스크립트는 diff에서 확인 완료)
```

