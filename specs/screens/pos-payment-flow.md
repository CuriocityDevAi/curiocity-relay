# POS 결제 흐름 — 승인된 화면 요소 (정본)

범위: 로그인 · Sell 탭 · Cart 시트 · Checkout · Cash/Card/QRIS payment · 나눠결제 · Payment successful.
Order 상세는 [pos-order-detail.md](./pos-order-detail.md), 손님 화면은 [customer-display.md](./customer-display.md) 참조.
정본 리포: `agilo-medusa-pos-fork` (= "fork") · 현재 master = `05c4bac` (2026-11-26 10:28).
진행 중 PR 꼬리표: fork #275 · fork #276 · storeport #457 · storeport #458.

## 공용 요소 `POS-HDR-PHONE` — 우측 상단 손님 번호 상태 칸 (6 상태)

| 항목 | 값 |
|---|---|
| ID | `POS-HDR-PHONE` |
| 노출 화면 | **Cart 시트 · Checkout · Cash payment · Card payment · QRIS payment · 나눠결제 · Payment successful** (7화면 전원) |
| 위치 | 각 화면 `Stack.Screen` 의 `headerRight` |
| Kyu 원문 (② 요구) | 2026-11-24 10:52 피드백 3 "고객이 숫자를 입력하면 바로 POS 화면 우상단에 고객의 전화번호가 실시간으로 뜨도록 … 입력중이면 ... 이 나오도록 … OK 를 눌렀을 때에는 #[번호] 081380442480 (Done) 이라고 바뀌었으면해 … 잘못넣었다고 할수 있으니, 그때 **버튼이 우측에 하나더 생기면서 고객에게 phone number를 다시 입력하는 화면을 보여주게 하는 버튼** … Cart, Checkout, Cash tender, Card tender, QRIS Payment 를 막론하고 화면 우측 상단에 같은방식으로 항상 보이도록 … Payment Successful 화면에서도 마찬가지로" (출처 `ledger/decision-pos-phone-status-20261124.md:8`) |
| Kyu 승인 (6상태 명세) | 2026-11-24 11:03 "다 승인" — "우측 상단 손님 번호 상태 칸 **6상태** ① Ask phone · ② Waiting · ③ 입력 중 실시간 파랑+점 3개 · ④ Done 초록+체크+**Re-enter** · ⑤ Skipped+**Ask again** · ⑥ 다른 손님 사용 중 노랑+자물쇠 — Cart · Checkout · Cash/Card/QRIS payment · 나눠결제 · Payment successful 공통" (출처 `ledger/decision-pos-ui-approval-20261124.md:6`) |
| Kyu 재확정 (V4-8) | 2026-11-26 15:53 "번호를 고객이 다 입력후 OK 를 누르고나서도, 잘못 입력했다고 할수 있으니, 캐시어가 고객화면에 번호입력 화면(phone entry) 를 보여줄수 있는 버튼도 만들어달라고 했었었어 … 결제도중에 언제든지 캐시어가 할수 있어야 … 우측상단에 그 버튼을 상시로" (출처 `ledger/decision-cd-pos-sync-v4-20261126.md:14`) |
| 승인 원형 ≠ 계약서 | 계약서 §5 `plans/cd-sync-contract-20261125.md:78` 는 **4 상태 chip** 로 축약(entering/confirming/confirmed/not_confirmed) · 버튼 3종(Ask/Re-enter/Ask again) 미반영 — **"계약서 축약"** 꼬리표. M2-1126-J 감사 경로 1 그대로. `docs/contracts/cd-sync-contract-v1.4.md`(storeport) 는 §1 에 6상태 + `actions: ['ask'|'reenter'|'ask_again']` 를 복구함(2026-11-26 M0-1126-I) — v1.4 가 Kyu 원형과 1:1 일치, v1.3 relay 계약서는 축약본으로 **폐기 예정**. |
| 현재 구현 | `fork/components/customer-display/CustomerPhoneStatus.tsx:72` (05c4bac) — **early-return `if (customerFlow !== null) return <CustomerFlowChip .../>`** 때문에 라인 85–185 의 6상태 분기가 dead code. 호출부 7화면 모두 `onAskPhone/onReenter/onAskAgain` prop 을 넘기지만 `CustomerFlowChip` (224-309) 는 **버튼 3종 미렌더** (Not confirmed 때 `onLinkCustomer` 만). 실시간 숫자 `partial…` 는 M3-1126-D 로 복구됨(라인 227-243). |
| 일치 여부 | **진행 중 PR#275/#276** (M3-1126-K `feat/M3-1126-K-phone-status` 라운드가 V4-8 6상태 + `actions` 매핑 복구 · storeport #457·#458 은 서버 쪽 `actions`/`locked`/`cancel_entry`/`start_entry` 추가) |

