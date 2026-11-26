# 손님 화면(Customer Display · CD) — 승인된 화면 요소

범위: 손님이 보는 iPad(또는 web) · 상태 조합(payment_phase × customer_flow.state × tender) 으로 패널을 선택.
정본 리포: `storeport/apps/customer-display` · 현재 main(또는 운영 배포) 기준.
흐름 정본: `ledger/decision-cd-pos-sync-flow-20261125.md` · 디자인 정본: `ledger/decision-cd-pos-sync-design-20261125.md`.
계약서: `plans/cd-sync-contract-20261125.md` v1.3 (**폐기됨 11-26**) + storeport `docs/contracts/cd-sync-contract-v1.4.md` **(정본)**.

## 레이아웃 룰 (전역)

11-25 17:58 Kyu "대부분 승인" + 17:45 결정(`decision-cd-pos-sync-design-20261125.md:7` · `decision-cd-pos-sync-flow-20261125.md:22-24`).

| 상태 | 좌 1/3 | 우 2/3 |
|---|---|---|
| building(Sell/Cart/Checkout), flow=none | — | 주문내역(크게) · [Enter phone number] 비활성 |
| tendering(결제수단), flow=none, method=cash/card | 화면명 | 주문내역 · [Enter phone number] 활성 |
| tendering, flow=none, method=qris | — (풀스크린 아님 — v4 QR 큰 레이아웃) | 큰 QR + 금액 + 작은 장바구니 + [Enter phone number] (V4-4 · 2026-11-26) |
| tendering, flow≠none(입력/확인 중) | 화면명(cash/card) · 큰 QR(qris) · 남은 금액(split) | 키패드 / First visit / Confirm / Skipped |
| paid, flow=none | 전체 폭 영수증 → 3초 뒤 좌 1/3 로 밀려남 + 우 2/3 키패드 | — (전환 후 좌 1/3 mini + 우 keypad) |
| paid, flow≠none | mini 영수증 | 상태별 패널 (keypad/confirm/earned/payment-complete …) |
| failed/cancelled | 비움 | Failed 패널 |

문구 기본 언어 = English (Kyu 11-25 17:58).

## 요소

