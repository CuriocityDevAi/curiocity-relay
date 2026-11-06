---
round: M1-1105-D
pr: null
outcome: 진단 전용 — Kyu 11-06 실기 ✗ 2건 뿌리 확정 · 코드 수정 0 · 커밋 0
kyu_checks: 0 (진단 라운드)
diagnosis_only: true
harness: scripts/m1-1105-d-diagnosis.mjs (미커밋)
---

# M1-1105-D · Checkout 회색 버튼 + Cart/Checkout 썸네일 회색 박스 진단

**일자**: 2026-11-06 · **허브**: M1 · **작업 디렉토리**: `pos-m1` (branch `m1-1105-d-diagnosis` · 커밋 없음) · **성격**: Kyu 11-06 실기 ✗ 뿌리 확정 · 코드 수정 금지.

---

## 0. 원문 (Kyu 11-06 실기 ✗)

- ① Checkout 에서 Cash/Card/QRIS 선택 뒤 **"Complete order" 가 회색** — 실제 disabled 인지 아니면 토큰 매핑으로 회색으로만 보이는지.
- ② Cart/Checkout 라인 아이템 **썸네일이 회색 박스** — 라인 아이템 데이터인지 앱 매핑인지.

대조 포인트: **11-04 실기엔 Cash 결제 성공**. 11-04 master `0515209` 와 현 master (21eb6f3) 사이 머지: #22 (M3 색 토큰 14개) · #24 (M2 재고 fields `+` prefix) · #25 (M1-1105-B web secure-store + E2E 하네스) · #23 (M1-1105-A wizard loop) · #26 (M2 Settings Printer) · #28 (M2 ble 정리) · #27 (M3 product-details).

---

## 1. 뿌리 (실측 2줄)

- **뿌리 ① (버튼)**: 버튼은 **실제 enabled** · 토큰 매핑만의 문제 — #22 가 Button 활성 `bg-black (#000)` → `bg-ink (#282828)` 로 교체하면서 "pure black" → "dark gray" 가 돼 사용자가 "회색" 으로 인지. Cash 선택 시 측정 `bg #282828 · aria-disabled null · disabled attr absent · pointer-events auto` (실측). Card/QRIS 는 **승인번호 6자리 미입력** 시 **실제 disabled** (`bg #F1F1F1` = `bg-surface-muted` · aria-disabled true · pointer-events none) — 이는 기존 로직 (`invoiceValid` 검증) 정상 작동.
- **뿌리 ② (썸네일)**: 썸네일 코드 `item.thumbnail || item.product?.thumbnail || item.product?.images?.[0]?.url` 자체는 **정상** — fallback 3단계 모두 모킹하면 렌더 확인. 뿌리는 **`useCurrentDraftOrder` · `useDraftOrderOrOrder` · `useCompleteDraftOrder` 가 보내는 `fields=` 쿼리에 `+items.thumbnail` · `+items.product.*` 가 빠져 있음** — Medusa v2 는 요청하지 않은 필드를 응답에서 strip (하네스 포착 샘플: `fields=%2Btax_total%2C%2Bdiscount_total%2C%2Bsubtotal%2C%2Btotal%2C%2Bitems.variant.options.*%2C%2Bitems.variant.options.option.*%2C%2Bitems.variant.inventory_quantity%2C%2Bcustomer.*`) → 라인 아이템에 썸네일 URL 이 아예 전달되지 않음 → 3단계 fallback 모두 undefined → `{thumbnail && <Image ...>}` 조건 false → `bg-line` wrapper 만 노출 = 회색 박스.

---

## 2. 실측 근거

### 하네스 (`scripts/m1-1105-d-diagnosis.mjs`, 미커밋)

- 로그인 → setup wizard → 탭 Cart 클릭 → localStorage 에 `meros.secureStorage.v1.draft_order_id=draft_01` 주입 → /checkout/draft_01 진입까지 **mock Medusa** 로 완주.
- Draft 응답은 의도적으로 세 라인 포함: `li_01` (item.thumbnail 있음) · `li_02` (item.product.thumbnail 만 있음) · `li_03` (어느 레벨에도 없음).
- cdn.meros.id 이미지 요청은 1x1 PNG mock → Image 성공 로드와 미로드 상태를 명확히 분리.

### 버튼 측정 (Cash 선택 뒤 · `complete-order-button` testID)

