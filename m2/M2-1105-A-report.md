---
round: M2-1105-A
pr: null
outcome: 진단 전용 (코딩 금지) · 뿌리 1 줄 확정 · 수정 제안 (file:line + owner) · Playwright 재현 시나리오
kyu_checks: 0 (코드 변경 없음 · 다음 라운드 fix 뒤 실측)
---

# M2-1105-A · 재고 배지 안 뜸 · 뿌리 진단

**일자**: 2026-11-05 · **허브**: M2 · **성격**: 진단 전용 · **상대 리포**: `agilo-medusa-pos-fork` (master `d33288c` + M2-1104-D `24dc25f` · 둘 다 재고 코드 동일)

## 0. 뿌리 (1 줄)

**`api/hooks/products.ts:35` — 2차 조회 `fields: 'id,inventory_quantity'` 에 `+` 접두사 누락. Medusa 는 이 값으로 default fields 를 통째 치환 → `manage_inventory` 가 재조회 variant 에서 빠짐 → wrap 이 `if (!variant.manage_inventory) continue` 로 모든 variant skip → `inventory_quantity` 가 전부 undefined 로 남음 → `computeInventoryStatus` 가 전 상품 `unknown` 반환 → 배지 숨김 + 탭 허용.**

문서화 vs 구현 불일치: 같은 파일 **line 19 주석**은 "fields=**+**inventory_quantity" (with `+`) 로 서술 — 의도는 맞았는데 구현이 1자 빠짐.

---

## 1. 실측 결과 (각 항목 file:line)

### ① 재고 2차 조회(/admin/product-variants) 가 실제 호출되는가 · 응답에 inventory_quantity 가 오는가

- **호출됨**: `api/hooks/products.ts:33-37` — `sdk.admin.productVariant.list({ id: managedVariantIds, fields: 'id,inventory_quantity', limit })`. SDK 는 query 를 그대로 전송 (`node_modules/@medusajs/js-sdk/dist/admin/product-variant.js:58-62`).
- **응답에 inventory_quantity 미포함 (추정 · live curl 불가 — `.env` 부재)**. 근거는 **Medusa 라우트 소스 직독**:
  - `node_modules/@medusajs/medusa/dist/api/admin/product-variants/route.js:8` — `withInventoryQuantity = fields.some(f => f.includes('inventory_quantity'))` → 트리거는 됨.
  - 같은 파일 **line 10** — `req.queryConfig.fields = fields.filter(f => !f.includes('inventory_quantity'))` → inventory_quantity 는 refetchEntities 호출 전 제거.
  - `wrapVariantsWithTotalInventoryQuantity` → `wrapVariants` (`.../middlewares/products/variant-inventory-quantity.js:44-48`) — **핵심**: `if (!variant.manage_inventory) continue; variant.inventory_quantity = availability[v.id].availability`.
  - 2차 조회가 `fields: 'id,inventory_quantity'` 로 보내면 default fields (`defaultAdminProductVariantFields` 에 `manage_inventory` 포함 · `.../product-variants/query-config.js:15`) 가 치환됨 → refetchEntities 가 **id 만** 들고옴 → `variant.manage_inventory === undefined` → wrap 이 모든 variant skip → **wrap 은 호출되지만 값을 얹지 않음**.

**=> ①이 뿌리**. 2차 조회 자체는 돌지만 결과 variant 에 `manage_inventory` 도 없어서 wrap 이 손 못 쓰고 지나감.

### ② stock_location / sales_channel 필터로 수량이 빠지는가 (매장 자동 선택 #21 이후)

- 2차 조회 `enrichProductsWithInventory` (`api/hooks/products.ts:21-54`) 는 **stock_location_id · sales_channel_id 둘 다 파라미터 X**. `getTotalVariantAvailability(query, { variant_ids })` (`variant-inventory-quantity.js:12-14`) 는 전체 location 합산 → Soopsok 1 매장 전제에선 그 매장 값 그대로. 필터 영향 없음.
- 기본 조회 `useProducts` 는 `sales_channel_id: settings.data?.sales_channel?.id` 만 (`app/(tabs)/products.tsx:78`). M1-1104-B 가 넣어주는 settings 값과 일치. stock_location_id 는 조회에 안 씀 → 불일치 가능성 자체 없음.

**=> ② 아님** (설계대로 total 로 합산).

### ③ computeInventoryStatus 가 undefined → unknown (fail-open) 으로 떨어지는 경로

- `app/(tabs)/products.tsx:36-51` — managed variant 하나라도 `typeof v.inventory_quantity !== 'number'` → `{ kind: 'unknown' }`.
- ①이 모든 managed variant 의 inventory_quantity 를 undefined 로 남기므로 → 100% 상품이 `unknown` → **배지 영역 전체 숨김** (line 141 `inventoryStatus.kind !== 'unknown'` 가드) → 탭 허용 (line 126-130).
- 이 fail-open 자체는 지침대로 (M0-1103-A 원칙 "숫자 아니면 모름"). 문제가 아니라 ① 위에 얹힌 **증상**.

**=> ③ 는 정상 설계가 ①의 피해자**.

