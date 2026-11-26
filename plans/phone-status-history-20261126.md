# 조사 — 손님 번호 상태 버튼(POS 우측 상단) 변화·소실 이력 (M2-1126-J · 2026-11-26)

- 원장 대사(요지): Kyu 11-26 17:14 "구현되었던 고객번호 입력상태버튼이 다른모양이 되어버렸고, 기능도 달라져 버렸지 … 아예 버튼이 없어진적도 있었어 … 히스토리를 자세히 정리를 한 뒤에, 왜 이렇게 갑자기 기능이 변하거나 사라저버렸고, 어떤 경우에 그랬냐를 잘 따져보고"
- 근거 문서: `ledger/decision-cd-ask-phone-20261118.md` · `ledger/decision-pos-phone-status-20261124.md` · `ledger/decision-pos-ui-approval-20261124.md` · `ledger/decision-cd-pos-sync-flow-20261125.md` · `ledger/decision-cd-pos-sync-v4-20261126.md` · `plans/cd-sync-contract-20261125.md` v1.1~v1.3
- 조사 대상(읽기만 · 수정 금지): `agilo-medusa-pos-fork` `components/customer-display/CustomerPhoneStatus.tsx` · `components/customer-display/useAskPhoneOnDisplay.ts` · `lib/loyalty-snapshot.ts` · `app/checkout/{tender-cash,tender-qris,split-tender}/[draftOrderId].tsx` · `app/checkout/success/[orderId].tsx` · `app/checkout/[draftOrderId].tsx` · `components/cart/CartSheet.tsx` · `app/orders/[orderId].tsx`
- 범위 밖: M3-1126-K 가 지금 같은 파일을 복구 중이라 포크 쪽 수정 금지.

---

## 1. 요구 타임라인 (Kyu 원문 · 승인 여부)

| # | 일시(WIB) | 출처 | Kyu 원문(요지) | 승인 | 내용 |
|---|---|---|---|---|---|
| R1 | 2026-11-18 16:49·16:58 | `ledger/decision-cd-ask-phone-20261118.md:4-5` | "'다음손님' 버튼 옆에 POS 에서 고객에게 핸드폰 번호 넣는 화면 보여주기 버튼" · "추천대로" | ✅ Kyu 승인 | 입구 A(결제 완료 화면 **Ask phone on display**, PIN 없음) + 입구 B(Orders → Link customer, PIN 필수) |
| R2 | 2026-11-24 10:52 피드백 3 | `ledger/decision-pos-phone-status-20261124.md:8` | "고객이 숫자를 입력하면 바로 POS 화면 우상단에 고객의 전화번호가 실시간으로 … 입력중이면 … 이 나오도록 … OK 누르면 #… 081380442480 (Done) … 색깔 적용 … 잘못넣었다고 … 고객에게 phone number를 다시 입력하는 화면을 보여주게 하는 버튼 … Cart, Checkout, Cash tender, Card tender, QRIS Payment 를 막론하고 화면 우측 상단에 같은방식으로 … Payment Successful 화면에서도 마찬가지" | 설계 제안 | 우측 상단 6상태 공용 칸 (Kyu 원문의 핵심 요구) |
| R3 | 2026-11-24 10:52 피드백 9 | `ledger/decision-pos-phone-status-20261124.md:14` | "ask phone on display 라는 버튼은, 신규로 만드는 우측 상단의 고객 번호입력 상태 섹션이 생긴다면 영수증 아래에는 더이상 필요가 없을듯" | ✅ Kyu 승인 | 영수증 아래 Ask phone on display 삭제(역할은 ①·⑤ 가 대신) |
| R4 | 2026-11-24 11:03 | `ledger/decision-pos-ui-approval-20261124.md:3-6` | "다 승인" | ✅ Kyu 승인 | **6상태 ① Ask phone ② Waiting ③ 입력 중 실시간 파랑+점 ④ Done 초록+체크+Re-enter ⑤ Skipped+Ask again ⑥ 다른 손님 사용 중 노랑+자물쇠 — Cart·Checkout·Cash/Card/QRIS·나눠결제·Payment successful 공통** |
| R5 | 2026-11-24 11:31·11:35 | 큐 `queue/m1/M1-1124-B.md:3` | "구현하자" ×2 | ✅ 구현 발부 | M1-1124-B 로 구현 라운드 발부 |
| R6 | 2026-11-25 (계약서 §5) | `plans/cd-sync-contract-20261125.md:70-74` | (계약서) "칩: entering/first_visit 'Customer typing •••' · confirming 'Awaiting confirm · <phone>' · confirmed '✓ <phone> · IDR <balance>' · unconfirmed/skipped 'Not confirmed · Link customer'" | 오케 제안(계약서) · Kyu 명시 승인 없음 | **4상태로 축약 · R4 의 6상태·버튼 3종(Ask/Re-enter/Ask again) 미언급 · 충돌 미플래그** |
| R7 | 2026-11-26 15:40·15:53 🔴 | `ledger/decision-cd-pos-sync-v4-20261126.md:14` | "번호를 고객이 다 입력후 OK 를 누르고나서도, 잘못 입력했다고 할수 있으니, 캐시어가 고객화면에 번호입력 화면(phone entry) 를 보여줄수 있는 버튼도 만들어달라고 했었었어 … 요구사항과 구현내용이 어떻게 된건지 꼭 찾아주고 … 결제도중에 언제든지 캐시어가 할수 있어야 … 우측상단에 그 버튼을 상시로" | ✅ V4-8 재확정 | 버튼 3종(Ask/Re-enter/Ask again) 복구 + V4-7 결제 완료 주문 Phone entry 추가 |

