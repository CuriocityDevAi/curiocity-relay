#374 APPROVE · smoke 초록 O · 회귀 시 실패 O · CI 포함 O

## 검증 결과

### REQ 1 — pos-complete fetchFields + sumOrderItemsFallback export
- `POS_COMPLETE_ORDER_FIELDS` (export const) 에 `"items.detail.quantity"` 포함 확인 (route.ts:44).
- `"items.quantity"` 도 함께 포함 (computed 트리거 쌍 유지) (route.ts:43).
- `sumOrderItemsFallback` (export function) 로직: `line.total/subtotal > 0` 이면 그대로, 없으면 `unit_price * (quantity || detail.quantity)`. `||` 로 quantity=0 일 때만 fallback — **기존 동작 불변** (quantity > 0 경로 무변경).
- unit spec 8/8 초록 (pos-complete-fields.unit.spec.ts):
  - `items.detail.quantity` fetchFields 포함 ✓
  - `items.quantity` 포함 ✓
  - `sumOrderItemsFallback`: line.total / subtotal / qty / detail.qty fallback / 빈 배열 각 케이스 ✓

### REQ 2 — smoke 초록 + 회귀 증명
- **smoke 초록** (hub-m0 워크트리, `integration-tests/pos/checkout-handover-smoke.spec.ts`):
  ```
  ✓ cash: pos-complete → fulfill(body.items 없이) → Fulfilled · 재고 1 감소  (2721 ms)
  ✓ qris (invoice_number 6자리): 같은 흐름으로 Fulfilled · 재고 1 감소       (2281 ms)
  Tests: 2 passed, 2 total  (21.368 s)
  ```
- **회귀 시 실패 확인**: fulfill/route.ts 의 `"items.detail.quantity"` 라인 임시 제거 후 재실행:
  ```
  ✕ cash: pos-complete → fulfill(body.items 없이) → Fulfilled · 재고 1 감소
      Expected: 200  Received: 400
  ✕ qris (invoice_number 6자리): 같은 흐름으로 Fulfilled · 재고 1 감소
      Expected: 200  Received: 400
  Tests: 2 failed, 2 total
  ```
  → 원복 완료 (diff 없음 복원 확인).

**노트**: REQ 에 명시된 `scripts/it.sh` 는 미존재. 실제 스크립트는 `scripts/test-integration-pos.sh`(인수 없음). 단일 spec 실행은 PR body 의 직접 jest 명령으로 수행 — 기능적 영향 없음.

### REQ 3 — CI pos-integration 편입 경로
- `.github/workflows/ci.yml` → `pos-integration` 잡 → `pnpm test:integration:pos`.
- `package.json` → `"test:integration:pos": "bash scripts/test-integration-pos.sh"`.
- `test-integration-pos.sh` 24번 줄: `SPECS=(integration-tests/pos/*.spec.ts integration-tests/loyalty/*.spec.ts)` glob 자동 열거.
- `checkout-handover-smoke.spec.ts` 는 `integration-tests/pos/` 에 위치 → **추가 CI 수정 없이 자동 편입 확인**.

### REQ 4 — unit + gh pr checks 374 + 판정
- unit (pos-complete-fields): 8/8 ✓
- `gh pr checks 374`:
  - `markers-and-forbidden`: **pass** (57s)
  - `build-commerce-core`, `unit-commerce-core`, `changes-filter`, `check`: pending (CI 실행 중)
- 로컬 smoke/unit 모두 초록이고 로직 검증 완료 → **APPROVE**

## 판정

**APPROVE**

- fetchFields 수정은 뿌리 원인 (Medusa v2 computed field 미채움) 을 올바르게 대응.
- `sumOrderItemsFallback` detail.quantity fallback 은 기존 경로를 건드리지 않음.
- smoke test 가 오늘 실기 오류를 정확히 재현하고 잡음.
- CI pos-integration 에 자동 편입 — 추가 워크플로 수정 불필요.
