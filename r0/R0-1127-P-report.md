storeport#478: APPROVE · CI 미확인(API 403) · 필수 0 · 권고 1
직접 실행: `PORT=21478 ... npx jest "cd-pos-sync-v4.spec.ts" -t "M0-1127-L"` → 2 passed (20.6s) · 가드 제거 → 1 failed (검증의 검증 ✅)

## 개요

- PR: storeport#478 `fix(commerce-core): M0-1127-L — 결제 끝난 주문에 "나중에 번호 입력" 소급`
- head: 36898387
- 변경 파일: 3 (service.ts · ask-phone-on-display/route.ts · cd-pos-sync-v4.spec.ts)
- CI: GitHub API 403 — check-runs 접근 불가 → 미확인 판정

## CI 상태

API 403 (GET /repos/.../commits/.../check-runs) — CI 미확인.

## REQ 1 · 중복 적립 방지

**결과: 이상 없음.**

두 진입점(`openPostSettlementPhoneEntry` / `askPhoneOnDisplayForOrder`) 모두 `withRegisterPhoneEntryLock(sessionId)` 로 감싸져 직렬화. lock 안에서 fresh re-read 후 `isPhoneEntryOpen(target, now)` 멱등 체크:

- Re-enter × 2: 두 번째 호출 → `snapshot_state==="paid" && isPhoneEntryOpen` → `{idempotent:true}` 반환
- Phone entry × 2: 동일 패턴
- 동시 Re-enter + Phone entry: 같은 `sessionId` lock 키 → 직렬화 → 먼저 실행된 쪽이 열고 나중은 멱등

이중 적립 경로 없음.

## REQ 2 · 거절 사유 정확도

### not_paid
가드: `if (!target.paid_at)` — `markSnapshotPaid` 를 호출한 적 없으면 거절.  
테스트 직접 확인: `M0-1127-L · 결제된 적 없는 주문에는 not_paid` → ✅ PASS  
가드 제거 → 해당 테스트 🔴 FAIL (검증의 검증 확인)

### new_cart_started
가드: `sibling.created_at > target.created_at` (expired sibling 포함) → 두 함수 모두 동일 로직.  
테스트: `A 결제 → Next customer → B 카트 시작 → A 재시도` → `new_cart_started` ✅ PASS

### void/refund
`apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` 는 CD snapshot 을 수정하지 않음 — `paid_at` / `snapshot_state` 그대로 보존. 이 PR 이전에도 `snapshot_state='paid'` 인 채로 phone entry 가 열렸으므로 **regression 아님** (기존 갭). `link_window_closed` 창 안에서 voided 주문에 phone entry 가능 — 별도 이슈 추적 권고.

## REQ 3 · 통합 테스트 직접 실행

```
경로: /Users/kyu.lee/projects/curiocity-relay-wts/M0-1127-L/apps/commerce-core

PORT=21478 TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules \
  npx jest --silent=false --runInBand --forceExit \
  "integration-tests/pos/cd-pos-sync-v4.spec.ts" -t "M0-1127-L"
```

결과:
```
✓ M0-1127-L · QRIS 결제 → Next customer → Re-enter · Phone entry 소급 · 새 카트 시작 뒤에는 new_cart_started (4392ms)
✓ M0-1127-L · 결제된 적 없는 주문에는 not_paid (snapshot.paid_at 없음) (2200ms)
Tests: 2 passed, 9 skipped — Time: 20.6s
```

**검증의 검증** — `service.ts:989` `if (!target.paid_at)` 블록 제거 후 재실행 (PORT=21479):
```
✕ M0-1127-L · 결제된 적 없는 주문에는 not_paid (snapshot.paid_at 없음)
Tests: 1 failed, 9 skipped, 1 passed
```
가드 제거 → 빨강 확인 ✅. 복원 완료.

## REQ 4 · PR 코멘트

storeport#478 에 리뷰 COMMENT 제출 완료 (자기 PR 이므로 APPROVE 불가 → COMMENT).  
첫 줄: `storeport#478 · APPROVE · CI 미확인(API 403) · 필수 0 · 권고 1`

## 권고 1 (비차단)

**`askPhoneOnDisplayForOrder` expired 소급 시 `customer_flow_state: "entering"` 미설정**

`openPostSettlementPhoneEntry`(Phone entry 경로)는 patch 에 `customer_flow_state: "entering"` + `phone_entry_state: "waiting"` 세팅. 반면 `askPhoneOnDisplayForOrder`(Re-enter 경로) expired 소급 patch 는 `phone_deferred=false, skipped_at=null, snapshot_state="paid"` 만.

서비스 주석 "라우트 호출자가 orchestrator 로 세팅" — route.ts 에서도 세팅 없음.

영향: `paidAge > PHONE_ENTRY_ABANDON_MS` (120s) 후 Re-enter 단독 사용 시 `isPhoneEntryOpen` → `hasInteraction=false` → `false` 반환 → CD keypad 미열림. 서버는 `{ok:true}` 반환이므로 POS 는 성공으로 보임 (silent failure).

현재 테스트는 phone-entry 먼저 → Re-enter 멱등 순서라 가려짐. Re-enter 단독 케이스 테스트 또는 patch 에 `customer_flow_state: "entering"` 추가 권고.