---

## 2. 구현 타임라인 (fork 커밋 · 각 커밋이 손댄 이 칸의 상태)

| # | 커밋/PR/프롬프트 | 날짜 | 프롬프트 본문이 이 칸을 **명시적으로** 바꾸라 했나? | 실제 바뀐 것 (파일:줄) |
|---|---|---|---|---|
| C1 | `360cca5` · fork PR #195 · `M0-1118-N` (`queue/m0/M0-1118-N.md`) | 2026-11-18 | 입구 A 추가 — "결제 완료 화면 [Ask phone on display] (Next customer 옆)" 명시(= R1) | 영수증 아래 `[Ask phone on display]` 버튼 추가 (`app/checkout/success/[orderId].tsx:+124`) + 상태 머신 `lib/ask-phone-on-display.ts` 신설 |
| C2 | `7236d88` · fork PR #247 · `M1-1124-B/C/D` (`queue/m1/M1-1124-B.md:9-23`) | 2026-11-24 15:48 | **R4 를 그대로 발부** — "상태 6개 ①~⑥ · 넣을 화면(D7) Cart 시트 · Checkout · tender-cash/qris · split-tender · success/[orderId] · 전부 headerRight" | 신규 `components/customer-display/CustomerPhoneStatus.tsx` **6상태 분기 + Ask phone / Re-enter / Ask again 버튼** 구현 · 영수증 아래 Ask phone 삭제(R3) · 서버 필드 `phone_entry_state` + `phone_partial` 사용. 호출부 6개 화면 모두 `onAskPhone/onReenter/onAskAgain` prop 연결(`app/checkout/success/[orderId].tsx:282-284` 등) |
| C3 🔴 | `e5d2116` · fork PR #266 · `M3-1125-R`→`S`→`T` (`queue/m3/M3-1125-R.md:7-14`) | 2026-11-25 20:59 | **아니오 — "6상태" 미언급.** 프롬프트는 "우상단 손님 칩 — snapshot.customer_flow 로만 결정: entering/first_visit → 'Customer typing •••' · confirming → 'Awaiting confirm · <phone>' · confirmed → '✓ <phone> · IDR <balance>' · 결제 후 unconfirmed/skipped → 'Not confirmed · Link customer'" — **4상태 chip 만**. 기존 R4 승인·R3 버튼 3종을 덮는다는 경고 없음. | `CustomerPhoneStatus.tsx:72-81` 에 **`if (customerFlow !== null) return <CustomerFlowChip ...>` early-return 추가** → 6상태 분기(90~170 라인)가 **dead code 가 됨**. `CustomerFlowChip` 는 Ask phone / Re-enter / Ask again 버튼 **없음**. 호출부의 `onAskPhone/onReenter/onAskAgain` prop 은 넘겨도 호출되지 않음. **결과**: 입력 중 실시간 숫자 사라짐(고정 "Customer typing"), Done·Skipped 에서 Re-enter·Ask again 버튼 사라짐. |
| C4 | `05c4bac` / `b50b1be` · fork PR #270 · `M3-1126-D` (`queue/m3/M3-1126-D.md:9-15`) | 2026-11-26 11:28·11:47 | **부분적** — POS-2 "실시간 숫자 … M3-1125-R PR #266 에서 … 회귀됐던 것 복구" 명시. 하지만 Re-enter/Ask again/Ask phone 버튼 복구는 **지시 없음** · POS-5 는 "LinkCustomerCard: customer_flow.state ∈ {entering,first_visit,confirming,confirmed} 이면 null 반환(비노출)" 로 또 다른 대체 버튼도 숨김. | `CustomerPhoneStatus.tsx:228-242` — typing 분기에 `partial.length > 0 ? partial + '…' : 'Waiting for customer'` 복구(POS-2). confirmed 분기에 `+Rp <earned>` 추가(POS-3). **버튼 3종은 그대로 미복구**. LinkCustomerCard 추가 숨김(POS-5). |
| C5(계류) | 미착지 · fork 브랜치 `feat/M3-1126-K-phone-status` · `M3-1126-K` (`queue/m3/M3-1126-K.md:9-21`) | 2026-11-26 (진행 중) | **예** — "V4-8 우측 상단 칸(결제 진행 중 상시) ① Ask phone ② Waiting ③ 입력 중 실시간 숫자 ④ Done + Re-enter ⑤ Skipped + Ask again ⑥ 자물쇠" · 서버 계약 v1.4 의 `customer_flow.actions` 를 그대로 매핑 · 두 컴포넌트 중복 금지(하나로) | (현재 M3 세션이 작업 중 · 본 조사 범위 밖) |

