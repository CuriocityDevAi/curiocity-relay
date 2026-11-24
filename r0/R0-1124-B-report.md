R0-1124-B-report
fork #247 CHANGES · storeport #416 CHANGES
계약 불일치: pos_order_num — POS가 snapshot에 PATCH 안 함 → 손님 화면 #N 항상 null

## 판정

| PR | 판정 | 주요 이유 |
|----|------|-----------|
| fork #247 (M1-1124-B) | CHANGES | CI 2건 FAIL + pos_order_num PATCH 누락 |
| storeport #416 (M2-1124-B) | CHANGES | CI 미실행 + pos_order_num 서버 자동 채움 없음 + dirty conflict |

---

## 1. 계약 일치 검토

### phone_entry_state / phone_partial
- #416: `waiting|typing|done|skipped` DB 컬럼·PATCH·DTO 모두 추가 ✅
- #247: `OrderSnapshot` 타입 확장 + `classifyPhoneStatus` 로직이 #416 DTO와 1:1 대응 ✅
- fallback(미배포 시): `phone_entry_open`, `pre_entry`, `skipped_at`, `pos_screen=loyalty_entry` 추론 ✅

### pos_order_num — ⚠️ 불일치
- #416 `PosChipBadge` 는 `snapshot.pos_order_num` 읽음
- #416 PATCH endpoint 에 `body.pos_order_num` 처리 로직 존재
- **#247 은 `posOrderNum` 을 로컬 draft list(`metadata.pos_order_num`)에서만 읽어 UI prop 으로 전달할 뿐 snapshot에 절대 쓰지 않음**
- 결과: 손님 화면 구석 `#N` 항상 null
- 수정 방향: 서버 자동 채움이 더 단순 — snapshot 생성/조회 시 `draft_order.metadata.pos_order_num` 에서 자동으로 `pos_order_num` 세팅 (#416 수정). POS 별도 PATCH 불필요.

---

## 2. 실시간 경로 / 최악 지연

손님 키패드 입력 → 150ms debounce → `sendPhonePartial` PATCH → `phone_partial` + `phone_entry_state=typing` DB 갱신
→ POS 700ms 폴링 → `useCustomerDisplaySnapshot` 쿼리 갱신 → `classifyPhoneStatus` → UI 반영

**최악 지연: 150 + 700 = 850ms** ✅ (허용 범위)

폴링 700ms 는 `waiting|typing` 상태에서만 적용, 그 외 10s — 조건 정확함 ✅ (배터리·API 부하 최소화).

`sendPhonePartial` fire-and-forget — 네트워크 drop 시 typing 갱신 누락 가능. 700ms 폴링이 보정. 허용 범위 (SSE는 별도 라운드).

---

## 3. #8 Checkout→Cash 이동 · 결제 완료 후 키패드 유지

### POS 쪽 (#247 D5)
- `checkout/[draftOrderId].tsx` 의 `useEffect` 에서 `cart_review` emit cleanup 제거
- 각 화면 unmount 에서도 `loyalty_entry` hint 를 되돌리지 않음 (`useAskPhoneOnDisplay` 설계)
- 결제 완료(`paid`) 후에도 `success` 화면에 `CustomerPhoneStatus` 존재 → Ask/Re-enter 가능

### 손님 화면 쪽 (#416 REQ 3)
- `leavingLoyalty` 조건 제거 → keypad 는 OK/Skip 로컬 이벤트 전까지 POS hint 무관 유지
- 테스트: `loyalty_entry → cart_building 전이 중에도 keypad 유지` ✅, `payment_cash → keypad 유지` ✅
- 결제 완료(`paid`) 에도 keypad 존재 → OK 누르면 `pre_entry=true` PATCH → phone_deferred(#414) 경로 ✅

**양쪽 변경이 맞물려 올바르게 동작** ✅

---

## 4. 6상태 색·아이콘 · semantic 토큰

| 상태 | 클래스 | 판정 |
|------|--------|------|
| ask | `border-line bg-surface` | ✅ semantic |
| waiting | `border-line bg-surface` | ✅ semantic |
| typing | `border-accent bg-accent-soft` | ❌ accent 금지 |
| done | `bg-success` | ✅ semantic |
| skipped | `border-line bg-surface` | ✅ semantic |
| busy | `border-warning bg-warning-soft` | ✅ semantic |

typing 상태 `border-accent` → `border-info`, `bg-accent-soft` → `bg-info-soft` 로 교체 필요.

---

## 5. CI 결과

### fork #247
| job | 결과 |
|-----|------|
| lint | ✅ pass |
| assertions | ❌ FAIL — `m2-1105-n-accent-guard`: `CustomerPhoneStatus.tsx:88` border-accent |
| flow-tests | ❌ FAIL — `m3-1105-bw.test.ts`: tender-cash Stack import 가드 위반 |
| playwright | ⏭ skipping |
| route | ✅ pass |

**assertions FAIL 상세**: `border-accent` D1 허용 파일 밖 사용 (1건). fix: `border-info bg-info-soft`.

**flow-tests FAIL 상세**: `checkout/tender-cash/[draftOrderId].tsx: headerLargeTitle 없음 > Stack import 없음 (Stack.Screen 제거 후)` — M1-1124-B 가 Stack 재추가. `m3-1105-bw.test.ts` 해당 케이스 갱신 필요.

참고: `Map.groupBy is not a function` unhandled error 는 Vitest reporter 의 Node.js 버전 이슈 (실제 테스트 로직 아님).

### storeport #416
`no checks reported on the 'feat/M2-1124-B-cd-live-phone' branch` — CI 전혀 실행 안 됨.
`mergeable_state: dirty` — base 충돌.
pos-integration(마이그레이션 적용) · customer-display 단위 테스트 미검증.

---

## 필수 수정 목록

### fork #247
1. `components/customer-display/CustomerPhoneStatus.tsx:88` — `border-accent bg-accent-soft` → `border-info bg-info-soft`
2. `app/checkout/tender-cash/[draftOrderId].tsx` + `tests/flows/m3-1105-bw.test.ts` — Stack 가드 케이스 갱신
3. `components/customer-display/useAskPhoneOnDisplay.ts` — pos_order_num PATCH 추가 또는 서버 B안 선택 시 미수정

### storeport #416
1. `apps/commerce-core/src/api/customer-display/snapshots/[id]/route.ts` 또는 lifecycle — `pos_order_num` 서버 자동 채움 추가
2. base 충돌 해소 + CI 실행
