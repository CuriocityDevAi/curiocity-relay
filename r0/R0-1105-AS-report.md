# R0-1105-AS 리뷰 리포트

**날짜**: 2026-11-10  
**리뷰어**: R0 (claude-sonnet-4-6)  
**대상**: storeport #205 (엄격) · fork #71 · fork #72

---

## ① storeport #205 — fix/m0-1105-y-fulfill-provider · 14a0e4f

### 판정: **CHANGES**

### (a) CI 결과 — integration 잡 실패

```
pos-integration: FAIL (1m56s)
Tests: 10 failed, 33 passed, 43 total
```

**#39~#43 전부 FAIL.** 공통 원인:

```
[M0-1105-Y] fulfillment polyfill failed (fulfilled:false):
  Value for FulfillmentItem.barcode is required, 'undefined' found
```

| 테스트 | 기대 | 수신 | 실패 위치 |
|--------|------|------|-----------|
| #39 takeaway hand_over → fulfilled:true | true | false | tenders.spec.ts:1985 |
| #40 preorder paid_full → fulfilled:true | true | false | tenders.spec.ts:2043 |
| #41 stuck 재누름 → fulfilled:true | true | false | tenders.spec.ts:2091 |
| #42 repair dry_run=false → repaired≥1 | ≥1 | 0 | tenders.spec.ts:2167 |
| #43 2회 누름 → fulfilled:true | true | false | tenders.spec.ts:2240 |

### 뿌리 분석

`fulfillmentModule.createFulfillment()` 를 Medusa 2.17 에서 호출하면 `FulfillmentItem` 엔티티에 `barcode` 필드가 required. 두 곳 모두 items 를 구성할 때 `barcode` 를 미포함:

**`repair-stuck-fulfillments/route.ts` — `buildPolyfillItems` 반환 객체 (신규):**
```ts
// barcode 누락
return {
  title: ..., sku: skuChain, quantity: ..., line_item_id: ...,
};
```
→ `barcode: metaSku ?? variantSku ?? ""` (또는 `null`) 추가 필요.

**`fulfill/route.ts` — 기존 M0-1105-T 폴백 polyfill 경로 (변경 없이 상속):**  
동일한 `createFulfillment` items 구성에 `barcode` 미포함.  
→ 같은 fix 적용 필요.

### (b) medusa-config 변경 검증

- 블록 1건만 추가 (`@medusajs/medusa/fulfillment`) ✓  
- 기존 config 에 fulfillment 블록 없었음 → 덮어쓰기 없음 ✓  
- 배포 첫 부팅 마이그레이션: 불필요 (fulfillment schema 는 이미 존재 · provider 등록은 런타임 등록만) ✓  
- CLAUDE.md §0 예외 범위 (이 블록 1건만) ✓

### (c) 로직 검증 (코드 레벨 — CI 통과 전제로)

- `handed_over_at` 조건부 기록 (fulfilled=true 일 때만) ✓  
- 가드 = `packed_at && !canceled_at` 있는 fulfillment row ✓  
- 2회 누름 재고 1회 (`inventory_decremented_at` 플래그 + reservation 소진 heuristic) ✓  
- repair dry_run 기본 true ✓  
- repair 재고 무개입 (fulfillment row 재생성만) ✓  
- 대상 선별: `handed_over_at` 있는데 `packed_at` 있는 row 없는 주문만 → 정상 주문 건드리지 않음 ✓

### (d) 응답 계약

- `fulfilled: boolean` + `fulfillment_warning?: string` 추가 ✓  
- 기존 앱(fork master): 추가 필드만 → 기존 앱 파괴 없음 ✓  
- `already_fulfilled:true` 경로에도 `fulfilled: true` 포함 ✓

### CHANGES 요약

> **필수 수정**: `FulfillmentItem.barcode` 누락 — #39~#43 전부 실패.  
> 1. `repair-stuck-fulfillments/route.ts` `buildPolyfillItems` 반환 객체에 `barcode: metaSku ?? variantSku ?? ""` 추가.  
> 2. `fulfill/route.ts` 폴백 polyfill items 구성에 동일 fix.  
> 로직 (B/C 가드 재편 · medusa-config 블록 · repair 도구 설계) 은 정상.

