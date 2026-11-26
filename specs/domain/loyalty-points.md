# 로열티 포인트 (적립금 · store credit) — 현재 정답

범위: 주문당 적립/회수, Re-enter(번호 교체) 처리, 나중 연결 PIN, 적립 조건.
금액·사용 규칙(결제수단으로 쓰기)은 § 4 요약.

## 한눈 요약

| 항목 | 규칙 | 근거 |
|---|---|---|
| 적립 조건 | 결제 **성공(paid)** AND 번호 **확인(confirmed)** AND 주문당 **1회** | 11-25 17:23 (`ledger/decision-cd-pos-sync-flow-20261125.md:12`) · 11-15 (`ledger/decision-loyalty-20261114.md:39`) |
| 회수(환불) | 환불 시 **자동 회수** · 0 바닥 | 11-16 Q2 (`ledger/handoff-20261116.md`) · M2-1116-D 구현 |
| Re-enter A→B 교체 | **A 적립 회수 + B 적립** · 11-17 회수 규칙 재사용 · 한 트랜잭션 · 멱등 | 11-18 (`ledger/decision-cd-ask-phone-20261118.md:13`) · 11-26 (`ledger/decision-kyu-4q-20261126.md:8`) · M0-1126-P 진행 중 |
| Re-enter 취소/건너뜀 | **A 그대로** (회수 없음) | 11-18 + #459 ⑤⑥ 보존 |
| 나중 연결 (Order 상세) | **매니저 4자리 PIN** 필수 · PIN 사용 서버 기록 → Admin 조회 | 11-18 (`ledger/decision-cd-ask-phone-20261118.md:5`) |
| 입구 A (결제완료) | **PIN 없음** · 상태 칸 ① Ask phone · ⑤ Ask again · V4-7 Phone entry | 11-18 + 11-24 11:03 (`ledger/decision-pos-ui-approval-20261124.md:7`) |
| 적립 대상 금액 | 실제로 낸 돈(= store credit 사용분 제외) · Admin 설정 | 11-15 (`ledger/decision-loyalty-20261114.md:38`) |
| 적립금 사용 | **결제수단** (bapenda 자카르타 기준) · 전액/부분 모두 · 1회 최대 100%(Admin) | 11-15 (`ledger/decision-loyalty-20261114.md:35-37`) |
| PB1 세금 | **원래 총액에 부과** (store credit 전 금액) | 11-15 (`ledger/decision-loyalty-20261114.md:36`) — 상세 → [tax-pb1.md](./tax-pb1.md) |

---

## 1 · 적립 (earn)

### 1.1 Kyu 원문

- 2026-11-25 17:23 "**Point earned 의 전제조건은, 결제가 성공이면서, 전화번호를 고객이 확인한 경우에만**. 즉 1,2,3,4,5, 모두 결제완료 + 전화번호 확인. **전화번호 확인까지 했는데, 결제가 POS쪽에서 실패하면** Point earned 화면에서는 결제 실패입니다 라는 메세지" (`ledger/decision-cd-pos-sync-flow-20261125.md:12`).
- 2026-11-15 06:02 "적립 대상 = **실제로 낸 돈**(적립금 사용분 제외) · Admin 설정값" (`ledger/decision-loyalty-20261114.md:38`).

### 1.2 규칙

- 적립 trigger = `payment_phase = paid` ∧ `customer_flow.state = confirmed`. 어느 한쪽이라도 아니면 적립 없음.
- **주문당 1회**. 같은 번호로 다시 confirm 해도 **이중 적립 없음**.
- 적립액 = `(실결제 — store credit 사용분) × 적립률(Admin)`. 적립률·최소 사용 금액·소멸 기간 모두 Admin 설정 (`ledger/decision-loyalty-20261114.md:21`).
- 영수증 표기: `Subtotal → PB1 → TOTAL → Store credit −X → Cash/QRIS 잔액 → Credit earned → Credit balance` (`ledger/decision-loyalty-20261114.md:39`).

### 1.3 구현 위치

