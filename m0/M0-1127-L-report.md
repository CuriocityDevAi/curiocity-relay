PASS · PR #478 · head 36898387 · CI QUEUED (대기 없음) · 테스트: `M0-1127-L · QRIS 결제 → Next customer → Re-enter · Phone entry 소급 · 새 카트 시작 뒤에는 new_cart_started` · `M0-1127-L · 결제된 적 없는 주문에는 not_paid (snapshot.paid_at 없음)`

## 작업 요약 (M0-1127-L — 결제 끝난 주문에 "나중에 번호 입력" 소급)

브랜치: `fix/M0-1127-L-late-phone-entry` · base = main (b6f89c16 #474 머지 후).

### 뿌리

Kyu 실기 2026-11-27 14:08 — QRIS #211 결제 완료에 Re-enter / Phone entry 거절:
- Re-enter → `Order not paid yet` (= 서버 `not_paid` 코드)
- Phone entry → `Display not paired` (= 서버 `no_snapshot` 코드)

`apps/commerce-core/src/modules/register_session/service.ts` 의 두 함수:
- `askPhoneOnDisplayForOrder` (`/ask-phone-on-display`) : `peekAlive.length === 0` → `no_snapshot`; `target.snapshot_state !== "paid"` → `not_paid`.
- `openPostSettlementPhoneEntry` (`/phone-entry`) : 동일.

`nextCustomerForOrder` (Next customer 버튼) 또는 lifecycle 로 snapshot 이 `expired` 로 돌려지면 가드가 alive 만 보고 `no_snapshot/not_paid` 로 끝났다. 실제 사유는 "다음 손님 주문이 시작됨".

### 변경 (storeport)

1. `apps/commerce-core/src/modules/register_session/service.ts`
   - `openPostSettlementPhoneEntry` : `target` 선정을 `paid_at` 기준으로 (expired 포함) · `siblings` 로 `new_cart_started` 판정 (active 또는 target 보다 뒤에 만들어진 다른 주문의 snapshot) · expired snapshot 을 `paid` 로 되살림 · `customer_flow_state='entering'` 세팅.
   - `askPhoneOnDisplayForOrder` : 동일 개선 · return 유니온에 `new_cart_started` 추가.
2. `apps/commerce-core/src/api/admin/pos/orders/[id]/ask-phone-on-display/route.ts`
   - `409 new_cart_started` (`a newer order has started in this register`) 추가.
   - `not_paid` 문구 "snapshot is not paid yet" → "order has not been paid" (paid_at 기준으로 바뀜).
3. `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4.spec.ts`
   - `M0-1127-L · QRIS 결제 → Next customer → Re-enter · Phone entry 소급 · 새 카트 시작 뒤에는 new_cart_started` : Next customer 로 expired 된 뒤 Phone entry · Re-enter 둘 다 되살아남 · 카트 B 시작 뒤 Phone entry (200 eligible:false reason:new_cart_started) · Re-enter (409 type:new_cart_started).
   - `M0-1127-L · 결제된 적 없는 주문에는 not_paid (snapshot.paid_at 없음)` : 검증의 검증 (paid_at 없으면 not_paid 여야 함).

### 보존 (기존 테스트 전원 녹색)

cd-pos-sync-v4.spec.ts 11건 전부 통과 (기존 9 + 신규 2) — #474 유기 ghost 가드 · `new_cart_started` 원자화 · `phone_entry_busy` lock · Re-enter 번호 보존 · M0-1126-P A→B 이전 멱등.

### 검증의 검증 (완료)

`git stash` 로 service.ts 패치만 제거한 뒤 첫 M0-1127-L 테스트 실행 → **빨강** (expected `eligible: true`, received `false`) · stash pop 뒤 녹색 복귀.

### Kyu 확인 항목 (PR #478 본문 복붙 · 쉬운 말 3줄 · 세 입구)

- **Re-enter** (결제 완료 화면 우상단 칩): 결제 후 다음 손님 안 받은 상태면 번호 다시 받기 열린다.
- **Order 상세 Phone entry**: Next customer 버튼 눌렀더라도 새 카트 시작 전이면 그 주문 영수증 + 키패드 다시 뜬다.
- **Link customer** (Order 상세 PIN): 같은 백엔드 판정을 공유 — 결제된 적 있으면 번호 묻기 가능, 새 카트 시작 뒤에는 "다음 손님 주문이 시작됨" 으로 명확히 거절.

### 명세 (검색어: /phone-entry · peekAlive · not_paid)

충돌 없음 — #474 (M0-J) 와 같은 파일 · 순서상 뒤 · `specs/screens/pos-order-detail.md` `ORDER-PHONE-ENTRY` (새 주문 전까지 PIN 없이) · `ORDER-LINK-CUSTOMER` (PIN) · `specs/screens/pos-payment-flow.md` ④ Re-enter — 전부 유지. Link customer (PIN) 은 서버 레벨에서 같은 판정을 쓰지만 PIN 게이트는 POS 단 유지 (범위 밖).

### 확인·검증

- `pnpm typecheck` (commerce-core) : 녹색 (0 에러).
- `bash scripts/naming-check.sh` : 녹색 (meros 0 매치 · 모듈명 정합).
- `node scripts/feature-map-check.mjs --diff=origin/main` : 미분류 0 (내 세 파일 전부 `commerce-core.customer-display-snapshot` 에 매핑).
- 통합 테스트 11/11 녹색 (`pnpm test --testPathPattern="pos/cd-pos-sync-v4\\.spec"`).

### PR 링크

https://github.com/CuriocityDevAi/storeport/pull/478

### 결론

PASS · 45분 상한 내 완료 · 커밋·push·PR 승인 없이 바로 올림.