| 지표 | 값 | 판정 |
|------|----|------|
| `aria-disabled` | `null` | 활성 |
| `disabled` attr | `absent` | 활성 |
| `className` 포함 | `... bg-ink ...` | 활성 |
| computed `background-color` | `rgb(40, 40, 40)` = `#282828` | 활성 토큰 |
| computed `color` | `rgb(255, 255, 255)` | 활성 토큰 |
| `pointer-events` | `auto` | 클릭 가능 |

**→ Cash 선택 시 버튼은 완전 활성.** 사용자가 "회색" 으로 인지하는 것은 `bg-ink #282828` 이 "pure black" 이 아니라 "dark gray" 색조이기 때문 (R0 관찰 "비활성 단서 상실" 과 일치).

### 버튼 측정 (Card · 승인번호 미입력)

| 지표 | 값 | 판정 |
|------|----|------|
| `aria-disabled` | `true` | 비활성 |
| `disabled` attr | `present` | 비활성 |
| `className` 포함 | `... bg-surface-muted ...` | 비활성 토큰 |
| computed `background-color` | `rgb(241, 241, 241)` = `#F1F1F1` | 비활성 |
| `pointer-events` | `none` | 클릭 불가 |

**→ Card/QRIS 는 승인번호 6자리 입력 전까지 정상 disabled.** (6자리 입력 뒤 재측정 → `bg-ink` 로 전환 확인.)

### 토큰 비교 (0515209 → 현 master)

| 상태 | 0515209 (M3 전) | 현 master (M3 후) |
|------|----------------|-------------------|
| 활성 solid bg | `#000000` (`bg-black`) | `#282828` (`bg-ink`) |
| 활성 solid text | `#FFFFFF` (`text-white`) | `#FFFFFF` (`text-surface`) |
| 비활성 bg | `#F3F4F6` (`bg-gray-100`) | `#F1F1F1` (`bg-surface-muted`) |
| 비활성 text | `#D1D5DB` (`text-gray-300`) | `#B5B5B5` (`text-ink-subtle`) |

**관찰**: 활성 배경이 `#000` → `#282828` 로 바뀌면서 "pure black" 의 "강한 primary action" 신호가 약해짐. 비활성과의 명도 대비 (`#282828` vs `#F1F1F1`) 는 여전히 크지만, "활성인가 비활성인가" 1차 판단 시 사용자가 어두운 색 자체를 "회색" 으로 뭉뚱그려 읽음.

### 썸네일 측정 (3 라인)

| 라인 | item.thumbnail 모킹 | item.product.thumbnail 모킹 | 실측 `imgSrc` | 실측 `bg` | 표시 |
|------|---------------------|-----------------------------|---------------|-----------|------|
| `li_01` Kopi Tubruk | `✓` | `✓` | `https://cdn.meros.id/kopi.jpg` + bgImage | `bg-line` wrapper + img | 이미지 렌더 |
| `li_02` Teh Tarik | ✗ | `✓` | `https://cdn.meros.id/teh.jpg` + bgImage | `bg-line` wrapper + img | 이미지 렌더 (fallback 작동) |
| `li_03` Es Jeruk | ✗ | ✗ | `null` (img 없음) | `bg-line` 만 · 자식 0개 | **회색 박스** |

**→ 썸네일 URL 이 데이터에 있기만 하면 fallback 코드는 정상 작동.** 세 레벨 모두 없을 때만 회색 박스. **Kyu 의 iPad 에서 모든 라인이 회색 = 모든 라인이 "세 레벨 모두 없음" 상태 = 서버 응답에 썸네일 필드가 전혀 안 실림.**

### fields 쿼리 수집

하네스가 가로챈 `GET /admin/draft-orders/draft_01?fields=...` 전체 요청 샘플:
```
fields=+tax_total,+discount_total,+subtotal,+total,+items.variant.options.*,+items.variant.options.option.*,+items.variant.inventory_quantity,+customer.*
```

**없음 명시**: `+items.thumbnail`, `+items.product`, `+items.product.thumbnail`, `+items.product.images.*`.

Medusa v2 admin 응답은 `fields` 에 명시된 경로만 보장. 명시되지 않은 경로는 기본 selector 에 따라 포함되지 않음 → 라인 아이템 `thumbnail` 필드 및 `product` 중첩 전부 미포함 → 앱의 3단계 fallback 전부 undefined → 회색 박스.

### 썸네일 vs 상품 그리드 대조

