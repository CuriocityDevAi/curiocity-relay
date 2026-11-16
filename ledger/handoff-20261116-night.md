# handoff 2026-11-16 밤 (20:52 WIB 갱신 · 오케)

새 세션 첫 줄: "CurioCity 오케. relay ledger/handoff-20261116-night.md 읽고 현황판부터."

## 상태 (20:52)
- 감시 꺼짐(Kyu 20:15 이후 무응답 30분). 진행 중 허브: **M3-1116-S**(짝짓기를 계산대 단위로 + 새 브라우저가 /pair 로 안 가는 버그) · **M2-1116-V**(fork #158 새 상품 연타 시 줄 중복). 착지하면 R0 리뷰 → 머지.
- 머지 대기: storeport #316(M1-1116-V 테스트 전용 · 돈 로직 변경 없음) — ci ✅ 면 머지.
- 머지 규칙: R0 APPROVE + ci-summary pos-integration ✅ (docker-smoke 기존 불량 제외) · storeport squash 만 · 리뷰 스레드 미해결 405 → 작성 허브 resolve · fork CI 는 허브 리포트로 판정.
- 운영 = 최신(ffc2c14 · #314) · Railway 배포 전부 success(M0-1116-P 확인).
- Kyu 폴더: 손님 화면 `~/projects/kyu-display` · POS `~/projects/agilo-fork-test` · 허브는 사용 금지(프롬프트에 명시 중).

## 오늘 저녁 판명
- 손님 화면 무반응 원인 = 짝짓기가 **register_session** 에 묶임 → POS 가 세션 새로 열면 엇갈림(M3-1116-R). 오케 결정: 계산대(register) 단위로 바꿈(M3-1116-S). 머지 후 Kyu 재짝짓기 1회.
- 새 시크릿 창에서도 6자리 안 물어봄 = 버그(M3-1116-S ① 에서 수정).
- 세금 포함 적립 원인 = 코드 아님 · **earn_base 미저장**(오케가 시뮬 버그 때 Save 보류시킴). 4 경로 모두 previewReceipt 경유 확인. Kyu 가 Simulate → Earn base "Paid pre-tax" → AFTER 1,000 확인 → Save → Apply now 하면 해결(20:39 안내, 결과 미수신).
- Add to cart 빈 화면 깜빡임 → 낙관적 표시(fork #158) · 오케 결정: 기다리게 되돌리지 않음. 연타 중복 줄 블로커 수정 중.
- 머지(저녁): fork #157(POS 손님 화면 뱃지 조회 키 · M3-1116-S 후 키 재검토 필요 — R0 메모).

## 오늘 머지 전체
storeport: #303 #300 #302 #301 #305 #306 #309 #310 #307 #311 #312 #308 #315 #313 #314 · fork: #154 #155 #156 #157

## Kyu 결정(오늘)
적립 = 세금 빼고 · Loyalty 카드 위치 그대로 · Store Credits 메뉴 숨김 · 앱 이름 "MEROS HP Point"(노란 계열) · 손님 iPad 매장별 1대 · dev client → TestFlight+OTA · 숫자 전용 칸 = 숫자패드(상시) · 숫자 칸 화살표 제거(오케)

## Kyu 실기 대기(순서)
1. 세금 제외 기준 저장(위) → 다음 주문 90,000 → 900 확인
2. POS 숫자패드(fork #155) — agilo-fork-test dev-refresh → Link customer
3. (M3-1116-S 머지 후) 손님 화면 재짝짓기 1회 → POS 계산대 닫았다 열기 → Checkout 진입 즉시 품목·금액·적립 예고 → 결제 → 영수증·번호 입력 유지 → 잔액
4. (#158 머지 후) 담기 즉시 Cart 표시 · 연타
5. 손님 화면 앱 재빌드(#308 아이콘·이름) — kyu-display git pull → eas build
6. 보정 스크립트(이름 없는 phone-only 손님) dry-run → Kyu 승인 → apply (운영 DB · 오케/허브 직접 실행 금지)
7. 나눠결제 QRIS 3·4

## 후속 과제
- 주문 metadata 에 당시 적립률·기준 금액 저장(R0 non-blocker)
- 이미 세금 포함으로 쌓인 적립(330·660·990) 정정 여부 — Kyu 결정 필요
- POS 에 "손님 화면 연결 상태" pairing-status 엔드포인트(M3 권장 · 별도)
- runner `last_error: runner-folder change pending Kyu install (m2/M2-1105-BT-report.md)` — Kyu 설치 안내 · 허브가 Kyu 폴더를 쓴 원인 조사
