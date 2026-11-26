PASS 요소 53 · 일치 36 · 불일치 15 · 미구현 2 · 충돌/미결 7

# M1-1126-P — 화면 명세서 첫 판 (POS + CD)

- 브랜치: `docs/M1-1126-P-screen-spec`
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/52 (docs 전용 · 오케 머지 대기)
- 커밋: `5bd0d3369` docs(spec-guard): M1-1126-P — 화면 명세서 첫 판 (POS + CD · 요소 53)
- 소요: 코드 수정 없음 · 문서 전용. 60분 상한 내 완료.
- processes: `[spec.screen_first_edition]`

## 신규 파일

- `specs/screens/README.md` — 규약·ID 체계·갱신 절차·보존 테스트 룰.
- `specs/screens/pos-payment-flow.md` — 로그인 LG · Sell · Cart · Checkout · Cash/Card/QRIS · 나눠결제 · Payment successful + 공용 `POS-HDR-PHONE` 6상태 (요소 33).
- `specs/screens/pos-order-detail.md` — Link customer(PIN) · Phone entry(V4-7 미구현) · 영수증 (요소 3).
- `specs/screens/customer-display.md` — 대기 · Order list · QRIS QR · 키패드 · First visit · Confirm · Earned · Failed · Skipped · Payment complete · 영수증 full/mini · 좌측 패널 (요소 17).

## 수치 분해

| 상태 | 개수 | 내용 |
|---|---|---|
| 일치 | 36 | 완전 매칭(Kyu 원형 ↔ 코드) |
| 불일치 (pure) | 2 | `CD-RECEIPT-FORMAT`(V3-2 매장 데이터 미주입 · storeport#454 뒤 M0-1126-F) · `SUCC-LINK-CUSTOMER`(POS-5 조건부 숨김 vs Kyu 11-18 승인) |
| 불일치 (진행 중 PR#) | 13 | `POS-HDR-PHONE` + CART/CHECKOUT/TENDER*3/SPLIT/SUCC HDR-PHONE (8) → fork #275·#276 · `LG-1~3` (3) → fork #276 · `SELL-TAB-LABEL · SELL-PRODUCT-SHEET-IMG` (2) → fork #275 |
| 미구현 | 2 | `POS-SUCC-PHONEENTRY` · `ORDER-PHONE-ENTRY` (둘 다 V4-7 Kyu 11-26 15:53 확정) |
| 충돌/미결 | 7 | 세 명세서 Section 4 unique 항목(아래) |

불일치 15 = 2 pure + 13 진행 중. 계는 36 + 15 + 2 = 53 ✓

## 충돌·미결 7건 (Kyu 질문 후보 — 본 판에서 답 안 쓰기)

1. **`SUCC-LINK-CUSTOMER` 조건부 숨김 vs 11-18 입구 B(PIN) 승인** — `queue/m3/M3-1126-D.md:POS-5` 가 `customer_flow.state ∈ {entering, first_visit, confirming, confirmed}` 이면 `null` 반환. 11-18 승인(`decision-cd-ask-phone-20261118.md:5`)은 "항상 있음 + PIN". Re-enter(V4-8 PIN 없음)와 공존인가 대체인가. (M2-1126-J 감사 발견 1)
2. **계약서 v1.3 §5 축약(4상태) vs Kyu 11-24 승인(6상태+버튼 3종)** — relay `plans/cd-sync-contract-20261125.md` 를 폐기(storeport v1.4 를 single source) 할지 vs 갱신할지.
3. **긴 Order 번호 채번 체계 미결** — `decision-pos-ui-approval-20261124.md:14` "오케 조사 후 Kyu 결정". 현재까지 Kyu 명시 결정 없음.
4. **`CD-STATE-FROM-SNAPSHOT` 구조 위험** — M2-1126-J 감사 발견 2 — 서버 `deriveCustomerFlow` 한 줄 변경이 POS UI 를 조용히 바꾸는 구조. production 입력 조건 통합 test 1개로 차단 가능성.
5. **`CD-RECEIPT-FORMAT` V3-2** — CD 영수증 머리 "Store"만 노출. 매장 이름·로고·주소·캐셔 미주입. storeport#454 뒤 M0-1126-F.
6. **PB1 세율 11% vs 10%** — `decision-cd-pos-sync-design-20261125.md:21` "앱 라벨 11% · 금액은 10% (120,000 → 12,000) — Kyu 확인 요청" · 현재까지 결정 없음.
7. **V4-1 lingering previous order snapshot** — Next customer 후 과거 주문 재등장. storeport#454 (M0-1126-G) 머지 뒤.

## 승인 원형 ↔ 계약서 ↔ 구현 3자 대조 (핵심 사례)

**`POS-HDR-PHONE` 우측 상단 손님 번호 상태 칸:**
- Kyu 2026-11-24 11:03 승인: 6상태 + Ask/Re-enter/Ask again 버튼 3종(`decision-pos-ui-approval-20261124.md:6`)
- Kyu 2026-11-26 15:53 재확정 V4-8: "상시로 띄워서" 복구 재요청(`decision-cd-pos-sync-v4-20261126.md:14`)
- relay 계약서 v1.3 §5: **4상태 chip 만** · 버튼 3종 미반영 → 축약 꼬리표
- storeport 계약서 v1.4 §1: 6상태 + `actions: ('ask'|'reenter'|'ask_again')[]` + `locked` 복구 → 승인 원형과 1:1
- fork 현 구현(`CustomerPhoneStatus.tsx:72`): `if (customerFlow !== null) return <CustomerFlowChip .../>` early-return → 6상태 분기(85-185) dead code · `CustomerFlowChip`(224-309) 은 실시간 숫자만 복구, 버튼 3종 미복구
- 복구 라운드: fork #275·#276 (M3-1126-K/H/I) · storeport #457·#458 (M0-1126-I)

명세서는 **승인 원형 6상태**를 정본으로 기록(= 계약서 축약 꼬리표 · storeport v1.4 와 일치).

## 다음 라운드 (스코프 밖)

- 보존 테스트 e2e 추가 — 특히 `POS-HDR-PHONE` production 입력 조건 통합 test(= M2-1126-J 감사 경로 2 차단).
- 충돌 1·2 Kyu 결정 반영 명세서 갱신.
- V4-7(ORDER-PHONE-ENTRY · POS-SUCC-PHONEENTRY) 구현 PR 착지 후 명세서 갱신.
- Admin · Inventory · Sales 리포트 · Refund 흐름 명세서 추가.

## 비고

- 코드 수정 없음.
- 모든 요소 출처 파일:줄 포함 (일부 `storeport v1.4` 참조는 섹션·라인 범위).
- 진행 중 PR(fork #275·#276 · storeport #457·#458) 는 "진행 중 PR#" 표기만 · 승인 원형만 적음.
- 이 리포트는 러너 외부 경로(`~/.hub-runner/reports/m1/M1-1126-P/report.md`) 에만 저장됨 · git 리포 내 저장·커밋·push 없음.
