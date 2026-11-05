---
round: M3-1105-B
pr:
  fork: agilo-medusa-pos-fork#27
commit: (branch feat/m3-1105-b-detail-stock · base master 26b9894)
outcome: 상세 시트 재고 상태 줄 + Add to cart 가드 · 품절 서버 호출 차단 · unknown fail-open · 그리드 동작 변화 0
kyu_checks: 5 (sold-out / low / in-stock / unknown / 그리드 무회귀 — 아이패드 재확인)
---

# M3-1105-B · 상세 시트 재고 가드 (디자인 보드 11)

**일자**: 2026-11-05 · **허브**: M3 · **성격**: Kyu 11-05 C2 개선 · M2-1105-A §3-B 디자인 보드 11 · 영어 UI · 색 토큰만 (상시 ⓒ) · 상시 ⓐ (#25 하네스 복제).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | `computeInventoryStatus` 를 공용 util 로 뽑아 재사용 (`lib/inventory.ts` 신규) | ✓ |
| 2 | 그리드 동작 변화 0 (M3-1104-A 품절 흐림·토스트 · 색 배지 유지) | ✓ (re-export · `<= 5` → `LOW_STOCK_THRESHOLD`) |
| 3 | 상세 시트에 재고 상태 줄 (`StockLine`) 4 분기 | ✓ (in-stock/low/sold-out/unknown · 영어 전용 · 토큰만) |
| 4 | QuantityPicker `max` 가드 (남은 수량에서 멈춤) | ✓ |
| 5 | sold-out: 수량 0 고정 · 스테퍼 비활성 · 버튼 회색 "Sold out" · **서버 호출 자체 안 함** | ✓ (`onPress` early-return + `disabled` + 레이블 분기) |
| 6 | unknown: fail-open 유지 (M0-1103-A) · 버튼 활성 | ✓ |
| 7 | 금지 파일 (api/hooks · contexts · lib/secure-storage · package.json · app.json · lib/printer) 무수정 | ✓ |
| 8 | 영어 전용 (ADDENDUM §2) | ✓ |
| 9 | 색 토큰만 — 상시 ⓒ 35/35 유지 | ✓ |
| 10 | 상시 ⓐ Playwright — #25 하네스 복제 + 4 mock | ✓ **24/24 pass** |
| 11 | 상세 시트 스샷 4 장 | ✓ `docs/M3-1105-B-detail-{in-stock,low,sold-out,unknown}.png` |

---

## 1. 산출물 (fork PR #27 · base master `26b9894`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `lib/inventory.ts` | **신규** · `computeInventoryStatus` + `InventoryStatus` 타입 + `LOW_STOCK_THRESHOLD=5` 상수 | 33 |
| `components/product/StockLine.tsx` | **신규** · 상태 점 + 레이블 React.FC · 영어 전용 · 토큰만 (success/warning/danger/ink-subtle + ink-muted) | 55 |
| `app/product-details.tsx` | StockLine 렌더 + `useEffect` 수량 클램프 (hooks 규칙 준수 · 조건부 return **앞**) + `QuantityPicker` `max/min/disabled` 가드 + `Button` 레이블/disabled 분기 + `onPress` early-return (서버 호출 없음) | +46 / -11 |
| `app/(tabs)/products.tsx` | 로컬 `computeInventoryStatus` 삭제 → `lib/inventory` import + re-export · `<= 5` 매직넘버 → `LOW_STOCK_THRESHOLD` | +4 / -32 |
| `scripts/m3-1105-b-playwright.mjs` | **신규** · #25 하네스 패턴 복제 (mock /auth · /admin/* · 로그인 플로 · setup wizard 자동 통과) + 4 mock 시나리오 상세 시트 어설션 | 352 |
| `docs/M3-1105-B-detail-*.png` | 4 상태 상세 시트 스샷 (full page) | — |

**총 변경** 8 파일 (수정 2 · 신규 6) · M3-1104-A/M3-1105-A/M0-1103-A/B 로직 무회귀.

---

## 2. 디자인 보드 11 매핑 (실측)

| kind | threshold | dot (`bg-*`) | line (영어) | 수량 | +button | Add to cart | 서버 |
|------|-----------|--------------|-------------|------|---------|-------------|------|
| `in-stock` | `total > 5` | `bg-success` 초록 | **In stock · N left** | 1 ~ N | ≥ N 비활성 | 활성 **Add to cart** | 호출 ✓ |
| `in-stock` | `total <= 5` | `bg-warning` 주황 | **Low stock · N left** | 1 ~ N | ≥ N 비활성 | 활성 **Add to cart** | 호출 ✓ |
| `sold-out` | `total = 0` | `bg-danger` 빨강 | **Sold out · 0 left** | **0 고정** | **처음부터 비활성** | 비활성 **Sold out** (회색) | **호출 ✗** |
| `unknown` | — | `bg-ink-subtle` 회색 | **Stock unknown** | 1 ~ ∞ | 활성 (상한 없음) | 활성 **Add to cart** | 호출 ✓ (fail-open) |

---

## 3. 검증 (실행 로그)

### 색 어설션 35/35 (상시 ⓒ · 회귀 없음)

```
$ node scripts/m3-1105-a-color-assertions.mjs
35/35 passed · 0 failed
```

### Playwright 24/24 (상시 ⓐ · 4 mock × 5 어설션 + 로그인/wizard + 에러)

```
$ node scripts/m3-1105-b-playwright.mjs
--- (1) 로그인 플로 ---
  ✓ (1) 로그인 후 /login 이탈 (SecureStore polyfill 작동)
  ✓ (2) /products 도달 (setup wizard 자동 통과)
--- (3) Kopi Tubruk (qty=12) ---
  ✓ (3a) "In stock · 12 left" · (3b) success · (3c) "Add to cart" · (3d) 활성 · (3e) 상한 12 가드
--- (3) Teh Tarik (qty=3) ---
  ✓ (3a) "Low stock · 3 left" · (3b) warning · (3c) "Add to cart" · (3d) 활성 · (3e) 상한 3 가드
--- (3) Cheese Bread (qty=0) ---
  ✓ (3a) "Sold out · 0 left" · (3b) danger · (3c) "Sold out" · (3d) disabled · (3e) + 처음부터 비활성
--- (3) Nasi Goreng (qty=undefined) ---
  ✓ (3a) "Stock unknown" · (3b) muted · (3c) "Add to cart" · (3d) 활성 · (3e) fail-open · + 활성 유지
--- (4) 에러 수집 ---
  ✓ (4a) 신규 console.error 0건 · (4b) 신규 pageerror 0건 (master 베이스라인 React #418 제외)

24/24 passed · 0 failed
```

### TypeScript · ESLint

```
$ npx tsc --noEmit
app/_layout.tsx(6,8): error TS2882: ../global.css ← pre-existing on master
(신규 에러 0)

$ npx eslint ...
0 errors
```

### 4 상세 시트 스샷

- `docs/M3-1105-B-detail-in-stock.png` — Kopi Tubruk · 초록 점 · "In stock · 12 left" · + 12 가드 · Add to cart 활성.
- `docs/M3-1105-B-detail-low.png` — Teh Tarik · 주황 점 · "Low stock · 3 left" · + 3 가드 · Add to cart 활성.
- `docs/M3-1105-B-detail-sold-out.png` — Cheese Bread · 빨간 점 · "Sold out · 0 left" · 수량 0 고정 · 스테퍼 전부 회색 · 큰 **Sold out** 회색 버튼.
- `docs/M3-1105-B-detail-unknown.png` — Nasi Goreng · 회색 점 · "Stock unknown" · 상한 없음 · Add to cart 활성.

---

## 4. 설계 포인트

### 4-1. 그리드 동작 "변화 0" 를 위한 데이터 분기 (Playwright mock)
- 그리드가 sold-out 로 판정하면 M3-1104-A 토스트 → 상세 진입 **불가**. Playwright 가 sold-out 상세를 어설션하려면 그리드 레벨에선 **unknown** 로 보여야 함.
- Medusa v2 는 `GET /admin/products` list 응답에 `variant.inventory_quantity` 비포함 (M0-1103-A 뿌리). Playwright mock 은 이 실제 동작을 재현:
  - 리스트: `manage_inventory=false` → `computeInventoryStatus` = `unknown` → 탭 허용 → 상세 진입.
  - 상세 (`GET /admin/products/:id`): 각 시나리오별 재고 반환.
- 그리드가 미래에 `inventory_quantity` 포함하도록 바뀌어도 이 mock 패턴은 "list 는 숨김 + detail 은 공개" 라는 실제 Medusa 거동을 그대로 유지.

### 4-2. Hooks 규칙 준수 — early-return 앞 `useEffect`
- 초기 구현에서 수량 클램프 `useEffect` 를 `isLoading` early-return **뒤** 에 뒀더니 React error #310 ("Rendered more hooks than during the previous render") 발생.
- 수정: `computeInventoryStatus(productQuery.data?.product.variants ?? [])` 를 선행 계산 + `useEffect` 를 조건부 return **앞** 으로 이동. loading 중에도 effect 가 fire 하지만 데이터 없을 땐 `inventoryStatus.kind='unknown'` · 클램프 no-op.

### 4-3. #25 (M1-1105-B) 하네스 사전조건
- 하네스는 로그인 시 `SecureStore.setItemAsync` 호출. SDK 58 웹 빌드의 `expo-secure-store` 폴리필 부재 → TypeError. `safeSetSecureItem` 이 TypeError 를 swallow 하지만 하네스 `/products` 이동 조건이 `location.pathname !== '/login'` 라서 setState 가 반영되기 전엔 통과 안 됨.
- 해법: PR 본문에 테스트 전용 1회성 polyfill (`node_modules/expo-secure-store/build/ExpoSecureStore.web.js` localStorage 백엔드) 치환 명령 포함. 커밋에 **포함 안 함**. #25 머지 뒤 자동 해소.

### 4-4. 공용 util 재사용 (그리드·상세 단일 진실)
- `computeInventoryStatus` 가 `lib/inventory.ts` 로 이주 · `app/(tabs)/products.tsx` 는 re-export 로 하위 호환 유지. 이후 Cart (M3-1104-B P2) · 영수증 재고 · OrderDetail 재고 요약 등 재사용 시 동일 util.
- `LOW_STOCK_THRESHOLD=5` 는 그리드 배지 임계값과 상세 라인 임계값을 **1 상수** 로 통일. 디자인 조정 시 1 지점.

---

## 5. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = `app/product-details.tsx` + `components/product/StockLine.tsx` (신규) + `lib/inventory.ts` (신규) + `app/(tabs)/products.tsx` (re-export) | ✓ |
| 금지 파일 (`api/hooks/**` · `contexts/**` · `lib/secure-storage.ts` · `package.json` · `app.json` · `lib/printer/**`) 무수정 | ✓ |
| 그리드 동작 변화 0 (M3-1104-A · M0-1103-A/B 로직) | ✓ (re-export · 매직넘버만 상수화) |
| 문구 전부 영어 (ADDENDUM §2) | ✓ (In stock · Low stock · Sold out · Stock unknown · N left · Add to cart · Sold out) |
| 색 토큰만 — 상시 ⓒ | ✓ **35/35 유지** |
| sold-out = 서버 호출 자체 없음 | ✓ (`onPress` early-return · `disabled` props) |
| unknown = fail-open | ✓ (`disabled={!selectedVariant \|\| isSoldOut}` — unknown 은 isSoldOut=false) |
| 상시 ⓐ Playwright (#25 하네스 복제) · 4 mock | ✓ **24/24** |
| 상세 시트 스샷 4 장 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (디자인 보드 11 · Kyu C2 개선 — 상세 시트 재고 상태 가시화 + Add to cart 가드) |
| 등재 | +1 (`lib/inventory.ts` 공용 util · 이후 Cart / OrderDetail 재고 요약에서 재사용 가능) |
| 미완 (Kyu 실기) | 5 (sold-out · low · in-stock · unknown · 그리드 무회귀) |
| **총 순증감** | **0** (해소 1 · 등재 1 · Kyu 5 도장 시 -5) |

---

## 7. 다음 게이트

1. **PR #27 Kyu 리뷰 · 아이패드 실기** — 5 체크 통과 → 머지.
2. **PR #25 (M1-1105-B) 머지 뒤** — 본 Playwright 하네스가 정식 `scripts/m1-1105-b-playwright.mjs` 재사용 하도록 import 정리 (별건 라운드 · 작은 patch). polyfill 치환 명령도 PR 본문에서 제거.
3. **별건 M3-1104-B P2 라운드** — Tender 화면 + SuccessReceiptAnim + ReceiptCard. `lib/inventory.ts` 를 Tender 조회·영수증 재고 요약에서도 사용.
4. **별건** — 새로운 재고 UI (장바구니 재고 재검증 · 재고 변동 시 Toast) 가 필요하면 `lib/inventory.ts` + `StockLine` 재사용.

---

*M3-1105-B · 2026-11-05 · 상세 시트 재고 가드 · 공용 util 분리 · fork PR #27 · 어설션 24/24 + 색 35/35 · 4 스샷 · 그리드 무회귀 · 이연 0 (Kyu 5 도장 시 -5)*
