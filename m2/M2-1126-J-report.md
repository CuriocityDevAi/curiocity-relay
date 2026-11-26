PASS 변화 4건 (A 2 · B 2 · C 0) · 타 요소 2건

## 대상 · 범위

POS 결제 흐름 화면의 "손님 번호 상태 칸" (= 우측 상단 칩 + 버튼). 코드 수정 없이 조사만.
- 조사물: `agilo-medusa-pos-fork` `components/customer-display/CustomerPhoneStatus.tsx` · `useAskPhoneOnDisplay.ts` · `lib/loyalty-snapshot.ts` · `app/checkout/{tender-cash,tender-qris,split-tender,success/[orderId],[draftOrderId]}.tsx` · `components/cart/CartSheet.tsx` · `app/orders/[orderId].tsx`
- 산출물: 관련 조사 문서 `relay plans/phone-status-history-20261126.md` 1건(이 리포트에 근거로 인용).

## 요구 타임라인 (Kyu 승인 요소만 요약)

- R1 2026-11-18 Kyu "추천대로" (`ledger/decision-cd-ask-phone-20261118.md:4-5`) — 입구 A(결제 완료 화면 `Ask phone on display`, PIN 없음) + 입구 B(Orders → Link customer, PIN 필수).
- R2 2026-11-24 10:52 Kyu 피드백 3 (`ledger/decision-pos-phone-status-20261124.md:8`) — "실시간 숫자 · OK 뒤 Done · 잘못 넣었다 할 수 있으니 phone number 다시 입력 화면을 보여주는 버튼 · Cart/Checkout/Cash/Card/QRIS/Payment successful 공통".
- R3 2026-11-24 10:52 Kyu 피드백 9 (`ledger/decision-pos-phone-status-20261124.md:14`) — 영수증 아래 `Ask phone on display` 삭제(상단 칸이 대체).
- R4 2026-11-24 11:03 Kyu "다 승인" (`ledger/decision-pos-ui-approval-20261124.md:3-6`) — **6상태 ① Ask phone ② Waiting ③ 입력 중 실시간 파랑+점 ④ Done+Re-enter ⑤ Skipped+Ask again ⑥ Lock 노랑+자물쇠 · Cart·Checkout·Cash/Card/QRIS·나눠결제·Payment successful 공통**.
- R5 2026-11-24 11:31·11:35 Kyu "구현하자" ×2 (`queue/m1/M1-1124-B.md:3`).
- R6 2026-11-25 (`plans/cd-sync-contract-20261125.md:70-74` §5) — 오케 계약서로 "4상태 chip" 으로 축약. Kyu 명시 승인 없이 제정 · R4 와의 차이 미플래그.
- R7 2026-11-26 15:40·15:53 Kyu V4-8 🔴 (`ledger/decision-cd-pos-sync-v4-20261126.md:14`) — "요구사항과 구현내용이 어떻게 된건지 꼭 찾아주고 … 결제도중에 언제든지 캐시어가 할수 있어야 … 우측상단에 그 버튼을 상시로" → 버튼 3종 복구 + V4-7 Phone entry 추가.

## 구현 타임라인 · 3분류 판정