### 상태/변형 표 (6 상태 — 정본)

| # | 상태 | 조건(v1.4 기준) | 색/배지 | 문구 | 추가 버튼 | 버튼 동작 |
|---|---|---|---|---|---|---|
| ① | `ask` | `customer_flow.state = 'none'` · `actions ⊇ ['ask']` · 레지스터 lock 없음 | 회색 테두리 · pill | `#N · Ask phone` | 칩 전체가 버튼 | `start_entry` (POS → CD 번호 입력 열기 · PIN 없음) |
| ② | `waiting` | `state = 'entering'` · `phone` 없음 | 회색 테두리 · 점 3개 | `#N · Waiting` + dots | 없음 | — |
| ③ | `typing` | `state = 'entering'` · `phone.length > 0` | **파랑**(info) · 점 3개 | `#N · <phone>` + dots (실시간) | 없음 | — |
| ④ | `done` | `state = 'confirmed'` · customer_phone 세팅 · `actions ⊇ ['reenter']` | **초록**(success) · 체크 | `#N · <phone>` (또는 마스크) · 선택적 `· +Rp <earned>` 또는 `· IDR <balance>` | **Re-enter** (칩 안) | `start_entry` (customer_phone 보존 · phone_partial만 리셋) |
| ⑤ | `skipped` | `state = 'skipped' \| 'unconfirmed'` · `actions ⊇ ['ask_again']` | 회색 테두리 | `#N · Skipped` | **Ask again** (칩 안) | `start_entry` (skipped → entering) |
| ⑥ | `busy` | `locked = true` (= 같은 레지스터 타 snapshot `phone_entry_open`) | **노랑**(warning) · 자물쇠 | `Display · #M entering` (M = `entering_order_id` 의 pos_order_num) | 없음 (tap 비활성) | — |

### 추가 사실
- **영수증 아래 `[Ask phone on display]` 는 삭제됨**(별도 ID `POS-SUCC-ASK-PHONE-DEL` 참고). ① 과 ⑤ 가 그 역할을 대신.
- `customer_phone` 은 **Re-enter 중 보존**(v1.4 §2.1) · `cancel_entry` 로 돌려놓으면 복원.

### 보존 테스트 매핑
- 존재: `fork/e2e/flows/M1-1124-B-phone-status.spec.ts` (6상태 assert · `phone_entry_state`+`phone_partial` 입력 · **옛 분기**)
- 존재: `fork/e2e/flows/M3-1125-R-customer-flow.spec.ts` (4상태 chip assert · `customer_flow` 입력 · **새 분기**)
- **감사 경로 2**: 둘이 상호 배타 입력이라 CI 가 dead code 를 못 잡음. **없음** — `customer_flow` 입력 + ① 버튼 노출 + ④ Re-enter + ⑤ Ask again 을 한 번에 어설션하는 **production 입력 조건 통합 test**. (다음 라운드)

