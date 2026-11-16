# handoff 2026-11-16 늦은 밤 (22:51 WIB · 오케)

새 세션 첫 줄: "CurioCity 오케. relay ledger/handoff-20261116-late.md 읽고 현황판부터."

## Kyu 지시 (22:51)
- Kyu 취침 · "작업을 요청해두고" → 오케 자율 진행: 착지 → R0 리뷰 → APPROVE+CI 면 머지 → CHANGES 면 수정 발부. Kyu 실기·결정 필요한 건 보류 목록에 쌓아 아침에 한 번에 안내.

## Kyu 결정 (오늘 밤)
- 적립 기준 세금 제외 저장 ✅(실기 정상)
- 이미 세금 포함으로 쌓인 테스트 적립(330/660/990, 초과 +180) = **(a) 그대로** — 테스트 데이터
- 나눠결제 영수증 = **(가)** 1·2차 결제 확인 슬립 + 최종 정식 영수증 1장 (M1-1116-AO)
- 앱 아이콘 = 오케 시안 **A 각진 M** · 손님 화면 왼쪽 노란색 · HP POINT 글자 크게 (M2-1116-AK → AL)
- 현금 결제 키패드 (b) 숨김 기본 ✅ 실기 통과 · 버튼 영어 ✅

## 오늘 밤 머지
storeport #316 · fork #158 #159 #160

## 진행 중 (22:51)
| 허브 | ID | 내용 | 다음 |
|---|---|---|---|
| M0 | AN | QRIS Ref = Xendit `payment_details.receipt_id` 확정 + PR (AH 가 로컬만 두고 끝냄) | R0 리뷰 → 머지 |
| M1 | AO | 나눠결제 결제 확인 슬립 + 영수증 Ref 전체 표시(… 자르기 제거) | R0 리뷰 → 머지 |
| M1 | (#161) | 장바구니 즉시 표시 — AJ 로 master rebase + pendingVariantAdds 복원 | R0-1116-AP 재리뷰 → 머지 → Kyu 재실기 |
| M2 | AL → AQ | 아이콘 A안 적용(PR 2개) → 🔴 Cash+QRIS 환불/Void 가 Card 로 인식(카드 승인번호 요구) + 선택 버튼 높이 | AL 미리보기 Kyu 승인 후 머지(두 앱 EAS 재빌드) · AQ R0 → 머지 → Kyu 재실기 |
| M3 | Z → AM | #317 pos-integration CI 실패 수정 → Checkout Order type 높이 = Pay + 뱃지 겹침 | #317 CI ✅ 면 머지(R0 APPROVE 완료) → Kyu 손님 화면 재페어링·동기화 실기 |

## Kyu 아침 할 일 후보 (머지된 것만)
1. 장바구니 즉시 표시·연타(#161)
2. 손님 화면 동기화(#317 · 재페어링 1회 · 화면 분할로 두 앱)
3. 아이콘 미리보기 승인 → POS·HP Point EAS 재빌드
4. Cash+QRIS 환불·Void 재실기(AQ)
5. QRIS Ref(새 결제) · 나눠결제 슬립(AN·AO)
6. Order type 높이(AM)
7. 백필(이름 없는 phone-only 손님) — 실행 절차 미정(운영 DB) · 오케가 M0 에 runbook 요청 필요
8. QRIS 나눠결제 실기 5~7 (환불 실패·현금 대체·늦은 웹훅)

## 후속 과제
- 허브 cwd 미스매치(M0-1116-Q): Kyu 2단계(전 허브 idle 때) — m2/m3 전용 storeport worktree + runner-config cwd 변경 · 그 전까지 프롬프트에 작업 폴더 명시로 회피 중
- 주문 metadata 에 당시 적립률·기준 저장 · POS pairing-status 엔드포인트
- 공통: 선택 버튼 높이 = 화면 주 버튼 높이 (AM·AQ 에서 상수화)
