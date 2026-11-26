PASS · #454 commit 7eb3be371fb5b31a11ed86ace1f09dd56819a3ec · 판단: R0 의 `prevSnapshot !== null` 가드는 null 일 때 Rule E 잠금을 "풀어" 올바른 방향이나 prev!=null · 다른 id 케이스까지는 포함하지 못해, 원칙 "POS 가 이긴다" 를 위해 Rule E 의 `stay(currentScreen)` 블록을 전면 제거했다.

## 원장 대사
- ledger: ledger/decision-cd-pos-sync-v3-20261126.md V3-1 🔴 stopper
- 선행: R0-1126-S CHANGES 1건 (CD display-machine Rule E · r0/R0-1126-S-report.md REQ 2)

## 증상 (재현 경로)
`apps/customer-display/src/lib/display-machine.ts` 수정 전:

```
틱 N  (V3-1 서버 fix 반영 후)
  snapshot=null · prevSnapshot=#196 · currentScreen="receipt"
    → isTerminalFlow("receipt") = true
    → pos_screen != idle · newCheckoutStatus/Pos = false (snap=null)
    → fall-through → `!snapshot` 분기 → stay("receipt")
    → 다음 state: prevSnapshot ← null

틱 N+1 (신규 주문 B 도착)
  snapshot=B · prevSnapshot=null · currentScreen="receipt"
    → isTerminalFlow = true
    → newCheckoutStatus: B.status=checkout ✓ · B.id !== undefined ✓ · !paid ✓
    → return stay("receipt")           ← STOPPER
```

## 판단 2줄 (R0 제안 평가)
R0 가 제안한 `prevSnapshot !== null` 추가는 null 틱으로 prev 가 null 로 변한 뒤의 Rule E 잠금을 "풀어" 올바른 방향이다 (막는 방향이 아님). 그러나 prev!=null · 다른 id 케이스에서도 터미널을 덮어야 한다는 원칙("POS 가 이긴다")을 충족하려면 가드만 추가하는 선에서 멈추지 않고 Rule E 의 `stay(currentScreen)` 블록을 전면 제거하고 pos_screen 라우팅에 맡겨야 한다.

## 고침 (코드 변경)
`apps/customer-display/src/lib/display-machine.ts` isTerminalFlow 블록:
1. **`stay(currentScreen)` 블록 제거** — 다른 id 새 cart/checkout/paid 는 아래 pos_screen 라우팅이 담당 → 즉시 그 주문 화면으로 전환.
2. **null 2 틱 연속 (prev 도 null) → main** — 서버 stale drop 뒤 "활성 없음" 지속 시 과거 영수증 해제. 1 틱 transient null 은 grace 유지.
3. **pos_screen=idle → main** 은 기존 유지 (다음 손님 버튼).
4. 같은 id paid/keypad 보호는 하위 paid 분기 + M2-1124-B keypad lock 이 그대로 담당 (Case 2 보존).

## 자기 검증 로그 (돌려본 실측)

### ① 단위 테스트 5 케이스 (`display-machine.test.ts`)
`pnpm exec vitest run src/lib/__tests__/display-machine.test.ts`
```
Test Files  1 passed (1)
     Tests  81 passed (81)
  Duration  204ms
```
신규 "M0-1126-G POS wins (terminal 복귀)" describe · 5 케이스 포함:
- ① receipt + prev=#196 + null → 다음 틱 B(cart_building) → cart
- ② receipt + prev=null + B(cart_building) → cart
- ③ receipt + prev=#196 + 같은 id paid 재수신 → receipt 유지
- ④ keypad + 같은 id loyalty_entry → keypad 유지 (Case 2)
- ⑤ receipt + null 2 틱 연속 → main

### ② CD lib 전체 unit (`__tests__/**`)
`pnpm exec vitest run src/lib/__tests__/`
```
Test Files  10 passed (10)
     Tests  211 passed (211)
  Duration  288ms
```
기존 Rule E / P-2 / M3-1119-R 등 회귀 없음 (pos_screen 없는 레거시 스냅샷은 status fallback 으로 터미널 유지 → 테스트 호환).

### ③ CD app 전체 unit (pre-push hook 로 자동 실행)
```
apps/customer-display test:  Test Files  16 passed (16)
apps/customer-display test:       Tests  318 passed (318)
```

### ④ commerce-core `cd-pos-sync-v3` 통합 테스트
`bash apps/commerce-core/scripts/it.sh cd-pos-sync-v3`
```
PASS integration-tests/pos/cd-pos-sync-v3.spec.ts (10.817 s)
  M0-1126-F · CD ↔ POS v3 (Kyu 11-26 14:19 WIB 실기)
    ✓ V3-1 · paid+skipped snapshot 이 30초 넘기면 GET active = null (670 ms)
    ✓ V3-1 · 이어서 주문 B 담기 → GET active = B (A 아님) (747 ms)
    ✓ V3-2 · markSnapshotPaidByOrder 가 receipt.store.name/address 를 담는다 (423 ms)
Tests:       3 passed, 3 total
```

### ⑤ commerce-core 전체 unit (pre-push hook 로 자동 실행)
```
apps/commerce-core test: Test Suites: 75 passed, 75 total
apps/commerce-core test: Tests:       869 passed, 869 total
```

### ⑥ CD e2e (dist 재빌드 후 · R0 관찰 "낡은 dist 로 실패" 해소)
`pnpm build` → `pnpm exec playwright test cd-pos-sync-v2.spec.ts cd-flow-overlap.spec.ts`
```
Running 17 tests using 2 workers
  ✓ cd-pos-sync-v2.spec.ts · CD-1 null → main (welcome)
  ✓ cd-pos-sync-v2.spec.ts · CD-1 stale paid+skipped → main
  ✓ cd-pos-sync-v2.spec.ts · CD-2/3 paid+none → receipt 좌 1/3 + Payment complete 우 2/3
  ✓ cd-pos-sync-v2.spec.ts · CD-4 3s (±0.5s) 유지 후 keypad sheet · 영수증 remount 안 됨
  ✓ cd-pos-sync-v2.spec.ts · CD-5 POS reset 후 빈 building → main
  ✓ cd-flow-overlap.spec.ts · 507×834 main/cart/keypad/qris/receipt/done (6)
  ✓ cd-flow-overlap.spec.ts · 507×500 main/cart/keypad/qris/receipt/done (6)
  17 passed (3.8s)
```

## 범위 (건드린 파일)
- `apps/customer-display/src/lib/display-machine.ts` (+30 / −22)
- `apps/customer-display/src/lib/__tests__/display-machine.test.ts` (+130 / −2)

처음 지시된 "같은 PR · 새 PR 금지" 준수 — `feat/M0-1126-F-cd-pos-sync-v3` 브랜치에 commit 추가 (PR #454). `apps/commerce-core/` · CD e2e 코드는 수정 없음 (서버 V3-1 로직은 이미 올바르다고 R0 REQ 1 에서 검증 완료).

## 커밋
`7eb3be371fb5b31a11ed86ace1f09dd56819a3ec` — `fix(cd): M0-1126-G — Rule E stopper (POS 가 이긴다 · receipt↔신규주문 stuck 해소)` · `processes: [customer-display.cd-checkout]`