| # | 커밋 (SHA) | PR | 프롬프트 | 날짜 | 분류 | 판정 근거 |
|---|---|---|---|---|---|---|
| C1 | `360cca5` | fork #195 | `queue/m0/M0-1118-N.md` | 2026-11-18 | **A** | R1 그대로 발부 — "결제 완료 화면 [Ask phone on display] (A · PIN 없음)" 커밋 메시지. |
| C2 | `7236d88` | fork #247 | `queue/m1/M1-1124-B.md:9-23` | 2026-11-24 15:48 | **A** | R4 그대로 발부 — 신규 `components/customer-display/CustomerPhoneStatus.tsx` 에 6상태 분기(90~170 라인) + Ask phone/Re-enter/Ask again 버튼 + 호출부 6개 화면에 `onAskPhone/onReenter/onAskAgain` prop. 영수증 아래 Ask phone 삭제(R3). |
| C3 🔴 | `e5d2116` | fork #266 | `queue/m3/M3-1125-R.md:7-14` | 2026-11-25 20:59 | **B** | 프롬프트는 "snapshot.customer_flow 로만 결정 · 4상태(typing/awaiting/confirmed/not-confirmed) chip" 만 지시 · **R4 승인·버튼 3종 미인용 · 충돌 미플래그**. 코드는 `CustomerPhoneStatus.tsx:72-81` 에 `if (customerFlow !== null) return <CustomerFlowChip ...>` early-return → 옛 6상태 switch 가 **dead code 로 전환** · 호출부의 `onAskPhone/onReenter/onAskAgain` prop 은 넘겨도 UI 에서 호출되지 않음. 실시간 숫자 사라짐, Re-enter/Ask again/Ask phone 사라짐. |
| C4 | `05c4bac` / `b50b1be` | fork #270 | `queue/m3/M3-1126-D.md:9-15` | 2026-11-26 11:28·11:47 | **B** | 프롬프트가 "POS-2 … M3-1125-R PR #266 에서 … 회귀됐던 것 복구" 로 실시간 숫자만 지시 · 버튼 3종 복구 지시 없음 · POS-5 는 `LinkCustomerCard` 를 `state ∈ {entering,first_visit,confirming,confirmed}` 일 때 null 반환으로 또 다른 진입점도 숨김. 결과: 실시간 숫자는 돌아왔으나 Kyu 가 11-26 15:40 재실기 때 **버튼 3종 미복구** 를 확인. |

보조(= R4 승인 범위 내의 인접 변화 · 분류 외): `9f8eb3e` PR #254 Checkout B·tender 제목·X 44pt (R4 동일 라운드 승인), `8c8bc19` PR #255 헤더 긴 display_id 제거 (R4 범위).

## (B)/(C) 각 단계가 못 잡은 이유 (1줄)

- **R0**: `queue/r0/R0-1125-AK.md:5-12` 리뷰 범위가 "3자 계약 끝에서 끝 대조(서버·CD·POS)" 로 제한 · 기존 R4 Kyu 승인과의 대조 지시 없음 → `r0/R0-1125-AK-report.md` 는 lint·CI 만 CHANGES.
- **CI**: `e2e/flows/M1-1124-B-phone-status.spec.ts` 는 `phone_entry_state`+`phone_partial` 만 세팅(=옛 분기), `M3-1125-R-customer-flow.spec.ts` 는 `customer_flow` 만 세팅(=새 분기). 둘 다 그린 · **"production 은 customer_flow 가 항상 온다" 를 어설션한 통합 test 가 없어** 옛 분기가 dead code 가 된 사실을 모름.
- **실기**: 11-25 am 실기 체크리스트(`handoff-20261125-am.md`) 는 주문번호·Checkout B·영수증 탭 중심 · 버튼 3종을 직접 눌러보는 단계가 없었음. Kyu 가 11-26 QRIS 실기 중 처음 감지.

## 같은 위험이 있는 다른 요소 (발견만 · 수정 금지)

| 요소 | 상태 (파일:줄) | 위험 유형 | 비고 |
|---|---|---|---|
| **Payment successful 의 Link customer 버튼(시트 트리거)** | `app/checkout/success/[orderId].tsx:285,303` `onLinkCustomer` prop 전달. `LinkCustomerCard` 는 POS-5 로 `state ∈ {entering,first_visit,confirming,confirmed}` 면 `null` 반환 (C4) | **B 와 동계열** | 적립 완료 후 캐셔의 수동 재입력 진입점이 조건부 숨김 → V4-8 와 같은 뿌리. |
| **CD 상태 선택(`apps/customer-display/src/lib/cd-screen-selector.ts` · `deriveCustomerFlow`)** | `756e7fa` PR #444 · `68c0b9e` PR #451 · `M0-1126-E` 가 `customer_flow.phone = phone_partial` 복구 등 반복 수정 | **구조적 B/C 위험** | POS 칩의 단일 데이터 원천이 `customer_flow` 이므로, 서버 한 줄 변경이 POS UI 를 조용히 바꾼다. 이미 11-26 에 "실시간 숫자 사라짐" 이 서버 derive 쪽 원인으로 한번 발생(M0-1126-E 로 복구). |