---

## ② fork #71 — chore/m2-1105-y-eas-dev-build

### 판정: **APPROVE**

### 체크리스트

| 항목 | 결과 |
|------|------|
| expo-dev-client `^58.0.18` 추가 (SDK 58 호환) | ✓ |
| Expo Go 실행 영향 | 0 (BLE 모듈 dynamic require + try/catch graceful fail — PR 본문 명시) |
| eas.json development 프로필 | `developmentClient: true` · `distribution: internal` · `ios.simulator: false` · `resourceClass: m-medium` · `channel: development` ✓ |
| bundle id | `id.meros.pos` ✓ |
| runbook 처음 하는 사람 기준 | 6단계 (① 로그인 · ② iPad 등록 · ③ 빌드 · ④ 설치 · ⑤ 매일 · ⑥ 막힐 때) + 예상 화면 출력 포함 ✓ |
| run-all assertions | 21/21 PASS (m1-1105-ad 스크립트는 #72 범위 · #71 미포함) |
| 번들 가드 (m2-1105-q) | PASS ✓ |
| origin/master 충돌 | 없음 (merge-tree clean) ✓ |

### 비고

- `package-lock.json` 에 `expo-dev-client` 의존 트리 (`expo-dev-launcher`, `expo-dev-menu`, `expo-dev-menu-interface`, `expo-manifests`, `expo-updates-interface`) 정상 추가.  
- 일부 기존 dev-only 패키지 (`dev: true` → 제거) 는 `expo-dev-client` 의존 트리가 `peer` 로 끌어오면서 발생한 lockfile 재계산 — 의도된 동작.  
- Sentry secret 주입 (`eas secret:create`) 은 머지 후 Kyu 가 수동 실행 (runbook ⑥ 참조).

---

## ③ fork #72 — feat/m1-1105-ad-picker-selected

### 판정: **APPROVE**

### 체크리스트

| 항목 | 결과 |
|------|------|
| 선택 = selected/on-selected 토큰 | `chipContainer`: `border-selected bg-selected` · `chipLabelClass`: `text-on-selected font-semibold` ✓ |
| ColorPicker 견본 가림 | `colorChipContainer`: `border-selected` ring만 · `bg-surface` 유지 → swatch 완전히 보임 ✓ |
| bg-ink 선택 0 어설션 (22/22 PASS) | §1~§6 전부 PASS 로컬 확인 ✓ |
| #70(방금 머지 · master 갱신)과 충돌 | 없음 (merge-tree clean) ✓ |
| run-all 22/22 | PASS ✓ |

### 세부 확인

- **pickerChipStyles.ts** (신규 헬퍼):  
  `chipContainer` / `chipLabelClass` → OptionChip (M1-1105-AC #68) 토큰 미러링 ✓  
  `colorChipContainer` / `colorChipLabelClass` → ring-only variant ✓

- **OptionPicker / SizePicker**: `bg-ink` / `border-ink` 완전 제거 · ✓ check 추가 ✓  
- **ColorPicker**: `bg-ink` / `border-ink` 완전 제거 · swatch 위 ✓ check 추가 · swatch 색상 보존 ✓  
- **OptionChip 회귀 가드 (§5)**: `border-selected bg-selected` + `text-on-selected` 그대로 ✓  
- **Button.tsx 제외**: 올바르게 exclusion 처리 ✓

---

## 종합

| PR | 판정 | 핵심 |
|----|------|------|
| storeport #205 | **CHANGES** | CI pos-integration FAIL · #39~#43 전부 fail · `FulfillmentItem.barcode` 누락 |
| fork #71 | **APPROVE** | expo-dev-client + runbook · run-all 21/21 · 충돌 없음 |
| fork #72 | **APPROVE** | selected/on-selected 토큰 완전 적용 · run-all 22/22 · 충돌 없음 |