| ID | 위치 | Kyu 원문 · 승인일 | 승인된 모습 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `CD-CHIP-ORDERNUM` | CD 화면 구석 `#N` 칩 | 11-24 10:52 피드백 7 "Customer 화면에서도 몇번 주문 고객을 위한 화면인지 **칩 번호**가 나와줬으면해. #[번호] 형태로 … Order 번호를 칩번호로 쓰던지 해야할듯" (`decision-pos-phone-status-20261124.md:12`) + 11-24 11:03 승인 "모든 POS 화면 · 손님 화면 구석 · 영수증 맨 위 = 칩 번호 #N 하나" (`decision-pos-ui-approval-20261124.md:10`) | `#N` 단일 칩 · 긴 Order display_id 2중 관리 금지 | `storeport/apps/customer-display/app/cd-sync.tsx` (OrderChip) + mini receipt header 에 `#N` | **일치** |
| `CD-ORDER-LIST` | 우 2/3 주문내역 패널 | 11-25 17:58 "기존에 결제내역이 나오는 고객화면이 있는데, 거기에 나오는 상품 리스트와 결제금액이 너무 작아서 고객식별하기에 부족함이 있었어. 그 내용도 반영해서 **더 크게** 키워줘야해" (`decision-cd-pos-sync-design-20261125.md:11`) | 품목 32px · 합계 64px (디자인 반영본) · 우측 1/3 에 적립 예정 + [Enter phone number] 영역 | `storeport/apps/customer-display/src/components/cd-sync/` (OrderList 컴포넌트) + `cd-screen-selector.ts:83-99` `kind: 'order-list'` 분기 | **일치** |
| `CD-ENTER-PHONE-BTN` | CD 주문내역 우측 또는 QRIS 큰 QR 옆 | 11-25 17:45 결정 4 "QRIS: 번호 흐름 중 좌 1/3 에 QR, 결제 완료 시 그 자리가 영수증 — OK" · 11-26 15:40 V4-4 "QRIS 결제 중에도 번호 입력 버튼 활성" (`decision-cd-pos-sync-v4-20261126.md:9`) | 버튼 `Enter phone number` · 활성 조건 = `payment_phase = tendering` · method = qris 포함 (v4) · 누르면 `start_entry` → CD 는 키패드로 전환 | `storeport/apps/customer-display/src/lib/cd-screen-selector.ts:80,99,105-108` `enterPhoneEnabled` 분기 · qris-full + order-list 두 분기에서 각각 true | **일치** |
| `CD-QRIS-QR` | tendering + method=qris + flow=none | 11-25 17:45 결정 4 · 11-26 V4-4 "QRIS 결제 중 CD 에 QR 미표시" 재확정 (`decision-cd-pos-sync-v4-20261126.md:V4-4`) | **큰 QR** + 금액 + 작은 장바구니 + [Enter phone number] (M0-1126-H · V4-4) · qr_string 없으면 placeholder `Preparing…` | `storeport/apps/customer-display/src/lib/cd-screen-selector.ts:66-78` `kind: 'qris-full'` 분기 + `LeftPaymentPanel.tsx:129-178` (left-qris · left-qris-amount) | **일치** |
| `CD-KEYPAD` | 우 2/3 · state=entering | 11-25 17:23 핵심 화면 "2. 전화번호 입력화면" (`decision-cd-pos-sync-flow-20261125.md:10`) + flow table | 10 키 + Del + OK + Skip 버튼 · 실시간 phone_partial 서버 전송(계약서 §1 v1.3) | `storeport/apps/customer-display/src/components/cd-sync/KeypadPanel.tsx:92,101,126,140,154,167,191` (testID: `keypad-panel` · `phone-display` · `key-N` · `del-button` · `ok-button` · `skip-button`) | **일치** |
| `CD-FIRST-VISIT` | 우 2/3 · state=first_visit | 11-25 17:23 핵심 화면 3번째 사이 (`decision-cd-pos-sync-flow-20261125.md:10`) | 첫 방문 안내 패널 · `[Continue]` · `[Change number]` | `storeport/apps/customer-display/src/components/cd-sync/FirstVisitPanel.tsx:23,54,63,74` (testID: `first-visit-panel` · `first-visit-phone` · `continue-button` · `change-number-button`) | **일치** |
| `CD-CONFIRM` | 우 2/3 · state=confirming | 11-25 17:23 "전화번호를 입력해서 OK 까지 고객이 눌렀는데, 전화번호 입력을 하는 버튼이 나오면 안되지, 그것보다 **입력된 전화번호를 보여주면서 기존 포인트 점수도 보여주고 맞는지 확인하고**, 만약 안맞으면 전화번호를 수정할수 있는 버튼" (`decision-cd-pos-sync-flow-20261125.md:8`) | 번호 전체 · 현재 포인트 잔액 · `[맞아요]` 큰 버튼 · `[번호 수정]` | `storeport/apps/customer-display/src/components/cd-sync/ConfirmPanel.tsx:47,63,82,91,102` (testID: `confirm-panel` · `confirm-phone` · `confirm-balance` · `confirm-yes-button` · `change-number-button`) | **일치** |
| `CD-EARNED` | 우 2/3 · state=confirmed + phase=paid | 11-25 17:23 "Point earned 의 전제조건은, 결제가 성공이면서, 전화번호를 고객이 확인한 경우에만" (`decision-cd-pos-sync-flow-20261125.md:12`) | 적립 완료 패널 · 이번 적립액 · (기존 잔액 추가 가능) | `storeport/apps/customer-display/src/components/cd-sync/EarnedPanel.tsx:23,32` (testID: `earned-panel` · `earned-amount`) · selector 선택 = `cd-screen-selector.ts:60` `confirmed + paid → earned` | **일치** |
| `CD-FAILED` | 우 2/3 · state=confirmed + phase ∈ {failed, cancelled} | 11-25 17:23 "전화번호 확인까지 했는데, 결제가 POS쪽에서 실패하면 Point earned 화면에서는 결제 실패입니다 라는 메세지" (`decision-cd-pos-sync-flow-20261125.md:12`) | 결제 실패 메시지 패널 | `storeport/apps/customer-display/src/components/cd-sync/FailedPanel.tsx:13` (testID: `failed-panel`) · selector `cd-screen-selector.ts:61` | **일치** |
| `CD-SKIPPED` | 우 2/3 · state=skipped/unconfirmed | 11-25 17:45 결정 1 "번호 안 넣고 가면: [건너뛰기] + 무입력 20초 자동 처음화면" · 결정 2 "확인 안 누르면 20초 뒤 포인트 없이 종료(자동확인 없음) · POS 에 '확인 안 됨' 표시" (`decision-cd-pos-sync-flow-20261125.md:32-33`) | Skipped 패널 · 다음 처음화면으로 전환(또는 POS reset 때까지) | `storeport/apps/customer-display/src/components/cd-sync/SkippedPanel.tsx:13` (testID: `skipped-panel`) · selector `cd-screen-selector.ts:63-64` | **일치** |
| `CD-PAYMENT-COMPLETE` | 우 2/3 · phase=paid 직후(일시) | 11-26 M0-1126-D · CD-2 (오케 제안 · Kyu 복합 승인) | "Payment complete" 패널 · 좌 1/3 영수증 유지 · 3초 뒤 keypad 로 sheet 밀림 | `storeport/apps/customer-display/src/components/cd-sync/PaymentCompletePanel.tsx:43,47,67` (testID: `payment-complete-panel` · `payment-complete-check` · `payment-complete-method`) | **일치** · 출처=오케(Kyu 직접 승인 문구 없음 · 디자인 범위 승인 11-25 17:58 의 "대부분 승인" 안에) |
| `CD-RECEIPT-FULL` | 전체 화면 (phase=paid + flow=none) | 11-25 17:23 경우 1 "영수증 출력을 다 보여주고나서 3초 후에 > 영수증이 화면좌측으로 밀려나면서 ENTER PHONE 화면이 우측으로부터 밀려나옴. (영수증은 화면의 1/3 정도만 할애해서 보여주고 나머지 우측 2/3 영역을 전화번호 입력화면으로 배치)" (`decision-cd-pos-sync-flow-20261125.md:11`) | 영수증 전체 → 3초 → 좌 1/3 로 밀림 + 우 2/3 keypad | `cd-screen-selector.ts:82` `paid + none → receipt-full` + `receipt-then-keypad` 전환 | **일치** |
| `CD-RECEIPT-MINI` | 좌 1/3 (paid + flow 활성) | 위 흐름 연장 · 11-24 10:52 피드백 9 "POS 영수증 = 손님 화면 영수증" (`decision-pos-phone-status-20261124.md:14`) + 11-24 11:03 승인 (`decision-pos-ui-approval-20261124.md:12`) | POS 영수증과 **같은 데이터·배치** · mini 레이아웃 · 로고 · 매장 이름 · 주소 · WA · 영수증 번호 · 일시 · Order# · 캐셔 · 품목+옵션 · 세금 · 결제 · Received · QR · Thank you | `storeport/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:214,307-390` (testID: `left-receipt-mini` · `left-receipt-paper` · `mini-receipt-*` 다수) | **일치**(모양은 구현됨) · 다만 데이터 동기화 결함 = `CD-RECEIPT-FORMAT` (불일치) 참조 |
| `CD-RECEIPT-FORMAT` | 좌 1/3 영수증 **내용** | 11-24 10:52 피드백 9 (위) + 11-26 14:19 "CD 영수증 머리 = 'Store' (매장 이름·로고·주소·영수증 번호·일시·캐셔 없음) → POS 영수증과 형태 다름" (`decision-cd-pos-sync-v3-20261126.md:17`) | POS 영수증과 **완전히 같은** 데이터(매장 이름 있음 · 로고 있음 · 주소 · 영수증 번호 · 일시 · 캐셔 · 품목 · 옵션 · 세금 · Received · QR · Thank you) | `storeport/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:333` (mini-receipt-store-name) + 데이터 소스 — 매장명·주소 = storeport #454 머지 완료(f3161c8) · 나머지 필드 진행 중 | **진행 중 PR#457·#458** (매장명·주소 = storeport #454 머지 완료 · 결제수단·PB1·영수증번호·날짜 = #457 · 캐셔 이름·로고 = #458) |
| `CD-LEFT-SCREEN-NAME` | 좌 1/3 · tendering + flow 활성 · method=cash/card | 11-25 17:23 경우 2 "좌측은 **화면명 정도만 텍스트로 보여주고 대부분 흰색으로 비어둠**" (`decision-cd-pos-sync-flow-20261125.md:12`) | 작은 텍스트 "Cash payment" 또는 "Card payment" · 흰 공간 다수 | `storeport/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:103` (testID: `left-screen-name`) · selector `cd-screen-selector.ts:74-76,79` | **일치** |
| `CD-LEFT-REMAINING` | 좌 1/3 · tendering + flow 활성 + is_split=true | 11-25 17:45 결정 6 "나눠 결제 중엔 좌 1/3 에 남은 금액, 완납 시 영수증 — OK" (`decision-cd-pos-sync-flow-20261125.md:36`) | 남은 금액 노출 · 완납 시 영수증으로 전환 | `storeport/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:179-199` (testID: `left-remaining` · `left-remaining-amount`) · selector `cd-screen-selector.ts:74` | **일치** |
| `CD-STATE-FROM-SNAPSHOT` | 전역 — "CD 어떤 화면 보일지" 선택 | 11-25 17:23 매핑 테이블(위) · 11-26 15:40 V4-1 "Next customer 후 지난 주문 (#202 cart/draft) 스냅샷이 다시 CD 에 뜸" (`decision-cd-pos-sync-v4-20261126.md:V4-1`) | 서버 snapshot 에서 `payment_phase × customer_flow.state × tender` 3개로 **순수 함수 하나로 결정** · POS reset / Next customer / phone_entry_open 이면 `isPostSettlementStale` 로 과거 snapshot 거름 | `storeport/apps/customer-display/src/lib/cd-screen-selector.ts:88-122` `selectCdView` 순수 함수 · `apps/commerce-core/src/lib/customer-flow`·`register_session/lifecycle.ts` 의 `isPostSettlementStale` | **일치** (선택기 자체) · 단 **충돌/미결 2** 참조 — V4-1 결함은 미결 3 |