(안정 확인됨 · B/C 재발 없음): Order 상세 Link customer(PIN · `app/orders/[orderId].tsx:947-957`), Checkout B안·tender 제목·View Cart X 44pt(#254), 헤더 긴 display_id 제거(#255). V4-7 "Phone entry" (결제 완료 주문 PIN 없음) 는 **미구현(리그레션 아님)** · M3-1126-K/M0-1126-I 라운드 의존.

## 결론 — 재발 경로 Top 3 + 어느 단계가 막았어야 했나

### 경로 1 — "새 계약서가 옛 Kyu 승인을 축약 반영"
- 11-25 `plans/cd-sync-contract-20261125.md:70-74` §5 가 R4 6상태·버튼 3종을 생략해 4상태만 명시 → M3-1125-R 프롬프트가 §5 를 정본으로 참조 → C3.
- 막는 단계: **요구 원장** = 계약서 신설 시 "직전 60일 Kyu 승인 요소와 1:1 대조 체크리스트" 필수.
- 막는 단계: **프롬프트** = "이 UI 면에 선행 Kyu 승인이 있으면 해당 요소를 명시적으로 보존" 라인 필수.
- 막는 단계: **허브(발부)** = 큐 발부 전 `grep -l "<해당 UI 면>" ledger/decision-*.md` 교차 확인 1회.

### 경로 2 — "early-return 리팩터가 옛 분기를 dead code 로 전환"
- `CustomerPhoneStatus.tsx:72-81` 의 `if (customerFlow !== null) return` 가 기존 6상태 switch(89-170) 를 우회. 호출부 prop 은 그대로 이어져 "코드는 있는데 화면엔 없다" 는 Kyu 감지 지연.
- 막는 단계: **프롬프트** = "두 컴포넌트 중복 금지(하나로 · 옛 상태를 새 계약 위에 얹기)" — 당시 M3-1125-R 에 없었음(이후 M3-1126-K 에 추가됨).
- 막는 단계: **R0** = "같은 컴포넌트 안 상호 배타적 분기 + 한 쪽이 production 입력을 전부 커버 → 반대쪽은 dead code" 린트/리뷰 체크.
- 막는 단계: **CI** = "production 입력 조건(= `customer_flow` 가 항상 온다) 에 기반한 통합 test 1개" 로 상호 배타적 분기 그린을 차단.

### 경로 3 — "부분 복구 프롬프트가 다른 누락은 안 다룸"
- `queue/m3/M3-1126-D.md:9-15` POS-2 가 실시간 숫자만 지시 · Re-enter/Ask again/Ask phone 복구 지시 없음 · POS-5 는 추가 숨김까지 지시. 결과: PR #270 이 회귀 복구 PR 로 표기됐지만 11-26 15:40 Kyu 실기 중 **버튼 여전히 없음** 재발.
- 막는 단계: **요구 원장** = 회귀 복구 지시 작성 시 "회귀 유발 커밋이 제거한 UI 요소를 git blame 으로 전부 열거" 템플릿.
- 막는 단계: **프롬프트** = "회귀 PR 가 지운 요소를 모두 복구 or 명시적 비복구 사유" 라인 필수.
- 막는 단계: **실기** = 매 회귀 복구 머지 후 직전 Kyu 원문(=R2/R4) 을 그대로 복붙한 1-페이지 체크리스트로 재실기.

---

관련 조사 문서: `relay docs/M2-1126-J-phone-status-history` 브랜치 `plans/phone-status-history-20261126.md` (커밋 `a1fc27ec7`).

증거 없는 부분: "실기 때 어느 체크리스트가 사용됐는지"(= 11-25·11-26 Kyu 실기 체크리스트 원본 미열람 — 추정은 `handoff-20261125-am.md` 섹션 "Kyu 아침 실기" 범위에서 버튼 3종 미포함 으로 간접 추정).

증거 없는 추정: C3 의 "충돌 미플래그" 는 M3-1125-R 프롬프트·계약서 §5·커밋 메시지·R0-1125-AK 리뷰·`r0/R0-1125-AK-report.md` 어디에도 "기존 R4 승인 요소(Ask phone/Re-enter/Ask again) 를 덮는다" 는 경고가 없음을 확인하여 "미플래그" 로 판정(확정) · "허브가 그 충돌을 아예 몰랐는지 vs 알고도 발부했는지" 는 **추정 불가**(기록 없음).
