# M3-1105-Y · Pre-order 선택 시 Pay 사라짐 버그 수정

**브랜치**: `fix/m3-1105-y-preorder-pay` @ base `master 79419d0`
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/69
**원장 대사**: Kyu 실기(11-10 04:50 · iPad · master 79419d0) "Pre-order 를 선택하면 Pay 옵션이 아예 없음 → 다음 단계를 테스트할 수 없음".

## 커밋 (2건 · 순서대로 push)

| # | hash | 내용 |
|---|---|---|
| 1 | `bd69e61` | fix(m3-1105-y): Checkout Pre-order Pay 하단 고정 + no-time hint |
| 2 | `dc77499` | test(m3-1105-y): Y1~Y7 어설션(10개) + Playwright 스샷 2장 |

## 원인 (file:line)

- `app/checkout/[draftOrderId].tsx:244` (기존) — FlashList + 가격·주문타입·PreorderInputs·Pay 바 전부 flex 바운드 없이 natural height 로 스택. Pre-order 선택 시 PreorderInputs(~110px) 가 추가되며 하단 Pay 가 viewport 밖으로 밀림.
- 재현 수치 (Playwright): iPad classic landscape 1024×768 → Pay bottom **799 / vp 768** (31px 밀림). iPad Pro landscape 1180×820 → 799/820 (아슬 보임). Portrait 는 안전.
- **가설 ② 확정**. 가설 ① (DOM 제거) · ③ (렌더 중단) 은 재현 안 됨 — Pay 는 DOM 유지 · disabled 만 바뀜.

## 수정

- `app/checkout/[draftOrderId].tsx`:
  - 가격 · Total · Order type · PreorderInputs · 고객 Information 을 `FlashList` 의 `ListFooterComponent`(React element 로 전달 — componentType re-mount 방지) 로 이동.
  - FlashList 를 `<View className="flex-1">` 래퍼로 감싸 bounded height 확보 → 콘텐츠가 넘치면 FlashList 내부에서 스크롤.
  - 하단 Pay 바는 Layout 바로 밑에 `pb-safe gap-3 border-t border-line pt-3` 로 항상 노출(testID `checkout-pay-bar`).
  - Pre-order + `!pickupAt` → Pay disabled + `checkout-pay-hint` **"Choose a pickup time"** 영어 한 줄.
  - 기존 pickup/quote 가드 유지 (M3-1105-N · M3-1105-O rebase 공존).

## 어설션 (10/10 pass)

`scripts/m3-1105-y-preorder-pay-playwright.mjs`:
- Y1·Y2: iPad classic landscape 1024×768 · Takeaway + Pre-order **Pay 하단 ≤ vp** (가설 ② 레이아웃 회귀 가드).
- Y3: iPad Pro landscape 1180×820 · Pre-order Pay 하단 ≤ vp.
- Y4a·Y4b: pickupAt 비움 → Pay disabled + hint "Choose a pickup time".
- Y5a·Y5b: pickupAt 입력 → Pay enabled · hint 숨김.
- Y6: Pre-order + pickup + Pay → `/tender-cash` 라우팅 (결제 진입).
- Y7a·Y7b: Takeaway 회귀 — hint 숨김 · Pay enabled.

## 스샷 (Playwright 웹 · 1180×820 iPad Pro landscape)

- `screenshots-m3-1105-y/checkout-preorder-no-time.png`
- `screenshots-m3-1105-y/checkout-preorder-with-time.png`

## 회귀 (run-all · assertions + playwright)

- 44개 중 **43 PASS** · 1 FAIL — `m3-1105-m-preorder-playwright.mjs` 섹션 9/10 (Hand over · fulfill).
- 이 실패는 master @ 79419d0 (내 브랜치 base) 에서도 동일하게 발생하는 **pre-existing**. M3-1105-X Fulfill 시트 변경 이후 Hand over/fulfill 버튼이 BottomSheet FlatList 안으로 숨겨진 영향으로 `components/orders/**` (티켓 Y 금지 영역) 수정 필요.
- 본 PR 변경과 무관 (사전/사후 동일 25/28).

## 파일 주인 (허용/금지 준수)

- 수정: `app/checkout/[draftOrderId].tsx` · `scripts/m3-1105-y-*` · `screenshots-m3-1105-y/*`.
- 미접촉 (금지): `components/ui/OptionChip.tsx` · 토큰 파일(M1-1105-AC 대기) · `components/orders/**` · `lib/printer` · `receipt-layout` · `_layout` · `ShiftCloseGate` · `storeport`.
- `components/payment/PreorderInputs.tsx` · `OrderTypePicker.tsx` 는 로직 불변 (조사용으로만 열람).

## CI

PR 푸시 뒤 GitHub Actions 자동 실행 — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/69 체크 참조.