## 충돌·미결 목록 (CD)

### ~~충돌 1~~ → 오케 결정(11-26) · relay 계약서 v1.3 폐기됨
- [pos-payment-flow.md](./pos-payment-flow.md) ~~충돌 2~~ 오케 결정 반영 — relay `plans/cd-sync-contract-20261125.md` 폐기 · storeport v1.4 가 정본. **CD 쪽 `actions`/`locked` 필드는 storeport #456(머지 완료 · ce4f6ad) 에서 서버 측 추가됨** → storeport v1.4 §1 `docs/contracts/cd-sync-contract-v1.4.md:12-33`. CD 앱 자체는 변화 없음(POS 가 사용).

### ~~충돌/미결 2~~ → **보존 테스트 항목** · CD 상태가 서버 derive 한 줄에 좌우되는 구조 (M2-1126-J 감사 발견 2)
- M2-1126-J 결론(`plans/phone-status-history-20261126.md` 섹션 4): 서버 쪽 `deriveCustomerFlow` 한 줄 변경이 POS UI 를 조용히 바꾼다 — 구조적 위험.
- 현상태: `cd-screen-selector.ts` 는 순수 함수(검증 가능) · 그 입력을 derive 하는 서버 코드에 UI 영향이 집중.
- **보존 테스트 항목(통합 테스트 필요)**: `POS-HDR-PHONE` — `customer_flow` 입력 항상 존재 조건(production 입력 조건) 통합 테스트 · `customer_flow` 입력 + ① 버튼 노출 + ④ Re-enter + ⑤ Ask again 한 번에 어설션하는 테스트. 다음 라운드에서 추가. _(Kyu 질문 아님 — 기술 판단으로 처리)_

