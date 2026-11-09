# M3-1105-X · Fulfill 시트 코딩 1/2 (Orders 쪽)

**브랜치**: `feat/m3-1105-x-fulfill-sheet` @ base `master c34a2b8`
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/67 (Closes #65)
**원장 대사**: open-requirements.md Kyu 결정 "Fulfill 시트(11-09 17:17 · PR #65 Q1~Q3 전부 A)" · docs/M3-1105-U-plan.md §1·§2·§4.
**범위**: Orders 쪽만 (Pickup/Delivery 탭 · Fulfill 시트 · 어설션 · 스샷). Checkout Delivery 활성·Shipping 수집은 2/2 라운드 몫.

## 커밋 (5건 · 순서대로 push)

| # | hash | 내용 |
|---|---|---|
| 1 | `cae9c25` | feat(m3-1105-x): useFulfillOrder body 확장 (method/courier/…) + PosFulfillResponse + 3 fixtures |
| 2 | `1f5c0eb` | feat(m3-1105-x): FulfillSheet.tsx — Pickup/Delivery 탭 + 검정 Fulfill 결정 버튼 |
| 3 | `a42d438` | feat(m3-1105-x): Orders 상세 Fulfill 버튼 노출 + FulfillSheet 연결 + delivery.stage 배지 |
| 4 | `14bd986` | test(m3-1105-x): U1~U12 어설션(71개) + Playwright 스샷 3장 + m3-1105-d 회귀 가드 |
| 5 | `cdfa2af` | docs(m3-1105-x): Fulfill 시트 3장 스샷 (Playwright 웹 · 1180×820) |

## REQ 체크리스트 (큐 M3-1105-X 본문)

- [x] **REQ 1** — `api/hooks/pos-payments.ts`
  - `FulfillInput { order_id, method?, courier?, driver?, contact?, tracking_ref?, note? }`
  - `PosFulfillResponse` = storeport #200 (M0-1105-T §3.1) shape 9 필드
  - fixtures `pos-fulfill-{pickup,delivery,dp-paid-400}-response.json`
  - `method` default `'pickup'` — `app/checkout/success/[orderId].tsx` (금지영역) 기존 호출 호환 보장.
- [x] **REQ 2** — `components/orders/FulfillSheet.tsx` (246 lines)
  - BottomSheet title "Fulfill order" · 주문 요약 (No/total/line/⚠ Awaiting dispatch 배지)
  - OptionChip 탭 2개 (선택 = 연회색 bg-success-soft + border-ink + ✓)
  - Pickup = Note (선택) · Delivery = Courier **필수** + Driver/Contact/Tracking/Note (선택)
  - 검정 결정 버튼 "Fulfill" 1개 (Button default solid = bg-ink)
  - Delivery + courier.trim()==='' → 버튼 비활성 + `"* Courier is required"`
  - 성공 toast = `Handed over` (pickup) / `Dispatched` (delivery · Kyu Q3=A 1단계)
  - 실패 toast = 서버 `{type:'invalid_data', message}` 영어 그대로.
- [x] **REQ 3** — `app/orders/[orderId].tsx` + `components/orders/OrderTypeChip.tsx`
  - takeaway paid → `useHandOver` 즉시 POST (기존 유지)
  - preorder paid_full → FulfillSheet `mode='preorder'` (Pickup 기본 탭)
  - delivery awaiting_dispatch → FulfillSheet `mode='delivery'` (Delivery 탭 only)
  - preorder dp_paid → Fulfill 숨김 (Collect balance만)
  - `extractDeliveryStage` + `DeliveryStageChip` (awaiting/dispatched)
  - `useFulfillOrder.onSuccess` 가 `['order']`/`['orders']` invalidate → 상세·목록 새로고침.
- [x] **REQ 4** — 어설션/스샷/회귀/CI/PR
  - `scripts/m3-1105-x-fulfill-assertions.mjs` · **71/71 pass**.
  - `scripts/m3-1105-x-screenshots.mjs` · Playwright 웹 3장 (1180×820).
  - 회귀 `node scripts/run-all.mjs assertions` · **21/21 PASS · 10.5s** (색 · S · D · q · p · v · 번들 가드 · run-all 전부 PASS).
  - `m3-1105-d-assertions.mjs` 1건 regex 회귀 가드 (useFulfillOrder destructure · URL 경로 자체 불변) 교정.
  - PR 본문 = "Closes #65" + 3 라인 기술 선택지 + 테스트 체크리스트.

## 스샷

- `docs/M3-1105-X-fulfill-sheet-pickup.png` — Pickup 기본 탭 선택 (연회색 + ✓ + 검정 Fulfill)
- `docs/M3-1105-X-fulfill-sheet-delivery-empty.png` — Delivery 탭 only · Courier* + 비활성 Fulfill + "* Courier is required" 힌트
- `docs/M3-1105-X-order-detail-dispatched.png` — delivery fulfilled · Payments 헤더에 `Paid` + `Delivery` + `Dispatched` 배지

## 어설션 로그

```
$ node scripts/m3-1105-x-fulfill-assertions.mjs
71/71 passed · 0 failed

$ node scripts/run-all.mjs assertions
총 21 개 · 21 PASS · 0 FAIL · 10.5s
```

## CI

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions (PR #67) — assertions + playwright + lint pending.

## 금지영역 미수정 확인 (가드도 둠)

- `components/payment/OrderTypePicker.tsx` : `disabled:true` 유지 (U1 가드).
- `app/checkout/**` : 손대지 않음 (2/2 라운드 몫).
- `lib/printer/*` · `lib/receipt-layout.ts` · `app/_layout.tsx` · `components/shift/ShiftCloseGate*` : 미수정.
- `api/hooks/pos-orders.ts` `useHandOver` : 유지 (M3-1105-F 소유 · body shape 불변 가드).

## 남은 것 (2/2 라운드 후보)

1. `components/payment/OrderTypePicker.tsx` Delivery 칩 `disabled:true` 제거 → 활성.
2. `app/checkout/**` Shipping 스텝 추가 — Q1=A 결정에 따라 결제 때 `shipping_address` 수집.
3. 결제 success 라우팅에서 delivery 주문 `Awaiting dispatch` 배지 확인 (이 PR 의 `DeliveryStageChip` 재사용).

## 기술 선택지 (권장안 · 3줄)

- `FulfillInput.method` **optional + default 'pickup'** — `checkout/success` 금지영역 호출 호환.
- 400 메시지는 **서버 contract 그대로 (영어)** Toast — 앱이 재변환하지 않음.
- `DeliveryStageChip` 을 신규 컴포넌트로 분리 — `OrderTypeChip` 은 거래 종류(3개)만, stage 는 orthogonal.
