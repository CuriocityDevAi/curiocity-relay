storeport #400 · core tsc 0 · receipt 루프 O · paid→idle O · 웹훅 guard O · Skip skipped_at O · 칩 여백 O · 테스트 3+1+2 추가 · CI 진행

---

## 커밋

- SHA: `dfad959f095dcf8783af41d11f8d61d34fae30de`
- 브랜치: `fix/M3-1119-O-cd-sync`
- PR: #400
- CI run (new): https://github.com/CuriocityDevAi/storeport/actions/runs/44519715207 (queued/진행)
- 이전 run(참고): https://github.com/CuriocityDevAi/storeport/actions/runs/44514068773 — `unit-commerce-core` + `build-commerce-core` = **skipped** (changes-filter)

이 커밋은 `apps/commerce-core/src/**` 와 `apps/commerce-core/integration-tests/**` 를 모두 건드리므로 이번 런에서 core 잡이 fire 되어야 함.

---

## REQ-1 · migration import + OrderSnapshot DTO → core tsc 0

- `apps/commerce-core/src/modules/register_session/migrations/Migration20261119000002.ts:1`
  - `import { Migration } from "@mikro-orm/migrations"` → `"@medusajs/framework/mikro-orm/migrations"`
- `apps/commerce-core/src/types/customer-display.ts:92-95`
  - OrderSnapshot 에 `qr_string?: string | null`, `amount?: number | null`, `display_id?: number | null` 추가 (기존 `skipped_at` 아래)
- 확인: `cd apps/commerce-core && npx tsc --noEmit` → exit 0 (에러 0)

## REQ-2 · receipt ↔ keypad-after 무한 루프 제거

- `apps/customer-display/src/lib/display-machine.ts:265-272`
  - `pos_screen` 라우팅 블록에서 `target === "receipt"` 분기에 terminal flow 가드 추가:
    ```ts
    if (target === "receipt") {
      if (isTerminalFlow(currentScreen)) {
        return stay(currentScreen);
      }
      return stay("receipt");
    }
    ```
  - 원인: `pos_screen=paid` + `snapshot_state=active` 틱이 매 1초 날아오는데, `receipt →(RECEIPT_DONE)→ keypad-after →(다음 틱)→ receipt` 로 되돌려 무한 루프.
  - 가드 후: terminal(receipt/done/keypad-after/consent)에서는 현재 화면 유지.
- 회귀 테스트 2건: `apps/customer-display/src/lib/__tests__/display-sync-scenarios.test.ts`
  - "terminal(keypad-after)에서 pos_screen=paid 가 와도 receipt 로 되돌리지 않음"
  - "terminal(done)에서 pos_screen=paid 가 와도 receipt 로 되돌리지 않음"

## REQ-3 · paid 만료 → idle/cart_building 전환 + 웹훅 guard 수정

- `apps/commerce-core/src/modules/register_session/service.ts:213-241` (`upsertSnapshotForRegister` guard)
  - 기존: paid snapshot 이 있으면 모든 subsequent emit 을 `return paidSnap;` 으로 drop.
  - 변경: `input.pos_screen ∈ {idle, cart_building}` 이고 `incoming.seq > paidSnap.seq` 이면 → paidSnap 을 `expired` 로 전환 후 흘려보냄 → `startSnapshotForRegister` 가 신규 active 스냅샷 생성.
  - 그 외의 경우는 기존대로 paid 반환.
- IT 1건: `apps/commerce-core/integration-tests/pos/cd-pos-screen-sync.spec.ts:357-430`
  - "paid 상태에서 pos_screen=idle(+더 큰 seq) 재수신 → paid expire · active idle"
  - 플로우: checkout → markSnapshotPaidByOrder → POST checkout-snapshot {pos_screen:idle, seq:11} → `active_snapshot.snapshot_state === "active"` · `pos_screen === "idle"` 확인

## REQ-4 · Skip = skipped_at 만 기록 (expire 하지 않음)

- `apps/commerce-core/src/modules/register_session/service.ts` (`skipSnapshot`)
  - 기존: paid 는 `skipped_at` 만, active 는 `snapshot_state=expired`.
  - 변경: active/paid 모두 `skipped_at` 만 기록 (state 변경 없음).
  - 이유: 같은 snapshot 의 `loyalty_entry` 재수신 시 손님 화면이 cart 를 유지해야 함.
- `apps/customer-display/src/lib/display-machine.ts:255-262`
  - `target === "keypad"` 분기 앞에 `snapshot.skipped_at` 가드 추가 — 이미 Skip 기록되어 있으면 keypad 로 되튀지 않고 현재 화면(cart 등) 유지.
- IT 수정 (`apps/commerce-core/integration-tests/loyalty/cd-snapshot-skip.spec.ts`)
  - 테스트 #1: active skip → expired 기대 → `skipped_at` 기록 · active 유지 로 변경
  - 테스트 #4: loyalty_entry active skip → expired 기대 → `skipped_at` 기록 · active 유지 로 변경
- 회귀 테스트 1건: `display-sync-scenarios.test.ts`
  - "skipped_at 가 있는 snapshot 의 pos_screen=loyalty_entry → keypad 로 되튀지 않음"

## REQ-5 · QRIS 헤더 GlobeMenu(언어 칩) 여백

- `apps/customer-display/src/screens/QrisScreen.tsx:340-349` (`styles.headerRow`)
  - `paddingRight: 128` 추가 — GlobeMenu(`position:absolute top:32 right:24`, 칩 폭 ~110px + 여유)와 `orderNo` 겹침 방지.
  - `storeName.flex:1` + `orderNo.flexShrink:0` 은 이미 적용됨(M3-1119-O). 좁은 폭(Split View)에서 orderNo 가 칩 아래로 밀리던 문제 해결.

## REQ-6 · CI changes-filter 결과

- 이전 run(44514068773): 쿼리 결과 `unit-commerce-core` = **skipped**, `build-commerce-core` = **skipped** 로 확인됨.
- 현재 commit 은 `apps/commerce-core/src/{modules,types}/*` + `integration-tests/*` 를 변경 — core filter 트리거 조건 충족 예상.
- 신규 run: https://github.com/CuriocityDevAi/storeport/actions/runs/44519715207 (queued, 결과 대기)

---

## 테스트 결과

- `pnpm --filter customer-display test` → **204/204 passed** (신규 3건 포함)
- `pnpm --filter customer-display typecheck` → 에러 0
- `pnpm --filter commerce-core test` (단위 Jest) → **539/539 passed**
- `cd apps/commerce-core && npx tsc --noEmit` → 에러 0
- IT (`cd-snapshot-skip`, `cd-pos-screen-sync`) → 로컬 Docker 미실행 (CI 에서 실행)