- 상품 그리드 (/products): `useProducts` → `/admin/products?fields=+variants.prices.*,+variants.inventory_quantity,+variants.manage_inventory`. 응답은 **product 자체** 이므로 `thumbnail` 이 top-level 기본 필드로 포함됨 → 이미지 렌더 정상.
- 라인 아이템 (/cart, /checkout): line_item.thumbnail 은 Medusa v2 기본 응답에 **포함되지 않음** (별도 fields 요청 필요).

→ 같은 `thumbnail` 문자열이지만 **엔티티가 달라 fields 규약도 다름** → 한 쪽은 자동으로 들어오고 한 쪽은 명시 요청 필요.

---

## 3. 수정 제안 (file:line · 소유)

### ① 버튼 "회색" 해소 — **M3 소유**

세 가지 중 하나 (M3 디자인 검토):

1. **Token 조정**: `constants/brand.ts` + `tailwind.config.js` 의 `ink` 를 `#282828` → `#0E1B18` (= `brand.ink`) 또는 `#000000` 으로 조정. 효과: 활성 버튼이 다시 "pure black" 에 가까워져 "primary action" 신호 복구. 영향 범위: `bg-ink` 사용 지점 전부 (`components/ui/Button.tsx:35` 활성 solid + 다른 `bg-ink`/`text-ink` 소비처).
2. **활성 cue 추가**: `components/ui/Button.tsx:31-40` 에 활성 solid 시 subtle `shadow-sm` 또는 `border-ink`/`border-accent` 추가 → 어두움만으로 활성 판단하지 않도록 2차 cue 부여.
3. **현상 유지 + 디자인 가이드**: #22 가 의도된 "소프트 블랙" 이면 그대로 두고 `docs/design/tokens.md` 에 "활성 solid 는 #282828 (dark gray) · 비활성은 #F1F1F1 (muted surface)" 명시해 사용자 교육. (R0 "비활성 단서 상실" 관찰 미해소.)

### ② 썸네일 회색 박스 해소 — **M0 소유** (fields 규약)

`api/hooks/draft-orders.tsx` 세 곳의 `fields=` 문자열에 `+items.thumbnail` 추가 (**최소 diff**) 또는 안전하게 `+items.thumbnail,+items.product.thumbnail,+items.product.images.*` 추가 (3단계 fallback 전부 보존):

| 위치 | 현재 fields | 제안 추가 |
|------|-------------|----------|
| `api/hooks/draft-orders.tsx:214` (`useCurrentDraftOrder`) | `+tax_total,+discount_total,+subtotal,+total,+items.variant.options.*,+items.variant.options.option.*,+items.variant.inventory_quantity,+customer.*` | `,+items.thumbnail,+items.product.thumbnail,+items.product.images.*` |
| `api/hooks/draft-orders.tsx:184` (`useDraftOrderOrOrder` · draft path) | 동상 | 동상 |
| `api/hooks/draft-orders.tsx:190` (`useDraftOrderOrOrder` · order fallback) | 동상 | 동상 |
| `api/hooks/draft-orders.tsx:661` (`useCompleteDraftOrder` · retrieve) | `... ,+customer.*,+customer.addresses.*` | `,+items.thumbnail,+items.product.thumbnail,+items.product.images.*` |

**소유**: `api/hooks/draft-orders.tsx` 는 **M0** (draft order 데이터 계약 소유). 문자열 4곳 수정 · 로직 변경 0.

**대안 (서버 선택)**: Medusa v2 코어가 line_item.thumbnail 을 **기본 selector 에 포함** 하도록 storeport/apps/commerce-core 에서 수정. 하지만 공식 코어 수정은 upgrade 호환 리스크 → **클라이언트 fields 명시가 안전**.

---

## 4. 재현 어설션 초안 (적용 라운드에서 복사·사용)

### 버튼 가드 (M3 수정 후)
```js
// scripts/<round>-assertions.mjs 또는 Playwright 인스펙션
// Cash 선택 시 Complete Order 는 반드시 활성:
check('Cash + draft order → Complete Order enabled (bg-ink 토큰)', async () => {
  const m = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="complete-order-button"]');
    const cs = getComputedStyle(btn);
    return { aria: btn.getAttribute('aria-disabled'), bg: cs.backgroundColor };
  });
  return m.aria === null && m.bg === TOKEN_INK_RGB;  // M3 토큰 조정 뒤 기대값
});
// Card + 승인번호 없음 → 반드시 비활성 (회귀 가드):
check('Card (no invoice) → Complete Order disabled (bg-surface-muted)', async () => {
  const m = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="complete-order-button"]');
    const cs = getComputedStyle(btn);
    return { aria: btn.getAttribute('aria-disabled'), bg: cs.backgroundColor };
  });
  return m.aria === 'true' && m.bg === 'rgb(241, 241, 241)';
});
```