보조 타임라인(인접 커밋 — 우측 상단 칸을 **직접** 건드리지 않았으나 같은 영역의 UI 를 바꿈):
- `9f8eb3e` PR #254 · `M3-1124-O` (2026-11-24) — Checkout B안 · tender 제목 Cash/Card/QRIS payment · View Cart X 44pt. 우측 상단 칸은 이미 R4 로 이 PR 보다 뒤 시점에 추가(C2 이후). R4 승인 범위 내.
- `8c8bc19` PR #255 · `M3-1125-C` (2026-11-25) — 긴 Order display_id 를 헤더 타이틀에서 제거 · 칩 #N 만 headerRight. R4 승인 범위 내.
- `6412809` PR #263 · `M3-1125-N` (2026-11-25) — Payment in progress UX P1~P6. 본 칸은 수정 안 함.

---

## 3. 3분류 판정 (A · B · C)

| 커밋 | 분류 | 근거 |
|---|---|---|
| C1 (`360cca5`) | **A — Kyu 명시 요청** | R1 원문 그대로(`decision-cd-ask-phone-20261118.md:4`). |
| C2 (`7236d88`) | **A — Kyu 명시 요청** | R2·R3·R4·R5 그대로(`decision-pos-phone-status-20261124.md:8,14` + `decision-pos-ui-approval-20261124.md:3`). |
| C3 (`e5d2116`) 🔴 | **B — 프롬프트가 이 칸을 바꾸라 했지만 기존 R4 승인(6상태+버튼 3종) 과 충돌 알림 없음** | `queue/m3/M3-1125-R.md:7-14` 는 "snapshot.customer_flow 로만 결정 · 4상태 chip 만" 을 지시 · **R4 승인·R3 버튼 3종 문구를 인용/보존 지시 없음** · 계약서 §5 자체가 4상태로 축약된 상태에서 참조만 됨(= 계약서 R6 자체가 R4 를 담지 않아 전염). 코드는 early-return 으로 옛 분기를 **완전히 우회**(`CustomerPhoneStatus.tsx:72`). |
| C4 (`05c4bac`/`b50b1be`) | **B (부분 복구 + 추가 숨김)** | `queue/m3/M3-1126-D.md:9-15` 는 POS-1~6 범위에서 "실시간 숫자" 와 "Hand over·영수증 NaN" 만 복구 지시 · 버튼 3종 복구 지시 없음 · POS-5 는 LinkCustomerCard 추가 숨김으로 사용자에게는 또 다른 "버튼 사라짐" 체감. **B 와 동계열**. |

### (B)/(C) 각 단계가 못 잡은 이유 (1줄)