- 서버 적립 trigger — `storeport/apps/commerce-core/src/modules/customer_flow/*` (customer-flow orchestrator의 confirm 경로) · `loyalty` 플러그인 (`@medusajs/loyalty-plugin` 재사용 · `ledger/decision-loyalty-20261114.md:12`).
- CD 적립 패널 — `storeport/apps/customer-display/src/components/cd-sync/EarnedPanel.tsx:23,32` (testID: `earned-panel` · `earned-amount`) · selector 선택 = `storeport/apps/customer-display/src/lib/cd-screen-selector.ts:60` (`confirmed + paid → earned`).

---

## 2 · 회수 (retract) — 환불 시

### 2.1 Kyu 원문

- 2026-11-16 Q2 "환불 시 **자동 회수** · 0 바닥"(`ledger/handoff-20261116.md`).
- 2026-11-18 16:49 "이미 연결된 주문: POS 확인 후 교체 · **기존 번호 적립 회수(11-17 회수 규칙)** · 새 번호 적립" (`ledger/decision-cd-ask-phone-20261118.md:13`).

### 2.2 규칙

- 환불 시 적립분 자동 회수 · 잔액이 부족하면 **0 바닥**(음수 금지).
- A 잔액이 이미 다 소진되어 회수 불가 시 처리는 11-17 **회수 규칙의 기존 처리** 그대로 따름 — 신규 규칙 만들지 말 것 (`queue/m0/M0-1126-P.md:8`).

### 2.3 구현 위치

- `storeport/apps/commerce-core/src/modules/loyalty/` 회수 함수 (11-17 회수 규칙 — M2-1116-D · `#289` 환불 자동 회수).

---

## 3 · Re-enter (번호 교체) — A → B

### 3.1 Kyu 원문

- 2026-11-18 16:58 "**이미 연결된 주문**: POS 확인 후 교체 · 기존 번호 **적립 회수**(11-17 회수 규칙) · 새 번호 적립" (`ledger/decision-cd-ask-phone-20261118.md:13`).
- 2026-11-26 22:03 "응 동의" — Re-enter 로 A→B 교체 시 A 회수 + B 적립 (`ledger/decision-kyu-4q-20261126.md:8`).

### 3.2 규칙

