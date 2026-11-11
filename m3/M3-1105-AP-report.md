# M3-1105-AP 리포트

**원인 = (a) Cart FlashList estimatedItemSize 미설정으로 4번째 아이템이 초기 렌더에서 누락**

---

## 대조표 (파일:줄)

| 화면 | 데이터원 | queryKey | 파일 |
|------|----------|----------|------|
| Cart 목록 | `draft_order.items` | `['draft-order']` | `app/(tabs)/cart.tsx:542` |
| Cart Total | `draft_order.total` | `['draft-order']` | `app/(tabs)/cart.tsx:586` |
| 탭 배지 | `draft_order.items.length` | `['draft-order']` | `app/(tabs)/_layout.tsx:61` |
| Checkout 목록 | `draftOrder.data?.items` | `['draft-order', draftOrderId]` | `app/checkout/[draftOrderId].tsx:93` |
| Checkout Total | `quote.data.grand_total` or `draftOrder.data.total` | `['draft-order', draftOrderId]` | `app/checkout/[draftOrderId].tsx:165` |

Cart·Total·배지는 모두 `useCurrentDraftOrder()` → queryKey `['draft-order']` 로 **같은 캐시 엔트리**를 공유한다. Checkout만 `useDraftOrderOrOrder(draftOrderId)` → `['draft-order', draftOrderId]`로 별도 조회.

---

## 가설 판정

### (a) 목록이 스크롤 영역에 잘려 4번째 줄이 안 보임 ✅ **확정 — 주 원인**

Cart FlashList에 `estimatedItemSize` prop 미설정. FlashList는 이 prop이 없으면 아이템 높이를 임의 추정하여 초기 렌더 범위를 계산한다. iPad landscape(1180×820)에서 Cart 아이템 높이(이미지 84px + padding + QuantityPicker ≈ 150px)가 추정값보다 크면 4번째 아이템이 뷰포트 밖으로 계산되어 초기 렌더에서 누락된다.

추가로 `showsVerticalScrollIndicator={false}` 설정 때문에 스크롤 인디케이터가 없어 사용자가 더 보이지 않는 아이템이 있다는 것을 알 수 없었다.

**수정**: `estimatedItemSize={150}` 추가 + `showsVerticalScrollIndicator={false}` 제거.

### (b) Cart 목록 쿼리/캐시 오래됨 ❌ **해당 없음**

`useUpdateDraftOrderItem.onMutate` optimistic update에서 items는 업데이트하지만 total은 그대로 두는 코드가 있다. 그러나 같은 시간에 `isUpdatingDraftOrder > 0`이면 Total이 스켈레톤으로 가려지므로 사용자에게 불일치가 노출되지 않는다. 별도 수정 불필요.

### (c) 이전 미완 거래 품목 혼입 ❌ **해당 없음 (단 렌더링 잘림이 근본 증상)**

`validateStoredDraftOrderId`는 앱 기동 시 1회 실행하며 `status === 'draft'`인 미완 거래는 그대로 재사용한다. 이것은 의도된 동작이다. Kyu 추정대로 이전 세션 품목이 Cart에 남아있을 수 있으나, 이 품목들은 서버 draft order에 엄연히 존재하므로 Cart에 모두 표시해야 한다. 렌더링 잘림이 해결되면 미완 거래 품목도 모두 보이게 된다.

---

## 재현 절차

1. iPad landscape(1180×820) 환경에서 Cart에 4개 이상 품목 추가
2. Cart 화면 진입 — FlashList `estimatedItemSize` 미설정 상태에서 4번째 아이템이 렌더링되지 않음
3. Total과 배지는 서버 `draft_order.total`·`items.length` 기준이므로 4개 기준으로 표시 → 불일치 노출
4. Checkout 화면: `useDraftOrderOrOrder(draftOrderId)`로 서버에서 별도 조회 → 4개 모두 표시

---

## 수정 내용

| 파일 | 변경 |
|------|------|
| `app/(tabs)/cart.tsx` | FlashList `estimatedItemSize={150}` 추가, `showsVerticalScrollIndicator={false}` 제거 |
| `app/checkout/[draftOrderId].tsx` | FlashList `estimatedItemSize={100}` 추가 |
| `scripts/m3-1105-ap-assertions.mjs` | 정적 assertions (6개 항목) |
| `scripts/m3-1105-ap-screenshots.mjs` | Playwright iPad 1180×820 스크린샷 (2장) + assertions |

---

## PR

**#92** https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/92

---

## PR 본문 확인 (실기)

- ✅ iPad 1180×820 · Cart 4개 품목 모두 표시 (`01-cart-4-items.png`)
- ✅ Checkout 4개 품목 모두 표시 (`02-checkout-4-items.png`)
- ✅ Cart Total = Rp 110,000 (4줄 합계) · 배지 = 4
- ✅ Cart 아이템 수 == Checkout 아이템 수 (8/8 assertions 통과)
- Cancel Cart 뒤 새 거래에 옛 품목이 섞이지 않음 — `cancelDraftOrder` 뮤테이션이 `SecureStore` 키 삭제 + 서버 삭제 후 쿼리 무효화. 별도 수정 불필요.

---

## Playwright 실행 결과

```
8/8 passed · 0 failed
```

스크린샷:
- `/tmp/m3-1105-ap-screenshots/01-cart-4-items.png` — Cart: 4개 품목 모두 렌더링, Total = Rp 110,000, 배지 = 4
- `/tmp/m3-1105-ap-screenshots/02-checkout-4-items.png` — Checkout: 동일 4개 품목 모두 표시

---

## 부수 관찰: 같은 품목·같은 옵션 두 줄 현상

Medusa draft order의 `addItems`는 같은 `variant_id`를 별도 line으로 추가한다(병합 없음). 클라이언트에서 병합하려면 `beginEdit → updateItem(기존 ID, quantity+N) → confirmEdit` 패턴이 필요하나, 복수 아이템 동시 추가, stale ID recovery, 낙관적 업데이트 조합 시 복잡도가 높다. → **기록 전용, 이연.**

---

## 이연 순증감

- ➕ **같은 품목 수량 병합** — Medusa `addItems` 클라이언트 병합 로직 (Coffee Latte Hot ×2 → 1줄 qty=2)

---

## 착지 명령

```bash
cp /tmp/M3-1105-AP-report.md ~/projects/curiocity-relay/m3/ && \
cd ~/projects/curiocity-relay && \
git add m3/M3-1105-AP-report.md && \
git commit -m "m3: M3-1105-AP" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M3-1105-AP done "원인=(a) Cart FlashList estimatedItemSize 미설정→4번째 아이템 렌더링 누락 수정 · PR#92"
```