- **R0 (리뷰)**: `R0-1125-AK` 가 PR #266 리뷰를 하였으나 범위 = "3자(서버·CD·POS) 계약 끝에서 끝 대조" (`queue/r0/R0-1125-AK.md:5-12`) — 기존 Kyu 승인 R4(6상태·버튼 3종) 와의 **대조 지시가 리뷰 큐에 없었음**. `r0/R0-1125-AK-report.md` 결과 역시 lint·CI 만 CHANGES · 버튼 손실은 조용히 통과.
- **CI (테스트)**: 두 e2e 가 **상호 배타적 입력**으로 각각 통과. `e2e/flows/M1-1124-B-phone-status.spec.ts:34-45` 는 `phone_entry_state`+`phone_partial` 만 넣고 `customer_flow` 없음 → 옛 6상태 분기 렌더 → 그린. `e2e/flows/M3-1125-R-customer-flow.spec.ts:7-28` 는 `customer_flow` 를 넣고 4상태 chip 만 확인 → 그린. **"production 은 customer_flow 가 항상 있음" 을 어설션한 테스트가 없어** 옛 분기가 dead code 가 된 사실을 CI 가 알 수 없었음.
- **실기 (Kyu)**: 11-25 실기는 QRIS flow(§8) · 11-25 am 실기(handoff-20261125-am.md) 는 주문번호·Checkout B·영수증 탭 중심 — 버튼 3종을 직접 눌러보는 단계가 실기 리허설 체크리스트에 없었음. Kyu 는 11-26 15:40 QRIS 실기 중에 처음으로 눈치챔(`ledger/decision-cd-pos-sync-v4-20261126.md:14`).

---

## 4. 같은 위험이 있는 다른 요소 (발견만 · 수정 금지)

| 요소 | 현황 (파일:줄) | 위험 유형 | 비고 |
|---|---|---|---|
| POS 결제 완료 화면 **"Ask phone on display" 영수증 아래 버튼** | 삭제됨(의도) — `7236d88` 에서 `app/checkout/success/[orderId].tsx` 에서 제거 | 해당 없음(R3 로 승인된 삭제) | 다만 "우측 상단 칸이 그 역할을 한다" 는 전제가 C3 로 깨졌음 → 손님에게 Ask 버튼을 보여줄 경로가 **일시적으로 소실** |
| **Payment successful 의 Link customer 버튼(시트 트리거)** | `app/checkout/success/[orderId].tsx:285,303` `onLinkCustomer` prop. 단, `components/loyalty/LinkCustomerCard` 는 `05c4bac` POS-5 에 의해 `state ∈ {entering,first_visit,confirming,confirmed}` 면 `null` 반환 | **B 와 동계열** — 캐셔가 '적립 완료 뒤 번호 재입력' 할 진입점이 조건부로 사라짐 | V4-8 과 같은 뿌리 |
| **Order 상세 화면 "Phone entry" 버튼 (V4-7 결제 완료 주문)** | **아직 존재하지 않음** — `app/orders/[orderId].tsx:947-957` 에는 `Link customer`(매니저 PIN · M0-1118-L) 만 있음. V4-7 승인(Kyu 15:53) 은 M3-1126-K/M0-1126-I 라운드에 의존 | 미구현 — 리그레션은 아님 | — |
| **Order 상세 Link customer(PIN) 버튼** | `app/orders/[orderId].tsx:947-957` 그대로 · 11-18 이후 변동 없음 | 안정 | — |
| **Sell 탭 Next customer 경고** | `app/(tabs)/sell.tsx` + `products.tsx` · M3-1125-R 에서 `customer_flow ∈ {entering,first_visit,confirming}` 일 때 경고 Dialog 추가 (`queue/m3/M3-1125-R.md:11`) | **상시 유지(A)** — 11-25 Kyu 17:45 결정으로 승인됨 | — |
| **CD 상태 선택(`cd-screen-selector`)** | `756e7fa` PR #444 (M1-1125-T), 이후 `68c0b9e` PR #451 (M0-1126-B), `b50b1be` PR #270 (M3-1126-D) 등 여러 번 수정 | **B/C 위험 상존** — POS 칩의 단일 데이터 원천이 `customer_flow` 가 된 뒤, 서버 쪽 `deriveCustomerFlow` 한 줄 변경이 POS UI 를 조용히 바꾼다. `M0-1126-E` 가 `customer_flow.phone = phone_partial` 로 복구한 사건이 이미 발생 | 서버 변경 라운드의 영향 반경이 UI 로 확산되는 구조 |
| **Checkout 화면 Order 번호 중복 표시 제거** | `8c8bc19` PR #255 로 긴 display_id 를 헤더 타이틀에서 제거 · 칩 #N 만 유지 | 안정(R4 승인 범위) | — |
| **tender 제목 Cash/Card/QRIS payment · Pay in parts 작은 링크 · View Cart X 44pt** | `9f8eb3e` PR #254 (M3-1124-O) | 안정(R4 승인 범위) | — |

---

## 5. 재발 경로 Top 3 · 어느 단계가 막았어야 했나