- `confirmed(A · 적립됨) → Re-enter → B 확정` 시: **A 적립분 회수 → B 에 적립** (한 트랜잭션 · 멱등 · 적립 기록 누가/언제/어느 주문).
- **같은 번호 교체(A = B)**: 변화 없음.
- **Re-enter 취소/건너뜀 시**: A 그대로 (= `cancel_entry`/`skip` · #459 ⑤⑥ 보존 테스트).
- 멱등: 같은 요청 두 번 와도 A 이중 회수 · B 이중 적립 없음.
- **A 잔액 부족**: 11-17 회수 규칙의 기존 처리. 없으면 **Kyu 질문 후보** 로 리포트.

### 3.3 구현 위치

- M0-1126-P 진행 중 — `storeport/apps/commerce-core/src/modules/loyalty/earnForOrder` + 회수 함수 + customer-flow confirm(Re-enter 경로) 통합 (`queue/m0/M0-1126-P.md:4-8`).
- 테스트 — `storeport/apps/commerce-core/integration-tests/pos/cd-pos-sync-v4.spec.ts` ⑦ 기대값 변경 + 멱등 케이스 1개 · ⑤⑥ (취소·건너뜀 = A 그대로) 그대로 통과.

---

## 4 · 사용(store credit as payment)

### 4.1 Kyu 원문

- 2026-11-15 05:52 "일단 전액 사용 가능 하다는것은, 결제금액의 부분사용도 가능하다는 말이지? Admin 설정은 기본값 100%에 동의함." · "1. 동의 2. 동의" (`ledger/decision-loyalty-20261114.md:35`).

### 4.2 규칙

- 적립금 = **결제수단** (Bapenda 자카르타: 루피아 바우처 결제분도 PBJT 과세표준에 포함).
- PB1 은 **원래 총액**에 부과 (store credit 차감 **전** 금액 기준) — 상세 [tax-pb1.md](./tax-pb1.md).
- 전액 / 부분 사용 모두 가능. 1회 최대 사용 비율 **기본 100%** (Admin).
- 세금 계산 방식 Admin 설정: 기본 "결제수단(세법 기준)" · "할인" 옵션은 세무사 확인 후 전환용.
- 적립금은 나눠결제 **2-tender 한도와 별도** 처리(기술 결정 · 오케 · `ledger/decision-loyalty-20261114.md:40`).

---

## 5 · 입구 A/B (PIN 유무)

### 5.1 입구 A — 결제 완료 직후

- 위치: Payment successful 화면 상단 상태 칸 (①·⑤) + V4-7 Phone entry 칩.
- **PIN 없음**.
- 근거: 11-18 (`ledger/decision-cd-ask-phone-20261118.md:10`) + 11-24 11:03 (`ledger/decision-pos-ui-approval-20261124.md:7`).

### 5.2 입구 B — Orders → 주문 상세 Link customer

- 위치: 주문 상세 하단 `Link customer` 버튼 (옆 Phone entry 는 PIN 없음 — V4-7).
- **매니저 4자리 PIN 필수**.
- 사용 범위: 추후 Order 를 찾아 번호를 다는 경우 (= "나중 연결") → **같은 날** 주문만.
- PIN 사용 기록: 서버 저장 → Admin "Manager PIN" 화면 (날짜별 · 기능 · 주문번호 · 금액 · 시각 · 캐시어 조회) · `ledger/decision-cd-ask-phone-20261118.md:5,13,16`.
- 구현: `fork/components/loyalty/LinkCustomerCard.tsx` · `fork/app/orders/[orderId].tsx:1013-` `<LateLinkCustomerSheet .../>` (M0-1118-L) · PIN 서버 기록 = M2-1118-N.

### 5.3 왜 두 개를 둠

- 입구 A = 현장 캐셔가 **그 자리에서 손님 번호를 받는** 흐름 — 번호를 안 넣고 가는 경우 손해를 막기 위해 짧은 경로.
- 입구 B = 캐셔가 **과거 주문에 번호 달기** 흐름 — 자기 친구 번호로 포인트 돌리는 **오용 방지** 목적으로 PIN 필수 (Kyu 11-18 16:58).

---

## 6 · 실기 여부

| 항목 | 상태 |
|---|---|
| 적립(paid + confirmed) | 실기 완료 |
| 환불 자동 회수(11-17) | 실기 완료 (M2-1116-D) |
| Re-enter A→B 이동 | **M0-1126-P 진행 중** (2026-11-26) |
| PB1 10% 폴백 제거 | **M0-1126-P 진행 중** |
| 나중 연결 PIN · Admin 조회 | 구현 완료 (M0-1118-L · M2-1118-N) |
| 손님 번호 입력 입구 A | 11-26 V4-7 Phone entry 진행 중 (`#276` 머지 완료 · `#454` 머지 완료) |
| R2 Admin 설정 시뮬레이션 게이트 | 발부 대기 (`ledger/decision-loyalty-20261114.md:44-45`) |

---

## 7 · 변경 이력

- 2026-11-14 ~ 15: 로열티 라운드 C 재설계 — 적립금(store credit) · 고객용 앱 · 적립금 결제수단 (`ledger/decision-loyalty-20261114.md`).
- 2026-11-16: 환불 시 자동 회수 · 0 바닥 (Q2 · `ledger/handoff-20261116.md`).
- 2026-11-17: 회수 규칙 구현.
- 2026-11-18: 입구 A(PIN 없음) + 입구 B(PIN 필수) + 나중 연결 "같은 날" 제한 · PIN 서버 기록 · Admin 조회 (`ledger/decision-cd-ask-phone-20261118.md`).
- 2026-11-25: 적립 조건 = paid ∧ confirmed · 실패 시 "결제 실패" 메시지 (`ledger/decision-cd-pos-sync-flow-20261125.md:12`).
- 2026-11-26 22:03: Re-enter A→B 이동 Kyu "응 동의" → M0-1126-P (`ledger/decision-kyu-4q-20261126.md:8`).
