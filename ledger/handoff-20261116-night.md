# handoff 2026-11-16 밤 (18:45 WIB · 오케)

새 세션 첫 줄: "CurioCity 오케. relay ledger/handoff-20261116-night.md 읽고 현황판부터."

## 상태
- 진행 중 허브 없음(전부 착지·머지). 감시 꺼짐(Kyu 17:44 "2시간 자율" 범위 내 작업 완료).
- 머지 규칙: R0 APPROVE + ci-summary pos-integration ✅ (docker-smoke 기존 불량 · 판정 제외) · storeport 는 **squash 만**(merge 커밋 금지) · 리뷰 스레드 미해결이면 405 → 작성 허브가 resolve · fork CI 는 오케가 못 읽음(403) → 허브 리포트로 판정.
- 허브 주의: 허브가 Kyu 개인 폴더(`~/projects/storeport-kyu`)를 작업 폴더로 쓴 사고(M2-1116-N) → 이후 프롬프트에 "Kyu 개인 폴더(~/projects/storeport-kyu · ~/projects/kyu-display · ~/projects/agilo-fork-test) 사용 금지" 명시 중. 근본 원인 미조사 · runner `last_error: runner-folder change pending Kyu install (m2/M2-1105-BT-report.md)` 와 관련 의심 — Kyu 에게 설치 절차 안내 필요.
- Kyu 폴더: 손님 화면 = `~/projects/kyu-display`(main) · POS = `~/projects/agilo-fork-test`.

## 오늘 오후~밤 머지
storeport: #303 main 빨강 · #300 Admin 손님 화면 설정 · #302 설치형 Expo 앱 · #301 /pair 3열·6자리 자동 · #305 EAS projectId · #306 Store Credits 숨김(선택자 오류) · #309 dev 8082 · #310 네이티브 API base · #307 결제 후 번호 연결 잔액·손님 이름 · #311 적립률 표시·메뉴 숨김 /app 접두사 · #312 dev-refresh Expo 자동 변경 무시 · #308 앱 이름 MEROS HP Point·황금 아이콘 · #315 earn_base 세전 분기(돈 로직)·숫자 칸·30일 영향 · #313 손님 화면 적립 예고(서버 계산) · #314 Checkout 진입 시 snapshot·paid 가드·연결 점
fork: #154 Checkout 즉시·동의 체크 시트 · #155 숫자패드 7곳 · #156 Checkout 진입 startSnapshot/cleanup

## Kyu 결정(오늘)
- 적립 기준 = **세금 빼고**(세전 × 1%) · Loyalty 카드 위치 = 그대로(본문 아래) · Store Credits 메뉴 숨김 · 손님 화면 앱 이름 "MEROS HP Point"(노란 계열) · 손님 iPad 매장별 1대 · dev client → TestFlight+OTA 2단계
- 숫자 전용 칸 = 숫자패드 기본(오케 판단으로 상시 적용)
- 숫자 칸 화살표 = 제거(오케 결정 · Kyu 의견 요청에 답)

## Kyu 실기 대기(순서)
1. POS 숫자패드: agilo-fork-test 에서 dev-refresh → :8081 → Link customer 전화번호 칸 = 숫자패드 · 동의 체크 시트 고정
2. Checkout → 손님 화면: 맥북 크롬 손님 화면(또는 HP Point 앱) 짝짓기 → POS 담기 → Checkout 진입 즉시 품목·금액·적립 예고 → 결제 → 영수증·번호 입력 유지 → 잔액(적립 후) 표시
3. 세금 빼고 적립: Admin POS Settings › Loyalty › Simulate → Earn base "Paid pre-tax" → Normal purchase AFTER 1,000 확인 → Save → Apply now(사유 기록)
4. 손님 화면 앱 재빌드: kyu-display git pull → `eas build --profile development --platform ios` → 새 아이콘·이름 확인
5. 보정 스크립트(이름 없는 phone-only 손님 first_name 채우기) dry-run → Kyu 승인 후 apply — 운영 DB 라 오케/허브가 직접 실행 금지, 방법은 #307 PR 본문
6. 나눠결제 QRIS 실기 3·4 (이전 handoff)

## 후속 과제(기록)
- 주문 metadata 에 당시 적립률·기준 금액 저장(과거 주문 표시 정확도) — R0 non-blocker
- runner-folder 설치 건(M2-1105-BT) Kyu 안내
- 허브가 Kyu 폴더를 쓴 원인 조사