### 경로 1 — "새 계약서가 옛 Kyu 승인을 축약 반영"
- 11-25 `plans/cd-sync-contract-20261125.md:70-74` 의 §5 가 R4 의 6상태·버튼 3종을 생략한 채 4상태만 적음 → M3-1125-R 프롬프트가 이 §5 를 "정본" 으로 참조해 그대로 발부 → C3.
- **요구 원장**: 계약서 신설 시 "기존 Kyu 승인(decision-pos-ui-approval-20261124) 과 1:1 대조 후 누락 항목 목록 필수" 체크리스트 — 없음.
- **프롬프트**: M3-1125-R 에 "R4 승인 요소를 유지" 라인 — 없음.
- **허브**: 같은 UI 면에 선행 Kyu 승인이 있는지 큐 발부 전 `grep -l "우측 상단\|6상태\|Ask phone"` 로 교차 확인 — 없음.
- **R0**: R0-1125-AK 리뷰 범위가 3자 계약 일치만, Kyu 승인과의 대조는 큐에 없었음.
- **CI**: M1-1124-B 스펙과 M3-1125-R 스펙이 서로 다른 snapshot 모양을 쓰며 둘 다 그린 — "production 은 customer_flow 가 항상 온다" 라는 **코드 사실에 기반한 어설션**이 없었음.
- **실기**: 1-페이지 승인 요소 체크리스트(= 6상태 각 1장) 를 매 라운드 머지 전 필수화 — 없음.

### 경로 2 — "early-return 리팩터가 옛 분기를 dead code 로 전환"
- `CustomerPhoneStatus.tsx:72` 의 `if (customerFlow !== null) return <CustomerFlowChip ...>` 가 기존 6상태 switch(89-170) 를 **우회**. 옛 코드는 남았지만 호출부의 prop 은 더 이상 UI 로 안 나옴 → "코드는 있는데 화면엔 없다" 는 Kyu 감지 지연.
- **프롬프트**: "두 컴포넌트 중복 금지(하나로)" 가 M3-1125-R 에 없었음(이후 M3-1126-K 에 추가됨). early-return 대신 "옛 상태를 새 계약 위에 얹기" 를 미리 지시했어야 함.
- **R0**: 동일 컴포넌트 내부에 **상호 배타적 분기**가 생기면 "한쪽은 dead code" 라는 린트/리뷰 체크 — 없음.
- **CI**: 신규 test 가 옛 test 와 같은 파일을 커버하지만 **상호 배타 입력** 이라 두 분기 모두 "실행됐다" 고 간주 — 분기 커버리지가 아니라 **"production 입력 조건" 에 가깝게 세팅된 하나의 통합 test** 로 묶어야 했음.

### 경로 3 — "부분 복구 프롬프트가 다른 누락은 안 다룸"
- `M3-1126-D.md:9-15` POS-2 는 실시간 숫자 복구만 지시. Re-enter/Ask again/Ask phone 3종 버튼 복구는 누락. 결과: PR #270 이 "회귀 복구 PR" 로 표기되었지만 Kyu 가 11-26 15:40 재실기 중 여전히 **버튼이 없음** 을 발견.
- **요구 원장**: 회귀 복구 지시 작성 시 "회귀 발생 당시 승인된 요소를 전부 나열" 템플릿 — 없음(POS-2 만 한 줄).
- **프롬프트**: "회귀 확인 시 git blame 으로 동일 PR 가 제거한 **모든** UI 요소 열거 후 선택적으로 복구" 지시 — 없음.
- **R0**: #270 리뷰도 POS-2 복구만 확인 (스펙 범위 그대로) — 외부 승인 요소와의 대조가 없었음.
- **실기**: Kyu 가 "ok 전에 틀렸다고 할 수 있으니 Re-enter" 라는 원문을 매 회귀 재실기 시 체크리스트에 재사용할 1-줄 요구 — 없었음.

---

## 결론

- 변화 N = **4건** (C1·C2·C3·C4) · A 2건(C1, C2) · B 2건(C3, C4) · C 0건.
- 타 요소(같은 B/C 뿌리 또는 그 영향으로 숨겨진 버튼) = **2건** (Payment successful 의 LinkCustomerCard 조건부 숨김 · CD 상태 선택기의 서버 한 줄 변경이 POS UI 를 조용히 바꾸는 구조적 위험).
- 미구현(리그레션 아님)이지만 승인됨 = 1건 (Order 상세 "Phone entry" V4-7 · M3-1126-K/M0-1126-I 라운드).
- 재발 뿌리는 **계약서 축약 → 프롬프트 참조 → early-return 우회 → CI 상호 배타 통과** 의 4단 전염.
- 가장 싼 차단점은 **큐 발부 전 교차 grep(이 UI 면에 선행 Kyu 승인 존재 여부)** + **production 입력 조건에 기반한 통합 test 1개**.
