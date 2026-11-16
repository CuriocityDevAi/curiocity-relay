# handoff 2026-11-16 오후 (11:35 WIB · 오케 창 교체)

새 세션 첫 줄: "CurioCity 오케. relay ledger/handoff-20261116-pm.md 읽고 현황판부터."

## 상태
- **감시 꺼짐**(Kyu 11:34 "감시꺼"). 예약 튱 없음. 허브 큐에는 아래 "진행/대기" 것들이 남아 러너가 계속 집음 — 새 오케가 착지 확인·머지.
- 머지 규칙: R0 APPROVE + CI 초록(**PR comments 의 ci-summary 로 pos-integration 확인 후** — 오늘 #291 을 CI 안 보고 머지해 main 빨강 사고). docker-smoke 는 기존 불량(M0-1116-H: 운영 무관) — 판정 제외.
- GitHub Actions: 오전 예산 소진 → Kyu 07:58 예산 상향. 절감 설정 #297(storeport) 머지 · fork #151 미머지(리뷰 필요 여부 확인).
- fork 저장소 CI 결과는 오케가 못 읽음(403) — 허브 리포트로 판정.
- Railway: Root Directory "." + Dockerfile Path apps/commerce-core/Dockerfile (손님 화면 웹 포함).

## 오늘 머지(storeport)
#284 손님화면 운영 이미지 · #285 나눠결제 미완료 API · #286 계획서 · #287 적립 0 수정 · #288 새 Orders 목록 · #289 주문 상세 적립 카드·타임라인·환불 포인트 회수 · #290 손님 화면 설정 draft/apply/revert · #291 Admin 손님 화면 UI · #292 토글 문구 · #293 손님 상세 요약 + registers snapshot API · #294 Admin 스모크 · #295 손님 화면 실서버 연결(페어링·Live·link-phone) · #297 CI 절감 · #298 이벤트 문구·overrides · #299 Orders 전화번호·방문 수 운영 버그
- fork: #147 Payment in progress · #148 add to cart 낙관적·Checkout 한 줄·키보드 · #149 POS 뱃지 · #152 설정 페어링 코드·다음 주문 잠금·409

## 진행/대기(큐에 있음)
- **M3-1116-H** 🔴 손님 화면 /pair 키패드 3열(1-2-3/4-5-6/7-8-9/_-0-⌫) · 6자리 자동 인증 · 마지막 숫자 무반응 버그 · 안내 문구 실제 위치 → R0 → 머지 → Kyu 짝짓기 재실기
- **M2-1116-K** Admin 손님 화면 UI 를 #298 계약에 맞춤(apply/discard/revert 실서버 · preview · message 저장 · conflicts 전부) → R0 → 머지
- **M1-1116-L** 계획서: 손님 화면을 MEROS POS 처럼 Expo 아이패드 앱으로(dev client/TestFlight/웹+홈화면) → Kyu 질문 ≤3

## Kyu 요구(오늘 원문 요지)
- 11:26 "숫자패드 … 123/456/789 식으로" · "6자리만 입력하면 자동으로 인증" · "MEROS 처럼 나는 앱의 형태였으면 하거든. expo 앱. 왜 아직 안만들은거야?" (오케 답: 이미 Expo 코드, 웹 export 만 올림 — 설치 빌드 미진행은 오케 판단 누락)
- 05:52 이벤트 하루 1개 · 상단 문구 편집 · 이벤트 미리보기 / 05:28 설정→미리보기→적용→실시간 (시안 https://claude.ai/artifact/BEj5KNcorG5JhoZ1F7TvV3 Kyu OK)
- 04:58 Orders: 전화번호 칸 · 적립 칸 · 상세 적립 카드 · Activity 마일스톤 · Store Credits 숨김 — 구현·머지됨. 상세 적립 카드 위치는 본문 맨 아래(Medusa 제약 — Kyu 확인 필요)
- 결정: Q1 목록 번호 가림 · Q2 환불 시 자동 회수 · 손님 화면 Admin/POS 연동 질문 10개 전부 권장안 · 실제 아이패드 미리보기 2단계

## Kyu 실기 대기(결과 미수신)
- 아침 묶음 1~6: 앱 갱신(dev-refresh) · add to cart 즉시 · Checkout 한 줄 · Link customer 숫자패드·키보드 · 현금 33,000 → 번호 연결 → 잔액 +330 · 새 Orders(번호 가림·적립) · 토글 문구 · Admin Customer Display 화면
- 아이패드 2대: POS 설정(톱니) › Customer Display › Show pairing code → 손님 iPad Safari `https://admin.meros.id/customer-display-web/` 입력(현재 키패드 버그로 막힘 — M3-1116-H 후) → 결제→손님 화면 번호 입력→POS 적립 표시·다음 주문 잠금 → Admin Orders/상세/손님 → Admin 테마 Apply 실시간 반영
- 나눠결제 QRIS 실기 3·4 (이전 handoff)

## 교훈(오늘)
- 머지 전 ci-summary 확인 필수(#291 사고) · 리뷰 라인 코멘트 미해결 = 405 → 허브가 반영 후 resolve · 돈 테스트는 실제 line_item 주문(빈 주문·숫자 직주입 금지 — 오늘 4회) · Medusa `updateOrders({})` 단일객체 silent-success(배열로) · `query.graph` customer.phone 크로스모듈 미동작 · 허브 60분 초과 시 작업 유실 → "단계마다 커밋 push" · squash 머지 시 위에 쌓인 PR base 깨짐(merge 방식 사용) · 감시 튱은 매 튱 다음 예약 필수(09:20~10:30 미예약으로 허브 1시간 유휴) · "열어볼 수 있다" 전에 실제 동작 확인(손님 화면 mock 모드 오안내)
