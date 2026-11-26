#454 APPROVE

원장: decision-cd-pos-sync-v3-20261126 V3-1 · decision-cd-pos-sync-v4-20261126 V4-4
커밋: M0-1126-G(7eb3be3) · M0-1126-H(5695191)
브랜치: feat/M0-1126-F-cd-pos-sync-v3 (dist 재빌드 포함)

---

## 직접 실행 결과

```
# commerce-core it cd-pos-sync-v3
bash apps/commerce-core/scripts/it.sh cd-pos-sync-v3

PASS integration-tests/pos/cd-pos-sync-v3.spec.ts (11.174s)
  ✓ V3-1 · paid+skipped snapshot 이 30초 넘기면 GET active = null (850ms)
  ✓ V3-1 · 이어서 주문 B 담기 → GET active = B (A 아님) (758ms)
  ✓ V3-2 · markSnapshotPaidByOrder 가 receipt.store.name/address 를 담는다 (450ms)
Tests: 3/3 PASS

# CD unit
pnpm --filter customer-display test

Test Files  16 passed (16)
Tests  327 passed (327)  Duration 394ms

# CD e2e (pnpm build:web → dist 재빌드 후)
pnpm exec playwright test

8 skipped
139 passed (19.3s)

# cd-pos-sync-v4-qris-none spec
✓ tendering + qris + customer_flow=none → QR screen + Enter phone button (434ms)
✓ tendering + qris + customer_flow=none + no qr_string → Preparing placeholder (299ms)
2/2 PASS
```

---

## G (7eb3be3) — Rule E stay(currentScreen) 전면 제거

### REQ 1 · 5케이스 검증

**(a) 같은 주문 paid 재수신 → 영수증 유지**
Rule E stay 제거 후 fall-through → 하위 paid 터미널 lock 처리. 테스트 ③ OK.

**(b) 같은 주문 번호 입력 중(keypad lock) 유지**
M2-1124-B keypad lock이 그대로 담당. Rule E에서 손대지 않음. 테스트 ④ OK.

**(c) 1틱 일시 null에 깜빡이지 않음**
신규 조건: `snapshot === null && prevSnapshot === null` → main.
첫 번째 null 틱에서는 prevSnapshot이 아직 non-null이므로 조건 false → fall-through.
display-machine 하위 null 처리가 receipt 유지. 테스트 ①⑤ t1=receipt 확인.

**(d) null 2틱 → 대기화면**
테스트 ⑤: t1(null, prev=prev196) → receipt / t2(null, prev=null) → main OK.

**(e) 다른 id 새 주문 → 즉시 전환**
테스트 ①: receipt + null 틱 → 다음 틱 B(cart_building) → cart
테스트 ②: receipt + prev=null + B → 즉시 cart OK.

### 레거시 스냅샷(pos_screen 없음) 회귀
기존 테스트 `"on done + new checkout snapshot (different id, pos_screen 없음) → stay on done (status fallback)"`:
Rule E stay 제거 후 status fallback 경로가 동일하게 처리. 211/211 전체 포함 통과. 회귀 없음.

---

## H (5695191) — selectCdView QRIS 전이

### REQ 2 · 전이 검증

**tendering+qris+none → qris-full**
cd-screen-selector.ts:94 — `phase === "tendering" && tender?.method === "qris"` 조건 직접 구현.
단위 테스트 57/57 포함.

**entering → phone-flow left=qris**
단위 테스트: `"tendering + qris + entering → phone-flow, leftPanel=qris"` OK.

**paid → receipt-full**
단위 테스트: `"paid + qris + none → receipt-full"` OK.

**나눠결제 QRIS (is_split=true)**
단위 테스트: `"나눠결제 (is_split=true) + qris + none → qris-full"` OK.

**Enter phone 버튼 → start_entry · 서버 전이표 허용 여부**
`apps/commerce-core/src/lib/customer-flow/transitions.ts:29-33`:
```ts
case "start_entry":
  if (current === "none" || current === "skipped") {
    return { ok: true, next: "entering" };
  }
```
`current === "none"` 명시 허용 → tendering+none 상태에서 start_entry 발송 가능. ✓

---

## REQ 3 — isPostSettlementStale 통과 유지

cd-pos-sync-v3 IT 3/3 직접 실행으로 확인. V3-1(paid+skipped>30s stale drop), V3-2(store.name/address fallback) 모두 PASS.

---

## 판정

전 체크 통과. 머지 가능.
PR 코멘트 제출 완료: https://github.com/CuriocityDevAi/storeport/pull/454