### 썸네일 가드 (M0 fields 수정 후)
```js
// 하네스에서 라인 아이템 mock 시 item.thumbnail 만 넣고 측정:
const DRAFT_LINE_WITH_THUMB_ONLY = { ..., thumbnail: 'https://cdn.meros.id/x.jpg' /* NO product */ };
check('item.thumbnail 있는 라인 → <img src> 렌더', async () => {
  const src = await page.$eval('[data-testid="line-item-x"] img', (el) => el.getAttribute('src'));
  return src && src.includes('cdn.meros.id/x.jpg');
});
// fields 쿼리에 +items.thumbnail 포함 어설션 (회귀 가드):
check('draft-order.retrieve fields includes +items.thumbnail', () => {
  const qs = capturedDraftRetrieveQueryStrings[0];
  return /%2Bitems\.thumbnail/.test(qs);
});
```

### 데이터 vs 매핑 변별 어설션
```js
// item.thumbnail 있지만 cdn 404 → 회색 (데이터는 전달됨 · 외부 요인)
// item.thumbnail 없음 + product 완전 미노출 → 회색 (이것이 Kyu 케이스 · 수정 필요)
// 양쪽 모두 wrapper bg-line 는 유지 — fallback UI 정상.
```

---

## 5. 정합 · 규약

| 규약 | 정합 |
|------|------|
| 코드 수정 금지 | ✓ · `git status` clean · 커밋 0 |
| 새 하네스 (scripts/m1-1105-b 복제) | ✓ · `scripts/m1-1105-d-diagnosis.mjs` (미커밋) |
| 항목별 "실측 + file:line + 원인 PR" | ✓ (뿌리 ① → #22 M3-1105-A · 뿌리 ② → file:line 4곳 M0 소유) |
| 11-04 (0515209) vs 현 master 비교 | ✓ (`git log 0515209..origin/master -- <paths>` · #22 만 영향) |
| 썸네일 그리드 vs 라인 아이템 대조 | ✓ (엔티티 차이로 fields 규약 다름) |
| 수정 제안 (파일·줄·소유) | ✓ (버튼 M3 · 썸네일 M0 · 라인 번호 명시) |
| 재현 어설션 초안 | ✓ (버튼 2건 · 썸네일 2건 · 변별 1건) |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | 0 (진단 라운드) |
| 등재 | +2 (M3 버튼 토큰 조정 과제 · M0 draft-order fields 추가 과제) |
| 보강 | +1 (상시 ⓐ 외 "장바구니/결제 깊은 진단" 하네스 템플릿 — 커밋 시 +m1 자산) |
| 미완 (Kyu 도장) | 2 (M3 적용 후 아이패드 버튼 · M0 적용 후 썸네일) |
| **총 순증감** | **+2 등재 · +1 보강 (등재 PR 발생 시 해소)** |

---

## 7. 다음 게이트

1. **M3**: 버튼 활성 cue 선택 (토큰 조정 vs shadow/border 2차 cue vs 현상 유지 + 디자인 가이드). PR 본문에 본 리포트 §3-① 링크.
2. **M0**: `api/hooks/draft-orders.tsx` 4곳 fields 문자열에 `+items.thumbnail,+items.product.thumbnail,+items.product.images.*` 추가. 소요 라인 ≤ 10. 재현 어설션은 본 리포트 §4 복사.
3. **M1 (후속)**: 두 PR 머지 후 `scripts/m1-1105-d-diagnosis.mjs` 를 상시 하네스로 등재하거나 `scripts/m1-1105-b-playwright.mjs` 에 cart→checkout 단계 흡수.
4. **커밋 0**: 본 라운드는 진단 전용 · fork 수정 · PR · relay 외 변경 없음.

---

*M1-1105-D · 2026-11-06 · Kyu 11-06 실기 ✗ 진단 · 뿌리 ① 버튼 = M3 토큰 (#22) 영향 · 뿌리 ② 썸네일 = M0 draft-orders fields 누락 · 하네스 11 findings · 코드 수정 0 · 커밋 0*