### ④ react-query 캐시 / staleTime 으로 옛 값이 남는가

- `queryClient` (`app/_layout.tsx:29-34`) — `gcTime: 24h` · **`staleTime` 미지정 → 기본 0** → mount 마다 refetch.
- `useProducts` 의 queryKey 는 `['products', JSON.stringify(query ?? {})]` (`api/hooks/products.ts:73`) — 검색어·sales_channel 바뀌면 key 갱신. staleTime=0 과 결합해 캐시로 옛 값 고착되지 않음.
- `AsyncStoragePersister` 24h gc 는 네트워크 복원 캐시 — 그래도 마운트 시 refetch. **캐시가 뿌리는 아님**.

**=> ④ 아님**.

### ⑤ 상세 시트(app/product-details.tsx)가 재고를 아예 안 읽는지 (R0-1104-A ②)

- `app/product-details.tsx:106` — `useProduct(productId)` → `sdk.admin.product.retrieve(productId)` → `enrichProductsWithInventory(sdk, [response.product])` (`api/hooks/products.ts:102-107`). **정확히 ①과 같은 버그** 가 상세에서도 발생.
- 상세 시트의 **Add to cart 버튼 disabled 조건** (`app/product-details.tsx:270`) — `disabled={!selectedVariant}` 뿐. **inventory_quantity · computeInventoryStatus · isSoldOut 참조 0**.
- 즉 그리드가 올바르게 "품절" 띄우더라도 상세로 들어가면 Add to cart 가 활성. ①을 고쳐도 상세의 add 버튼은 여전히 재고 0 variant 로 서버 호출 → "Sold out" 응답 → 서버 보호층만이 잡음.

**=> ⑤ 확진 (별도 결함)**. R0-1104-A ② 그대로.

---

## 2. 뿌리 1 줄 (재확인)

> `api/hooks/products.ts:35` 의 `fields: 'id,inventory_quantity'` → `fields: '+inventory_quantity'` (혹은 `'id,manage_inventory,inventory_quantity'`). `+` 접두사 1 자가 빠져 Medusa 가 default fields 를 치환해버린 결과.

---

## 3. 수정 제안 (파일·줄·누가)

### 3-A. 뿌리 fix · **M3 토큰 라운드 뒤 M3**

