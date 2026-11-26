# 결제 완료 화면 — 번호 버튼 하나만 (Kyu 2026-11-26 23:07)

원문: "결제 완료 화면에서는 하나만. Ask phone 이라는 버튼이 그 전단계에서도 있던거라면 그냥 그걸남기는게 나아."

## 기존 결정과 충돌 (spec-guard §1 · 오케가 23:05 에 먼저 제기 → Kyu 동의)
- V4-7 (Kyu 15:53): Payment successful 상단 Phone entry 칩 + Order 상세 Link customer 오른쪽 Phone entry 버튼.
- V4-8 (11-24 승인): 결제 전 단계부터 상시 오른쪽 위 번호 상태 칸(Ask phone · Waiting · 입력중 · Done+Re-enter · Skipped+Ask again · locked).
- 실기(23:05): 결제 완료 화면에 Phone entry + Ask phone 이 나란히 떠서 같은 일을 하는 것으로 보임.

## 결정
- Payment successful 화면: **Phone entry 칩 제거**, 오른쪽 위 상태 칸(Ask phone 등)만 남긴다.
- 결제 후 Ask phone / Ask again 은 V4-7 의 서버 판정(`POST /admin/pos/orders/:id/phone-entry`, 7개 사유별 숨김)을 그대로 쓴다 — 기능은 칸 하나로 합치고 서버 규칙은 유지.
- **Order 상세의 Phone entry 버튼은 유지** (결제 완료 화면이 아니므로 이번 결정 범위 밖).

## 반영
- specs/screens/pos-payment-flow.md 의 Payment successful 요소 갱신 (M1 또는 구현 PR 과 함께).
- 구현 = M3 (M3-1126-R 이후 다음 라운드) · 보존 테스트 #277 / M3-1126-K 하네스에서 Phone entry 칩 어설션 → "없음"으로 변경.