### ~~미결 1~~ → 진행 중 PR · `CD-RECEIPT-FORMAT` 매장 데이터 주입 (V3-2)
- 매장명·주소: storeport #454 머지 완료(f3161c8). 결제수단·PB1·영수증번호·날짜: storeport #457 진행 중. 캐셔 이름·로고: storeport #458 진행 중. Kyu 승인 "**POS 영수증 = 손님 영수증**" 유지. _(Kyu 질문 아님)_

### 미결 2 · PB1 세율 표시(11% vs 10%)
- 11-25 17:58 (`decision-cd-pos-sync-design-20261125.md:21`) "PB1 세율: 앱 라벨 11% · 금액은 10% (120,000 → 12,000) — Kyu 확인 요청" · 현재까지 Kyu 명시 결정 없음(= **미결**).

### ~~미결 3~~ → 진행 중 PR · V4-1 lingering previous order snapshot
- 11-26 15:40 "Next customer 를 눌렀어 … 기존매출 Order 상세내역이 고객화면에 떴어(불량)" (`decision-cd-pos-sync-v4-20261126.md:6`). storeport #457 (진행 중) 에서 수정 중. _(Kyu 질문 아님)_

## 보존 테스트 목록 (CD)

| 요소 | 자동 검사 1줄 | 기존 테스트 파일 |
|---|---|---|
| `CD-CHIP-ORDERNUM` | 우측 상단 `#N` 1개 노출 · 긴 display_id 미노출 | 없음(?) |
| `CD-ORDER-LIST` | building + flow=none 입력 → `order-list` 패널 + 품목·합계 크기 (실측) | 없음 |
| `CD-ENTER-PHONE-BTN` | tendering + flow=none (cash/card/qris 전부) → `enterPhoneEnabled=true` | `apps/customer-display/e2e/cd-pos-sync-v4-qris-none.spec.ts` (부분) |
| `CD-QRIS-QR` | tendering + method=qris + flow=none → `qris-full` + `left-qris-amount` · qr_string 없으면 placeholder | `apps/customer-display/e2e/cd-pos-sync-v4-qris-none.spec.ts` |
| `CD-KEYPAD` | state=entering → `keypad-panel` + 10 키 + ok-button + skip-button | `apps/customer-display/e2e/cd-sync-flow.spec.ts` 부분 |
| `CD-FIRST-VISIT` | state=first_visit → `first-visit-panel` + `continue-button` · `change-number-button` | `apps/customer-display/e2e/cd-sync-flow.spec.ts` 부분 |
| `CD-CONFIRM` | state=confirming → `confirm-panel` + `confirm-yes-button` · 번호/잔액 노출 | `apps/customer-display/e2e/cd-sync-flow.spec.ts` 부분 |
| `CD-EARNED` | state=confirmed + paid → `earned-panel` + `earned-amount` | `apps/customer-display/e2e/cd-sync-flow.spec.ts` 부분 |
| `CD-FAILED` | state=confirmed + failed/cancelled → `failed-panel` | 없음 |
| `CD-SKIPPED` | state=skipped → `skipped-panel` | `apps/customer-display/e2e/cd-sync-flow.spec.ts` 부분 |
| `CD-PAYMENT-COMPLETE` | 결제 완료 직후 `payment-complete-panel` → 3초 뒤 keypad | `apps/customer-display/e2e/cd-pos-sync-v2.spec.ts` (CD-2) |
| `CD-RECEIPT-FULL` | paid + flow=none → `receipt-full` · 3초 뒤 `receipt-then-keypad` | `apps/customer-display/e2e/receipt-done.spec.ts` 부분 |
| `CD-RECEIPT-MINI` | paid + flow 활성 → `left-receipt-mini` + mini-receipt-* 필드 | `apps/customer-display/e2e/receipt-same-as-pos.spec.ts` |
| `CD-RECEIPT-FORMAT` | mini-receipt-store-name ≠ "Store" (실제 매장 이름) · mini-receipt-store-logo 자산 존재 | **없음** (#457·#458 머지 뒤 추가) |
| `CD-LEFT-SCREEN-NAME` | tendering + flow + cash/card → `left-screen-name` | `apps/customer-display/e2e/cd-sync-flow.spec.ts` 부분 |
| `CD-LEFT-REMAINING` | is_split + flow 활성 → `left-remaining` + `left-remaining-amount` | 없음 |
| `CD-STATE-FROM-SNAPSHOT` | 선택기 순수 함수 + production 입력 조건 통합 어설션(= 서버 derive 변경이 UI 를 조용히 바꾸는 것을 막는 테스트) | **없음** (보존 테스트 항목 — 다음 라운드 추가 예정) |