- **왜 M3**: M3 가 `app/(tabs)/products.tsx` (그리드 · computeInventoryStatus · 품절 카드 흐림 M3-1104-A) 와 `app/product-details.tsx` (M3-1104-B 계획 P3 상세 시트) 를 손에 쥐고 있음. M3 의 토큰 라운드 (M3-1104-A 머지된 #16 · M3-1104-B docs #20 · 다음 라운드 M3-1105-x 가 결제·완료·주문 P2~P5) 끝나면 M3-1104-Y (혹은 M3-1105-X) 로 묶어 처리하기 용이.
- **대안 M1**: `api/hooks/products.ts` 는 owner 중복 없음. M1 이 로그인·settings 변경 이력 (#17 · #21) 에서 이미 터치 → 데이터 fetch 부분을 M1 이 손봐도 자연스러움.
- **최소 패치** (1 line):
  ```diff
  --- a/api/hooks/products.ts
  +++ b/api/hooks/products.ts
  @@ -33,7 +33,7 @@ const enrichProductsWithInventory = async (
     try {
       const variantsResponse = await sdk.admin.productVariant.list({
         id: managedVariantIds,
  -      fields: 'id,inventory_quantity',
  +      fields: '+inventory_quantity',
         limit: managedVariantIds.length,
       } as any);
  ```
  - `+` 접두사 → default (`manage_inventory` 포함) 유지 + `inventory_quantity` 추가.
  - 리뷰 guard: `scripts/m0-1103-a-assertions.mjs` 에 inventory_quantity=0 mock 추가해서 "sold-out" 판정 돌게 (1 건) + 새로 `+` 가 있는지 패턴 체크 어설션 1건.

### 3-B. 상세 시트 add-to-cart 재고 가드 · **M3 (M3-1104-B 계획 P3 에 포함된다고 함)**

- **파일**: `app/product-details.tsx:270`
- **변경**: `disabled={!selectedVariant}` → `disabled={!selectedVariant || isSoldOut}` · `isSoldOut = computeInventoryStatus(productQuery.data?.product.variants ?? []).kind === 'sold-out'` (혹은 selectedVariant 한정으로 `v.manage_inventory===true && v.inventory_quantity === 0`).
- **왜 M3**: 상세 화면 UX 는 M3-1104-B 로드맵 (`docs/plans/M3-1104-B-*` 참고).
- **의존**: 3-A 가 먼저 머지되어야 inventory_quantity 가 실제 들어옴.

---

## 4. Playwright 재현 시나리오 (fix 뒤 회귀 가드)

**설계**: Expo 웹 export 빌드 + 가짜 Medusa admin API 서버 (fetch intercept) 로 2 모드 어설션.

**파일 (제안 · M3 또는 M1 라운드에서 작성)**: `scripts/m3-1105-X-inventory-playwright.mjs` (혹은 M1).

```js
// 공유 fixture
const PRODUCT = {
  id: 'prod_cheese_bread', handle: 'cheese-bread', title: 'Cheese Bread',
  variants: [{ id: 'var_cb_1', manage_inventory: true, prices: [{ amount: 15000, currency_code: 'IDR' }] }],
  thumbnail: '/thumb.png',
};

// Mode A · 서버가 inventory_quantity=0 응답 (fix 뒤)
mockRoute('/admin/products', (q) => ({ products: [PRODUCT], count: 1, offset: 0, limit: 20 }));
mockRoute('/admin/product-variants', (q) => ({
  // fields 에 '+inventory_quantity' 포함되어야 wrap 동작 — 어설션으로 요청에 '+' 검사
  variants: [{ id: 'var_cb_1', manage_inventory: true, inventory_quantity: 0 }],
  count: 1, offset: 0, limit: 1,
}));

// 어설션
check('(A1) 2차 조회 fields 에 + 접두사', requestLog.find(r => r.url.includes('/admin/product-variants'))?.query.fields?.startsWith('+'));
check('(A2) 그리드에 "품절" 배지 노출', await page.getByTestId('product-handle_cheese-bread_stock-badge').textContent() === '품절');
check('(A3) 그리드 카드 흐림 (opacity-75)', (await page.getByTestId('product-handle_cheese-bread_card').getAttribute('class'))?.includes('opacity-75'));
check('(A4) 그리드 탭 → 토스트, 상세 이동 X', (await page.locator('text=품절').count()) >= 1 /* toast */ && page.url().includes('/products'));
check('(A5) 직접 deep link /product-details 로 진입', ...);
check('(A6) 상세 Add to cart 비활성 (fix 3-B 뒤)', !(await page.getByText('Add to cart').isEnabled()));

// Mode B · inventory 미지원 환경 (2차 조회 실패) → fail-open
mockRoute('/admin/product-variants', () => ({ status: 500 }));
check('(B1) 그리드 배지 숨김 (fail-open)', (await page.getByTestId('product-handle_cheese-bread_stock-badge').count()) === 0);
check('(B2) 그리드 탭 → 상세 열림 (unknown fail-open)', page.url().includes('/product-details'));
check('(B3) 상세 Add to cart 활성 (fail-open · fix 3-B 뒤 Mode B 도 활성)', await page.getByText('Add to cart').isEnabled());
```

**핵심 어설션 3 종**: ① 2차 조회 요청에 `+` 접두사 포함 · ② 그리드 품절 배지 · ③ 상세 add-to-cart disabled (3-B fix 뒤).

---

## 5. 위험 / 변수

| # | 변수 | 대응 |
|---|------|------|
| 1 | live curl 로 실제 응답 확인 못 함 (.env 부재) | 소스 직독으로 완결 — Medusa 코드 흐름 상 결정론적 |
| 2 | `as any` 캐스트가 숨긴 다른 필드 drop 가능성 | SDK runtime 은 `fields` 를 그대로 전송 (product-variant.js:58-62 확인) · 캐스트는 타입만 우회 |
| 3 | wrap 이 `manage_inventory=false` variant 는 그대로 undefined 두는 점 | 설계 의도 (unmanaged = 집계 제외) · computeInventoryStatus 도 unmanaged filter 하므로 영향 없음 |
| 4 | 상세 시트 fix (3-B) 가 M3-1104-B P3 와 겹침 | M3 라운드에서 함께 처리 권장 |
| 5 | 뿌리가 1자 (`+`) 이므로 1 라인 머지 의심 가능 | assertion 2건 추가 (현 field 패턴 가드 + inventory_quantity=0 → sold-out 판정 round trip) |

---

## 6. 요약 액션 (다음 라운드)

1. **M3 (또는 M1) 토큰 라운드** — `api/hooks/products.ts:35` `+` 1자 fix + 회귀 가드 어설션 2건. 1 라인 패치 · Kyu 실기 재검.
2. **M3-1104-B P3 라운드** — `app/product-details.tsx:270` add-to-cart 재고 가드.
3. **M2 는 하드웨어 레인** (M2-1104-D 머지 후 M2-1105-B · BT-58D 실측). 이 배지 버그는 M2 owner 밖.

## 7. 참고

- 코어 코드 근거:
  - `.../medusa/dist/api/admin/product-variants/route.js:7-14`
  - `.../medusa/dist/api/admin/product-variants/query-config.js:8-32`
  - `.../medusa/dist/api/utils/middlewares/products/variant-inventory-quantity.js:5-16, 44-48`
- 앱 코드 근거:
  - `api/hooks/products.ts:15-54` (2차 조회 · 주석 line 19 vs 구현 line 35 drift)
  - `app/(tabs)/products.tsx:36-51, 112-166` (computeInventoryStatus · 배지 렌더)
  - `app/product-details.tsx:106, 270` (inventory 미참조 add-to-cart)
- 선행 라운드: M0-1103-A (fail-open compute) · M0-1103-B (2차 조회 신설) · M3-1104-A (품절 카드 흐림)

**커밋·push 없음** — 지침대로 진단 리포트만.