### 이력
- 2026-11-18: 입구 A `[Ask phone on display]` 추가 (영수증 아래 · fork `360cca5` PR #195)
- 2026-11-24 15:48: 6상태 + 버튼 3종 신설 (fork `7236d88` PR #247)
- 2026-11-25 20:59: `CustomerFlowChip` 도입 · 6상태가 dead code 로 (fork `e5d2116` PR #266 · M3-1125-R) — **승인 요소 소실**
- 2026-11-26 11:28·11:47: 실시간 숫자만 복구 (fork `05c4bac` PR #270 · M3-1126-D) — 버튼 3종 미복구
- 2026-11-26 15:53+: V4-8 재확정 · 복구 라운드 진행 중 (fork #275/#276 · storeport #457/#458)

---

## 로그인 화면

출처: `ledger/decision-pos-login-20261126.md:6-10` · Kyu 2026-11-26 11:20 WIB · 실기 맥북 Chrome `http://localhost:8081/login`.

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `LG-1` | 브라우저 탭 favicon | 11-26 11:20 "브라우저 탭에 보면, 메로스의 예전 로고(색깔이 주황색에 가까운)가 떠. > 새로운 버젼의 로고를 사용해줘. (가능하면 톱니무늬 반영된것으로)" (`decision-pos-login-20261126.md:7`) | 새 MEROS 로고(톱니무늬 반영) favicon · 옛 주황 로고 제거 | `fork/app.json:33` `favicon = assets/images/favicon.png` (**옛 자산 그대로**) | **진행 중 PR#276** (fork `feat/M1-1126-I` 라운드) |
| `LG-2` | 로그인 화면 중앙 로고 | 11-26 11:20 "화면 중앙에 POS 위에 메로스 로고가 있는데, 영수증모양의 M을 둘러싸고있는 네모난 노란색 박스 아랫부분에 영수증 뜯겨져나간 톱니무늬가 없어" (`decision-pos-login-20261126.md:8`) | 노란 박스 **아래 가장자리 영수증 톱니무늬** 있음 | `fork/app/login.tsx` (현 자산 · 톱니 없음) | **진행 중 PR#276** |
| `LG-3` | Email/Password 입력칸 | 11-26 11:20 "Email Address / Password 칸이 2칸을 입력할수 있는 세로 싸이즈이고, 너무 커. 1줄이면 충분한데, 첫줄에 빈칸이 들어가있는듯한 느낌이야" (`decision-pos-login-20261126.md:9`) | 1줄 높이 · 글자 세로 가운데 · 위쪽 빈 줄 느낌 제거 | `fork/app/login.tsx:131,144` placeholder `Email Address`/`Password` 사용 중 (높이 설정 확인 필요 · 현 2줄 체감) | **진행 중 PR#276** |

### 보존 테스트
- 없음 — 다음 라운드(`M1-1126-I` 복구 PR 에 함께).

---

## Sell 탭 (하단 탭 선택 · 상품 담기)

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `SELL-TAB-LABEL` | 하단 탭 `Sell` 선택 시 글자 | 11-26 15:40 "POS 화면 하단에 Sell 이 선택되어있을때, Sell 글자가 까맣게 되어서 전혀 안보여.(불량), 선택되어있을때에도 최소한 Sell 글자는 보여야한다고 봐." (`decision-cd-pos-sync-v4-20261126.md:7`) | 선택된 Sell 탭에서도 글자 `Sell` 명확히 보임 | `fork/app/(tabs)/_layout.tsx` (현재 선택 시 색 대비 저하) | **진행 중 PR#275** (V4-2 · M3-1126-H 라운드) |
| `SELL-PRODUCT-SHEET-IMG` | 상품 상세 시트 상단 사진 | 11-26 15:40 "Sell 화면에서 물건을 하나 클릭하면 … 아래에서 시트가 올라오는데, 사진이 좀 이상한 부분이 확대되어 보여 … 전체 사진이 sheet 의 상품 사진 영역에 맞게 fit 하게 줄어들어야 한다고 봐. (불량)" (`decision-cd-pos-sync-v4-20261126.md:8`) | 사진 **object-fit: contain** (전체 사진 fit) · crop 금지 | 미확인 (해당 시트 컴포넌트 파일) | **진행 중 PR#275** (V4-3) |
| `SELL-NEXT-CUSTOMER` | Sell 탭 상단 버튼 | 11-18 16:49 "'다음손님' 버튼 옆에 POS 에서 고객에게 핸드폰 번호 넣는 화면 보여주기 버튼이 있으면 어떨까" (`decision-cd-ask-phone-20261118.md:4`) + 11-25 M3-1125-R 경고 확장 | `[Next customer]` 버튼 · `customer_flow.state ∈ {entering, first_visit, confirming}` 이면 경고 시트 `[Keep waiting] [Next customer anyway → reset]` | `fork/app/(tabs)/sell.tsx:77-402` (M3-1125-R + S) · `fork/app/(tabs)/products.tsx:69-125` 경고 시트 | **일치** |
| `SELL-HAND-OVER` | Sell 탭 상단 버튼 (주문 있을 때) | 11-24 11:03 승인 범위 · `queue/m3/M3-1126-D.md` POS-4 Hand over · `decision-pos-ui-approval-20261124.md:3` "다 승인" | Hand over 버튼 · 눌림 피드백 | `fork/app/(tabs)/products.tsx:262-264` (M3-1121-C) — 현재 Hand over + Next customer 별도 줄 레이아웃 | **일치** |

### 보존 테스트
- `SELL-NEXT-CUSTOMER` 경고 시트: `fork/e2e/flows/M3-1125-R-customer-flow.spec.ts` (`next-customer-anyway` testID)
- `SELL-TAB-LABEL` · `SELL-PRODUCT-SHEET-IMG`: 없음 — M3-1126-H 라운드에서 추가.

---

## Cart 시트

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `CART-CHECKOUT-BTN` | Cart 패널 하단 버튼 | 11-24 10:52 피드백 1 "View Cart 에 아래에 Clear와 Pay 버튼이 있는데, 실제 Pay 버튼을 누르면, Checkout 화면으로 넘어가고, 다시 Pay버튼을 눌러야해. 즉, Cart 에서 Pay버튼의 명칭이 잘못되었어 > 내 생각에는 **Checkout** 이라고 버튼명을 바꾸는게 맞아" (`decision-pos-phone-status-20261124.md:6` · 승인 11-24 11:03 "다 승인") | 버튼 레이블 `Checkout` (기존 `Pay` 폐기) | `fork/components/cart/CartPanel.tsx:664,746` `Checkout` | **일치** |
| `CART-X-44PT` | Cart 시트 우측 상단 X 버튼 | 11-24 10:52 피드백 6 "View Cart 우측 상단에 있는 x 버튼이 있는데, 이 버튼이 좀 작은 느낌이야. 아이폰이나 아이패드 설정을 보면 … (좀더 커서 누르기 쉽고, 눌렀을때, 눌렸다는 느낌나도록)" (`decision-pos-phone-status-20261124.md:11`) | **44×44pt 원형 터치 영역** + 눌림 피드백(opacity/scale) · Apple HIG 최소 접근성 | `fork/components/cart/CartSheet.tsx:95-108` (M3-1124-O · PR #254) | **일치** |
| `CART-ORDER-CHIP` | Cart 시트 헤더 `#N` 칩 | 11-24 10:52 피드백 7 "Customer 화면에서도 몇번 주문 고객을 위한 화면인지 칩 번호가 나와줬으면해. #[번호] 형태로 적당하게 … Order 번호를 칩번호로 쓰던지 해야할듯. 지금은 2중관리 되고있어" (`decision-pos-phone-status-20261124.md:12`) + 11-24 11:03 승인 "모든 POS 화면 · 손님 화면 구석 · 영수증 맨 위 = 칩 번호 #N 하나 · 긴 Order 번호는 영수증 아래·주문 상세에만 작게" (`decision-pos-ui-approval-20261124.md:10`) | 칩 `#N` 단일(긴 Order display_id 제거) | `fork/components/cart/CartSheet.tsx:113` `<OrderChips />` + M3-1125-C `8c8bc19` PR #255 로 긴 display_id 제거 | **일치** |
| `CART-HDR-PHONE` | Cart 시트 headerRight | → 공용 `POS-HDR-PHONE` 참조 | ← | `fork/components/cart/CartSheet.tsx:85` | **진행 중 PR#275/#276** (공용 요소 상태 따름) |

### 보존 테스트
- `CART-CHECKOUT-BTN`: 없음 — 버튼 레이블 어설션 필요(다음 라운드).
- `CART-X-44PT`: 없음 — hit area px 어설션 필요.
- `CART-HDR-PHONE`: 공용 참조.

---

## Checkout 화면

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `CHECKOUT-TITLE` | 헤더 타이틀 | 11-24 11:03 승인 (제목·화면 이름) · `decision-pos-ui-approval-20261124.md:8` | 제목 `Checkout` · 긴 display_id 제거 (M3-1125-C) | `fork/app/checkout/[draftOrderId].tsx:361` `<Text className="text-2xl">Checkout</Text>` | **일치** |
| `CHECKOUT-ORDER-CHIP` | 헤더 우측 (옆) `#N` 칩 | → `CART-ORDER-CHIP` 과 같은 승인 (모든 POS 화면 · 칩 번호 단일) | `#N` 단일 | `fork/app/checkout/[draftOrderId].tsx:334` headerRight 내 OrderChips | **일치** |
| `CHECKOUT-TENDER-B` | 합계 아래 결제수단 3 버튼 | 11-24 11:03 승인 "Checkout = **B안**(아래에 Cash/Card/QRIS 버튼 바로 · Pay in parts 작은 링크)" (`decision-pos-ui-approval-20261124.md:7`) | `[Cash] [Card] [QRIS]` 3 버튼 바로 노출 · 선택 시 tender 화면 이동 | `fork/app/checkout/[draftOrderId].tsx:368-425` (M3-1124-O · PR #254) | **일치** |
| `CHECKOUT-PAY-IN-PARTS` | 결제수단 버튼 밑 작은 링크 | 11-24 11:03 승인 "Pay in parts 작은 링크" (`decision-pos-ui-approval-20261124.md:7`) | 작은 링크 `Pay in parts` → split-tender 흐름 · preorder 에서 비활성 | `fork/app/checkout/[draftOrderId].tsx:427-450` (preorder guard 325) | **일치** |
| `CHECKOUT-HDR-PHONE` | 헤더 headerRight | → 공용 `POS-HDR-PHONE` | ← | `fork/app/checkout/[draftOrderId].tsx:334-346` | **진행 중 PR#275/#276** |

### 보존 테스트
- `CHECKOUT-TENDER-B`: `fork/e2e/flows/M3-1126-B-checkout-snapshot.spec.ts` (B안 레이아웃 스냅샷)
- 나머지: 없음.

---

## Cash/Card/QRIS payment 화면

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `TENDER-CASH-TITLE` | 화면 타이틀 | 11-24 10:52 피드백 3 "Cash tender, Card tender 에서 tender 는 Payment 와 같은 의미야? 영어단어가 맞게 들어간건지 궁금해서" (`decision-pos-phone-status-20261124.md:8`) + 11-24 11:03 승인 "화면 제목 tender → **Cash payment / Card payment / QRIS payment**" (`decision-pos-ui-approval-20261124.md:9`) | 타이틀 `Cash payment` (단어 `tender` 금지) | `fork/app/checkout/tender-cash/[draftOrderId].tsx:340,398` `Cash payment` | **일치** |
| `TENDER-CARD-TITLE` | 화면 타이틀 | 위와 동일 | `Card payment` | `fork/app/checkout/tender-cash/[draftOrderId].tsx:397` (단일 파일에서 method 분기 · title 395-398) | **일치** |
| `TENDER-QRIS-TITLE` | 화면 타이틀 | 위와 동일 | `QRIS payment` | `fork/app/checkout/tender-cash/[draftOrderId].tsx:395` · `tender-qris/[draftOrderId].tsx` (QRIS 전용 화면) | **일치** |
| `TENDER-CASH-HDR-PHONE` | 헤더 headerRight | → 공용 `POS-HDR-PHONE` | ← | `fork/app/checkout/tender-cash/[draftOrderId].tsx:402-415` | **진행 중 PR#275/#276** |
| `TENDER-QRIS-HDR-PHONE` | 헤더 headerRight | → 공용 `POS-HDR-PHONE` | ← | `fork/app/checkout/tender-qris/[draftOrderId].tsx:84` | **진행 중 PR#275/#276** |
| `TENDER-CARD-HDR-PHONE` | 헤더 headerRight | → 공용 `POS-HDR-PHONE` | ← | `fork/app/checkout/tender-cash/[draftOrderId].tsx:402-415` (Card 는 Cash 화면 재사용) | **진행 중 PR#275/#276** |

### 보존 테스트
- Title: 없음 — 제목 단어 `payment` 어설션 필요.
- HDR-PHONE: 공용 참조.

---

## 나눠결제(Split tender)

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `SPLIT-TITLE` | 화면 타이틀 | 11-24 11:03 승인 범위 (`decision-pos-ui-approval-20261124.md:9` tender 대체) | 단어 `tender` 금지 · 분할 UI | `fork/app/checkout/split-tender/[draftOrderId].tsx` | **일치**(단, 경로명 `split-tender` 는 내부 URL — 사용자 눈 제목은 별도 확인 필요) |
| `SPLIT-HDR-PHONE` | 헤더 headerRight | → 공용 `POS-HDR-PHONE` | ← | `fork/app/checkout/split-tender/[draftOrderId].tsx:32` | **진행 중 PR#275/#276** |

### 보존 테스트
- 공용 참조.

---

## Payment successful 화면

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `SUCC-TITLE` | 헤더 타이틀 | 11-24 11:03 승인 범위 · M3-1125-C 긴 display_id 제거 | 제목 `Payment successful` · 긴 display_id 제거 | `fork/app/checkout/success/[orderId].tsx:273` `title: 'Payment successful'` | **일치** |
| `SUCC-RECEIPT` | 본문 영수증 | 11-24 10:52 피드백 9 "POS 에서 payment successful 화면에서 영수증이 나왔는데, 고객화면에서는 완전히 다른 영수증이 나오고있어> **같은 영수증이 나왔으면해**" (`decision-pos-phone-status-20261124.md:14`) + 11-24 11:03 승인 "POS 영수증 = 손님 화면 영수증" (`decision-pos-ui-approval-20261124.md:12`) | POS 영수증 = CD 영수증 (같은 데이터·배치 · 로고 · 매장 이름 · 주소 · WA · 영수증 번호 · 일시 · Order# · 캐셔 · 품목+옵션 · 세금 · 결제 · Received · QR · Thank you) | `fork/app/checkout/success/[orderId].tsx:294` `<SuccessReceiptAnim .../>` | **일치**(POS 쪽) · CD 쪽은 `CD-RECEIPT-FORMAT` (불일치) 참조 |
| `SUCC-HAND-OVER` | SuccessReceiptAnim 내부 Hand over 버튼 | 11-24 11:03 승인 범위 · `queue/m3/M3-1126-D.md` POS-4 Hand over | Hand over 버튼 · fulfill 후 holder 로 돌아감 | `fork/app/checkout/success/[orderId].tsx:291-293,300` `onHandOver` | **일치** (M3-1126-D 로 Hand over 중 적립 완료 칩 보이는 UX 확정) |
| `SUCC-NEXT-CUSTOMER` | SuccessReceiptAnim 내부 Next customer 버튼 | 11-18 16:49 입구 A 수반 · 11-24 11:03 승인 범위 | Next customer 버튼 · POS reset + CD reset | `fork/app/checkout/success/[orderId].tsx:305` `onNextCustomer` | **일치** |
| `SUCC-ASK-PHONE-DEL` | **(삭제된) 영수증 아래 Ask phone on display 버튼** | 11-24 10:52 피드백 9 "현재, ask phone on display 라는 버튼은, 신규로 만드는 우측 상단의 고객 번호입력 상태 섹션이 생긴다면 영수증 아래에는 더이상 필요가 없을듯" (`decision-pos-phone-status-20261124.md:14`) + 11-24 11:03 승인 "영수증 아래 Ask phone on display 버튼 **삭제**" (`decision-pos-ui-approval-20261124.md:7`) | **버튼 없어야 함**. 역할은 `POS-HDR-PHONE` ① Ask phone + ⑤ Ask again 이 대신. | `fork/app/checkout/success/[orderId].tsx:84` 코멘트 "영수증 아래의 Ask phone 버튼은 삭제 (역할은 ① · ⑤ 가 대신)" · 삭제 완료 (`7236d88` PR #247) | **일치** (삭제됨) |
| `SUCC-HDR-PHONE` | 헤더 headerRight | → 공용 `POS-HDR-PHONE` | ← | `fork/app/checkout/success/[orderId].tsx:274-287` | **진행 중 PR#275/#276** |
| `SUCC-LINK-CUSTOMER` | 영수증 옆 LinkCustomerCard (매니저 PIN 필수) | 11-18 16:58 "추후에 order을 찾아서 link 를 하는 경우는 매니저 4자리 비밀번호를 넣게 하자" (`decision-cd-ask-phone-20261118.md:5`) | 캐셔가 '적립 완료 뒤 번호 재입력' 할 진입점 · 매니저 PIN 사용 기록 | `fork/components/loyalty/LinkCustomerCard.tsx` — **POS-5 (`queue/m3/M3-1126-D.md`) 에 의해 `customer_flow.state ∈ {entering, first_visit, confirming, confirmed}` 이면 `null` 반환** (조건부 숨김) | **불일치** (충돌/미결 1 참조 — Kyu 결정 대기) |
| `POS-SUCC-PHONEENTRY` | 상단 칩 (V4-7) · **새 요소** | 11-26 15:40 "Link Customer 오른쪽에 Phone Entry 라는 버튼을 넣는거야. 그러면 아직 새로운 주문이 들어오기전이라면 phone entry 의 버튼이 생기는거고 … 캐시어가 Link Customer 버튼을 눌러서 매니저의 비번을 받아서" + 15:53 "응 그렇게 하자" (`decision-cd-pos-sync-v4-20261126.md:12-13`) | Payment successful **상단 칩** + Order 상세 Link customer 오른쪽에 `Phone entry` 버튼. 조건 4가지(가장 최근 결제 주문 · 새 장바구니 전 · 번호 미확인 · 영업 마감 전) · **PIN 없음** · 누르면 CD 에 해당 주문 영수증(좌) + 키패드(우). 엔드포인트 `POST /admin/pos/orders/:id/phone-entry` (storeport v1.4 §4) | **미구현** — `fork/app/checkout/success/[orderId].tsx` 에 없음. storeport 측은 v1.4 §4 로 계약서화됨(`docs/contracts/cd-sync-contract-v1.4.md:89-144`) | **미구현** (V4-7 · M3 + M0 라운드 대기 `#454` 머지 후) |

### 보존 테스트
- `SUCC-ASK-PHONE-DEL`: `fork/e2e/flows/M0-1118-N-ask-phone-on-display.spec.ts` — **삭제 후 적절한 어설션 필요**(현재 버튼이 "없음" 을 검증하는지 점검 필요).
- `SUCC-RECEIPT`: `storeport/apps/customer-display/e2e/receipt-same-as-pos.spec.ts` (CD 쪽) · POS 쪽 없음.
- `SUCC-HAND-OVER` · `SUCC-NEXT-CUSTOMER`: `fork/e2e/flows/M3-1126-D-pos-fixes.spec.ts` 부분 커버.
- `SUCC-LINK-CUSTOMER`: 없음 — 조건부 숨김 assert 필요(충돌 해소 뒤).
- `POS-SUCC-PHONEENTRY`: 없음 — 미구현.

---

## 충돌·미결 목록 (POS)

> Kyu 답이 필요한 항목. **본 문서에서 답을 쓰지 말 것**. 발부 시점에 Kyu 질문 후보로.

### 충돌 1 · `SUCC-LINK-CUSTOMER` 조건부 숨김 vs 기존 "진입점 B (PIN)"
- 11-18 16:58 승인(`decision-cd-ask-phone-20261118.md:5`): **Order 상세/Payment successful 에서 Link customer 는 PIN 을 받고 번호를 다는 진입점**(= 항상 있어야 함).
- 2026-11-26 `queue/m3/M3-1126-D.md:POS-5` 지시: "LinkCustomerCard: `customer_flow.state ∈ {entering, first_visit, confirming, confirmed}` 이면 `null` 반환(비노출)." → 이미 confirmed 된 주문이거나 번호 입력 중이면 캐셔가 번호를 바꿀 수 있는 PIN 진입점이 사라진다.
- 현재 fork 는 M3-1126-D 지시대로 동작 중(`#270` · `b50b1be`). 그러나 Kyu 는 "결제도중에 언제든지 캐시어가" V4-8 재확정(11-26 15:53 · `decision-cd-pos-sync-v4-20261126.md:14`).
- Kyu 질문 후보: "`SUCC-LINK-CUSTOMER` 는 `confirmed` 상태에서 **항상 보이되** V4-8 `POS-HDR-PHONE` ④ Done 의 Re-enter 가 PIN 없이 그 역할을 더 짧은 경로로 수행하므로 **숨기는 쪽**인가 · 또는 두 진입점(PIN 필수 vs PIN 없이) 을 **병존**시키는가?" — M2-1126-J 감사 발견 1.

### 충돌 2 · 계약서 v1.3 §5 축약(4상태) vs Kyu 11-24 11:03 승인(6상태+버튼 3종)
- 승인(정본): `decision-pos-ui-approval-20261124.md:6` **6상태 + Re-enter + Ask again**.
- 계약서 v1.3 (`plans/cd-sync-contract-20261125.md:78`): **4상태 chip** (entering/confirming/confirmed/not_confirmed) · 버튼 3종 미반영.
- storeport v1.4 (`docs/contracts/cd-sync-contract-v1.4.md:12-33`): 6상태 + `actions` 복구(승인 원형과 일치).
- Kyu 질문 후보: relay `plans/cd-sync-contract-20261125.md` 를 **폐기(= storeport v1.4 를 single source)** 할지, 또는 relay 계약서를 v1.4 델타 반영해 갱신할지 — 명세서는 **Kyu 승인 6상태** 를 정본으로 기록(= 계약서 축약 꼬리표).

### 미결 1 · 긴 Order 번호 채번 체계
- 11-24 11:03 "긴 Order 번호 채번 체계 — 오케 조사 후 Kyu 결정" (`decision-pos-ui-approval-20261124.md:14`). 현재 미결. 영수증 아래·주문 상세에 "작게" 노출하는 모습까지만 승인됨 — 번호 자체 룰은 Kyu 대기.

---

## 보존 테스트 목록 (POS · 요약)

| 요소 ID | 자동 검사 1줄 | 기존 테스트 파일 |
|---|---|---|
| `POS-HDR-PHONE` | 7화면에서 `cd-phone-status` testID 존재 + 6상태별 라벨/버튼(`cd-phone-status-reenter`·`cd-phone-status-ask-again`) 노출 | 분리됨(기존 2개 · 통합 필요) |
| `POS-HDR-PHONE / ⑥ busy` | `locked=true` 입력 시 "Display · #M entering" + 자물쇠 아이콘 | **없음** |
| `LG-1` | 웹 favicon = 새 로고 asset (해시) | 없음 |
| `LG-2` | 로그인 화면 로고 자산 톱니 포함(image diff) | 없음 |
| `LG-3` | Email/Password input height ≤ 48pt | 없음 |
| `SELL-TAB-LABEL` | 선택된 Sell 탭 글자 contrast ratio ≥ 4.5 | 없음 |
| `SELL-PRODUCT-SHEET-IMG` | 상품 시트 이미지 `object-fit: contain` | 없음 |
| `SELL-NEXT-CUSTOMER` | `customer_flow.state ∈ {entering, first_visit, confirming}` → 경고 시트 (`next-customer-anyway` testID) | `e2e/flows/M3-1125-R-customer-flow.spec.ts` |
| `CART-CHECKOUT-BTN` | Cart 패널 하단 버튼 레이블 = `Checkout` (단어 `Pay` 금지) | 없음 |
| `CART-X-44PT` | Cart X 버튼 터치 영역 ≥ 44×44 | 없음 |
| `CART-ORDER-CHIP` | 칩 `#N` 1개 · 긴 display_id 미노출 | 없음 |
| `CHECKOUT-TENDER-B` | 합계 아래 `[Cash] [Card] [QRIS]` 버튼 3개 노출 (B안) | `e2e/flows/M3-1126-B-checkout-snapshot.spec.ts`(부분) |
| `CHECKOUT-PAY-IN-PARTS` | `Pay in parts` 작은 링크 노출 · preorder 비활성 | 없음 |
| `TENDER-*-TITLE` | 타이틀에 `payment` 포함 · `tender` 금지 | 없음 |
| `SUCC-ASK-PHONE-DEL` | 영수증 아래 `[Ask phone on display]` 버튼 **없음** assert | 부분(`M0-1118-N-ask-phone-on-display.spec.ts` — 점검 필요) |
| `SUCC-RECEIPT` | POS 영수증 = CD 영수증 (필드 1:1) | storeport `receipt-same-as-pos.spec.ts` (CD 쪽) · POS 쪽 없음 |
| `SUCC-LINK-CUSTOMER` | 충돌 해소 뒤 작성 | 없음 |
| `POS-SUCC-PHONEENTRY` | V4-7 구현 뒤 작성 | 없음 |
