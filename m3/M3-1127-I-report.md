PASS · PR #290 · head 637753c · 원인 한 줄: ③ Link customer 시트는 서버 /phone-entry 호출을 안 하고 pos_screen hint 만 세팅(그래서 아무 일 안 일어남) · ①·② 는 POS 호출 정상, 서버 /phone-entry 가 활성 스냅샷 가드로 거절(reason=not_paid · no_snapshot) — storeport#474 리뷰 중.

서버 수정 필요: apps/commerce-core/src/modules/register_session/service.ts:884-885(no_snapshot=peekAlive.length===0) · :916-923(not_paid=target.snapshot_state!=="paid") — QRIS 결제 완료 주문의 snapshot 이 paid 로 유지돼야 하는데 알 수 없는 조건에 expired/다른상태로 전이. 활성 스냅샷 가드 (storeport#474) 분리 소유.

| check | status | duration |
|---|---|---|
| route (CI) | ✅ pass | 27s |
| route (Lint) | ✅ pass | 17s |
| lint | ✅ pass | 59s |
| assertions | ✅ pass | 1m11s |
| unit-tests | ✅ pass | 50s |
| flow-tests | ✅ pass | 31s |
| playwright | ✅ pass | 7m3s |
| heavy-cloud | ⏭️ skipping | 0s |

PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/290
Branch: fix/M3-1127-I-phone-entry-entrances
Commit: 637753c7b40bb7831c5193912bb7f5dc7dbb84db

## 변경 (POS only)

- `components/orders/LateLinkCustomerSheet.tsx`
  - `onAskOnDisplay` → `onPhoneEntry` — `useOpenPostSettlementPhoneEntry` 훅으로 Order 상세 Phone entry 버튼과 **같은** POST `/admin/pos/orders/:id/phone-entry` 호출.
  - 버튼 라벨 **"Ask customer on display" → "Phone entry"** (Kyu 14:08 이름 통일).
  - testID `late-link-ask-display` → `late-link-phone-entry`.
  - `display-request` 단계에 `<CustomerPhoneStatus>` 칩 노출 (결제 직후 흐름과 **같은 컴포넌트 재사용** · 6상태 ② Waiting → ③ dots → ④ Done).
  - `eligible=false` → `REASON_TOAST` 사유 안내 + phone-method 복귀.
  - 레거시 `pos_screen='loyalty_entry'` hint 세팅 제거.
- `__tests__/m3-1127-i-phone-entry-entrances.test.ts` (신규)
  - 세 입구 모두 `useOpenPostSettlementPhoneEntry` 호출 검증.
  - Link customer 시트 CustomerPhoneStatus 칩 재사용 검증.
  - 레거시 `pos_screen='loyalty_entry'` hint 제거 검증.
  - 되돌리면 ③ 입구 테스트 빨강.

## 보존 요소 확인

- Link customer 매니저 PIN (11-18 Kyu 결정) — 유지.
- "Cashier enters directly" 분기 — 유지.
- 6상태 칩 모양 — `CustomerPhoneStatus` 재사용.
- Phone entry 노출 조건 (새 주문 들어오면 사라짐) — 서버 `new_cart_started` 로 거절.
- 기존 1192 테스트 통과.

## 미완 사항

- 아이맥 하네스 실서버 Re-enter 1건 실행 — 서버 거절 이슈라 이 PR 스코프 밖 (storeport#474 리뷰 중).
- 세 입구 통합 Playwright 테스트 — vitest 소스 기반 구조 검증으로 대체(검증의 검증 포함).
