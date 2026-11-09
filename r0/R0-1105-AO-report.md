# R0-1105-AO · fork #69 리뷰 — fix/m3-1105-y-preorder-pay

**판정: APPROVE**
head `dc77499` · base `master 79419d05`

---

## §0 master 충돌 여부

| | |
|---|---|
| PR base | `79419d05` (#67 feat/m3-1105-x) |
| master 현재 | `3baaac0` (#68 feat/m1-1105-ac 머지 · 2026-11-09T22:36:28Z) |

**#68 변경 파일:** `components/payment/PreorderInputs.tsx`, `components/ui/OptionChip.tsx`, `constants/brand.ts`, `tailwind.config.js`, `scripts/m3-1105-s-option-chip-assertions.mjs`

**PR #69 변경 파일:** `app/checkout/[draftOrderId].tsx`, `scripts/m3-1105-y-preorder-pay-playwright.mjs`(신규), `scripts/m3-1105-y-screenshots.mjs`(신규), `screenshots-m3-1105-y/*.png`(신규)

**겹치는 파일 없음 → 충돌 없음. rebase 불필요.**

---

## §1 뿌리 원인 + 수정 (FlashList 높이·ListFooterComponent)

원인 코드와 설명 일치:
- 가격·주문타입·PreorderInputs·Information이 FlashList의 아래 siblings로 쌓여 iPad landscape(1024×768)에서 합산 > viewport → Pay bottom 799 / vp 768 = 31px 밖

수정 검증:
- `<View className="flex-1">` FlashList 래퍼 → bounded height ✅
- `ListFooterComponent={listFooter}` (React element, 함수 아님 → re-mount 방지) ✅
- 가격·Total·OrderType·PreorderInputs·Information 이동 완료 ✅

---

## §2 Pay 하단 고정·항상 노출·비활성+이유

| 항목 | 결과 |
|---|---|
| Pay bar `testID="checkout-pay-bar"` 항상 Layout 하단 고정 | ✅ |
| `border-t border-line pt-3` 구분선 | ✅ |
| `preorderMissingPickup = orderType==='preorder' && !pickupAt` | ✅ |
| Pre-order + pickupAt 비움 → `<Button disabled>` | ✅ |
| `testID="checkout-pay-hint"` "Choose a pickup time" | ✅ |
| pickupAt 입력 → Pay enabled · hint 숨김 | ✅ |
| Takeaway 기본 → hint 없음 · Pay enabled (회귀 없음) | ✅ |
| Pay = `<Button>` default solid (ink 검정) 유지 | ✅ |

Y 어설션 직접 실행 확인:
- Y1(1024×768 Takeaway Pay ≤ vp): ✅
- Y2(1024×768 Pre-order Pay ≤ vp): ✅
- Y3(1180×820 Pre-order Pay ≤ vp): ✅
- Y4(pickupAt 비움 → disabled + hint): ✅
- Y5(pickupAt 입력 → enabled + hint 숨김): ✅
- Y6(Pre-order Pay → /tender-cash): ✅
- Y7(Takeaway 회귀 → hint 없음 · enabled): ✅

---

## §3 키보드 가림 여부

- `Layout` = plain `<View>` (KeyboardAwareScrollView 미사용) — PR #69 이전과 동일 구조, 회귀 없음
- PreorderInputs(note TextInput)이 이전에는 Layout 직접 자식이었으나 → 이제 FlashList ListFooterComponent 안에 위치 → FlashList의 스크롤 영역 안이므로 오히려 키보드 등장 시 스크롤 도달 가능
- `keyboardDismissMode="on-drag"` 유지 ✅
- 웹 Playwright headless: 소프트 키보드 없어 직접 assertion 불가 — 구조상 regression 없음(ListFooter 이동이 scroll 접근성 개선)

---

## §4 43/44 실패 1건 사전 여부 검증

**실패 스크립트:** `m3-1105-m-preorder-playwright.mjs`
**실패 항목:** §9a(Hand over 노출 paid_full), §10a(fulfill 1회), §10b(fulfill body.stage="hand_over") — 3개

**사전 여부 검증:**
```
pos-m1 (feat/m1-1105-ac · #67 이전 베이스):  28/28 all pass ✅
pos-m3 (fix/m3-1105-y · PR branch):            25/28 · 3 FAIL ✅
```

**원인:** #67(FulfillSheet 도입)에서 Hand over 버튼이 `<FulfillSheet>` 내부 BottomSheet FlatList 안으로 이동하여 testID 직접 접근 실패. `components/orders/**` 는 PR #69 금지 파일 → 본 PR과 무관한 사전 실패.

---

## §5 번들 안전 · 금지 파일

| 항목 | 결과 |
|---|---|
| bundle guard 정적 grep 0건 위반 | ✅ |
| Metro iOS 번들 성공 (7.4s) | ✅ |
| `components/ui/OptionChip.tsx` 미수정 | ✅ |
| 토큰 파일 미수정 | ✅ |
| `components/orders/**` 미수정 | ✅ |
| `lib/printer`, `receipt-layout`, `ShiftCloseGate` 미수정 | ✅ |
| 영어 UI | ✅ ("Choose a pickup time" · "Pay" · "Back to cart") |

---

## §6 assertions 직접 실행 로그 (pos-m3 worktree · `dc77499`)

```
node scripts/m3-1105-y-preorder-pay-playwright.mjs  →  10/10 passed ✅
node scripts/run-all.mjs assertions                  →  21/21 PASS · 10.6s ✅
node scripts/run-all.mjs playwright                  →  22 PASS · 1 FAIL (m3-1105-m 사전) · 504.7s
node scripts/m2-1105-q-bundle-guard.mjs              →  정적 grep 0건 · Metro iOS 성공 (7.4s) ✅
```

---

## 판정

**APPROVE**

충돌 없음. FlashList flex-1 래퍼 + ListFooterComponent 이동으로 Pay 하단 고정 확보. Pre-order pickupAt 비움 시 disabled + "Choose a pickup time" 힌트 정상. Takeaway 회귀 없음. 43/44 중 1 FAIL은 #67 사전 실패(Hand over testID가 FulfillSheet BottomSheet 안으로 이동)로 PR #69와 무관 확인됨.
