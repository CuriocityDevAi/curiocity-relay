# PB1 세금 — 현재 정답

범위: PB1(Pajak Barang & Jasa Tertentu — 자카르타 음식·음료점 세금) 세율 · 적용 범위 · 손님 화면 표기 · Admin 설정.

## 한눈 요약

| 항목 | 규칙 | 근거 |
|---|---|---|
| **세율** | **10%** (고정 — 폴백 11% 제거 · M0-1126-P) | 2026-11-26 22:03 Kyu "10%야." (`ledger/decision-kyu-4q-20261126.md:7`) |
| 과세표준 | **원래 총액** (store credit 사용 **전** 금액) | 2026-11-15 06:02 (`ledger/decision-loyalty-20261114.md:36`) |
| 라벨 | `PB1` (`PBJT` · `PPN` 은 매장별 선택지 · 현재 KT 매장 = PB1) | 영수증 view model · `storeport/apps/customer-display/src/types/order-snapshot.ts:42` |
| 손님 화면 표기 | 값이 있으면 `PB1 10%` + 금액 노출 · **값 없으면 세금 줄 전체 숨김** (V4-5 규칙과 동일) | `queue/m0/M0-1126-P.md:11` |
| 매장별 적용 여부 | 매장(stock location)별 설정 — 11-24 멀티 매장 체계 (닉네임·시작번호 등)와 묶여서 관리 | `ledger/decision-order-number-20261124.md` (멀티 매장) |

---

## 1 · 세율

### 1.1 Kyu 원문 (근거)

- 2026-11-26 22:03 "**10%야.**" (`ledger/decision-kyu-4q-20261126.md:7`) — PB1 세율 확정.
- 2026-11-25 17:58 "PB1 세율: **앱 라벨 11% · 금액은 10%** (120,000 → 12,000) — Kyu 확인 요청" (`ledger/decision-cd-pos-sync-design-20261125.md:21`) — 그때까지 **미결**. 11-26 22:03 에 10% 로 확정 · **해결**.

### 1.2 규칙

- **고정 10%** — Kyu 확정 (`ledger/decision-kyu-4q-20261126.md:7`).
- 손님 화면 폴백(11%) **제거** — M0-1126-P (`queue/m0/M0-1126-P.md:11`).
- 값 없으면 세금 줄 전체 숨김 — V4-5 규칙 (`queue/m0/M0-1126-P.md:11`).

### 1.3 구현 위치

- Snapshot 세금 타입 — `storeport/apps/customer-display/src/types/order-snapshot.ts:42` `label?: "PBJT" | "PPN" | "PB1" | null`.
- CD 영수증 mini 세금 줄 — `storeport/apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx:353-364` `view.taxShow` 가드 · 라벨 `${view.taxLabel} ${view.taxRatePct}%` · 금액 `view.taxAmount`.
- CD 영수증 전체 — `storeport/apps/customer-display/src/screens/ReceiptScreen.tsx` (같은 뷰 모델).
- OrderList 화면 세금 라벨 기본값 — `storeport/apps/customer-display/src/screens/OrderListScreen.tsx:33` `taxLabel = "PB1"`.
- POS 결제 미리보기 쪽 세금 라벨 — `storeport/apps/customer-display/src/mocks/adapter.ts:72-73` `taxLabel: "PB1" · taxRate: 10` (mock 기본).
- **폴백 11 제거 대상** — M0-1126-P 가 `storeport/apps/customer-display` 의 세율 폴백 1곳 (ReceiptScreen / PhoneFlowScreen 쪽) 제거 (`queue/m0/M0-1126-P.md:11`).
- 테스트(현행 버그 재현) — `storeport/apps/customer-display/src/screens/__tests__/receipt-view.test.ts:227` `taxRate: 11, // DEFAULT_LIVE_STORE 폴백값 — receipt 없으면 11% 가 나오는 버그 재현용` → M0-1126-P 뒤 이 폴백은 제거 → 값 없으면 세금 줄 전체 숨김으로 변경.

---

## 2 · 과세 표준 · 결제수단으로서의 store credit

### 2.1 Kyu 원문

- 2026-11-15 05:52 (bapenda 자카르타 확인 후) "1. 동의 2. 동의" — 적립금 = 결제수단 · PB1 은 **원래 총액**에 부과 · 전액/부분 사용 (`ledger/decision-loyalty-20261114.md:35`).

### 2.2 규칙

- PB1 과세표준 = **원래 total** (store credit 차감 전).
- Store credit 는 **결제수단**. Credit 로 낸 금액도 PBJT 과세표준에 포함(= bapenda 자카르타 기준).
- 영수증 순서: `Subtotal → PB1 → TOTAL → Store credit −X → Cash/QRIS 잔액 → Credit earned → Credit balance` (`ledger/decision-loyalty-20261114.md:39`).
- 세금 계산 방식 Admin 설정: 기본 "**결제수단(세법 기준)**" · "할인" 옵션은 세무사 확인 후 전환용.

### 2.3 구현 위치

- 영수증 view model — `storeport/apps/customer-display/src/screens/__tests__/receipt-view.test.ts:57` `tax: { show: true, label: "PB1" as const, rate_pct: 10, amount: 11_500 }`.
- 금액 계산 — M0-1126-P 범위 밖(= 금액 계산은 건드리지 말 것 · `queue/m0/M0-1126-P.md:11`).

---

## 3 · 매장별 적용

- 매장(stock location) 별로 **적용/미적용** 과 **라벨**(PB1 / PBJT / PPN) 선택 — 11-24 멀티 매장 체계 안에서 관리.
- 라벨 enum — `storeport/apps/customer-display/src/types/order-snapshot.ts:42`.
- 매장 설정 = Admin POS Settings (`storeport/apps/commerce-core/src/admin/routes/pos-settings/`).

---

## 4 · 손님 화면 표기 규칙

- **값 있음**: `PB1 10%` + 금액 노출 (`LeftPaymentPanel.tsx:353-364`).
- **값 없음**: 세금 줄 전체 숨김 (`view.taxShow` false) — V4-5.
- 라벨은 `view.taxLabel` 그대로. 세율 `view.taxRatePct` 가 null 이면 라벨만.

---

## 5 · 실기 여부

| 항목 | 상태 |
|---|---|
| PB1 10% Kyu 확정 | 2026-11-26 22:03 확정 |
| 손님 화면 폴백 11 제거 | **M0-1126-P 진행 중** |
| 매장별 라벨 enum | 구현 완료 |
| 영수증 세금 줄 노출 | 구현 완료 (`LeftPaymentPanel.tsx`) |

---

## 6 · 변경 이력

- 2026-11-15 06:02: PB1 = 원래 총액에 부과 (bapenda) · store credit = 결제수단 · 세법 기준 Admin 설정 · `ledger/decision-loyalty-20261114.md:35-36`.
- 2026-11-25 17:58: 앱 라벨 11% vs 금액 10% 불일치 — Kyu 확인 요청 → 미결 (`ledger/decision-cd-pos-sync-design-20261125.md:21`).
- 2026-11-26 22:03: **10%** 확정 → 손님 화면 폴백 11 제거 M0-1126-P 발부 (`ledger/decision-kyu-4q-20261126.md:7`).
