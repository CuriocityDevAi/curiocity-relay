# handoff 2026-11-16 → 17 밤샘 결과 (01:00 WIB 최종 · 오케 · 감시 종료)

새 세션 첫 줄: "CurioCity 오케. relay ledger/handoff-20261116-late.md 읽고 현황판부터."

## ⚠ 아침 첫 할 일 (Kyu)
- 맥북 잠자기 억제 해제: 작업 끝나면 `sudo pmset -a disablesleep 0` (어젯밤 23:11 켜둠)

## 밤사이 머지 (전부 R0 APPROVE + storeport 는 ci pos-integration ✅)
- storeport: #316 · **#317**(손님 화면 짝짓기 계산대 단위 + 시크릿창 /pair · 운영 a2d780a9 반영 확인) · **#319**(QRIS 영수증 Ref = Xendit `payment_details.receipt_id`) · **#321**(서버 /refund 가 QRIS 몫 Xendit 환불 · 실패 시 현금도 안 나감 · 운영 eeda3c34 반영 확인)
- fork: #158 #159 #160 · **#161**(장바구니 즉시 표시) · **#163**(나눠결제 슬립 · Ref 전체) · **#165**(Order type 높이 · 뱃지 겹침) · **#164**(Cash+QRIS / Card+QRIS 환불 분류 · QRIS 포함 Void 차단 · BUTTON_PY)

## 허브 큐: 전부 비어 있음 (01:00) · 남은 건 Kyu 몫뿐

## 머지 보류 (Kyu 필요)
- 아이콘 A안: storeport **#318**(HP Point · 알파 제거) · fork **#162**(POS) — R0 APPROVE. 색 #FFE58A / #3B2A1F(손님 화면 토큰). Kyu 미리보기 OK → 오케 머지 → 두 앱 EAS 재빌드.
- 전화번호 계획서 storeport **#320**(docs · M0-1116-AS + BB). 원인: 쓰기/검색 경로 일부가 정규화 함수를 안 거침. **매장 POS(fork) 기준 정규화 안 되는 곳 3개** = 손님 직접 생성 화면(customer-lookup "Add new customer" → Medusa core 직행 · W9) · 손님 검색(S7) · Orders 탭 검색(S8). "Kyu Lee · psychica@… · Nov 4" 레코드 = W9 로 생긴 것으로 추정. Kyu Q1~Q4 결정 후 R1~R5 코딩(서버 M0 · fork M1/M3).

## Kyu 결정 (어젯밤)
- 적립 세금 제외 ✅ · 기존 테스트 초과적립 +180 = (a) 그대로
- 나눠결제 = (가) 슬립 + 최종 영수증 1장 · 아이콘 = A 각진 M
- 현금 키패드 (b) 숨김 ✅ · 버튼 영어 ✅

## 아침 실기 순서 (POS 코드 받기 1회 먼저: `cd ~/projects/agilo-fork-test && git pull && npx expo start --dev-client` → 아이패드 POS Reload)
1. **장바구니 즉시 표시(#161)** — 빈 장바구니에서 상품 탭 → 1초 안에 줄 · "Your cart is empty" 안 뜸 · 두 번째 상품도 즉시 · 같은 상품 5연타 → 줄 1·수량 5.
2. **손님 화면 동기화(#317)** — 같은 아이패드 화면 분할(POS + HP Point). HP Point 가 6자리 코드 화면이면 POS Settings 코드로 재짝짓기 1회. Checkout 진입 → 손님 화면 품목·금액·적립 예고 → 결제 → 영수증·번호 입력 → 잔액. 시크릿 창 손님 화면 웹은 6자리 코드부터 물어야 정상.
3. **Order type 높이(#165)** — Takeaway/Pre-order/Delivery 높이 = Pay 버튼 · 보조 문구 한 줄 · 오른쪽 위 손님 화면 표시가 톱니에 안 가려짐.
4. **나눠결제 슬립·Ref(#163·#319)** — Split QRIS 50,000 → Simulate → "Payment 1 of 2" 슬립(합계·세금 없음) + Share 이미지 → 2차 → 최종 화면 [Slip 1][Slip 2] · 영수증 Ref 안 잘림(Simulate 에선 "Xendit ID" 표시 정상).
5. **Cash+QRIS 환불(#164·#321)** — Cash 50,000 + QRIS 나머지 주문 → Orders → Refund 전액 → "Cash + QRIS" · 승인번호 칸 없음 · PIN 만 → 성공 · 서랍 안내 · QRIS Pending→Succeeded. 같은 주문 Void → "QRIS orders: use Refund".
6. **아이콘 미리보기 → 재빌드** — 오케가 PNG 보여줌 → OK 면 머지 → POS·HP Point 각각 `eas build --profile development --platform ios`.
7. **전화번호 계획 Q1~Q4** — Q1 운영 DB 조회(SQL = #320 §7) · Q2 병합 시 비어 있는 쪽 채우기(권장) · Q3 당분간 인도네시아 번호만(권장) · Q4 dry-run 오케 / apply Kyu(권장).
8. 백필(이름 없는 phone-only 손님) — 전화번호 R3·R4 에 합침.
9. QRIS 나눠결제 실기 5~7 — 서버 refund-retry 확장(R2) 이후.

## 후속 과제
- 허브 cwd 미스매치(M0-1116-Q): Kyu 2단계(전 허브 idle 때 — **지금이 적기**) · m2/m3 전용 storeport worktree + runner-config cwd 변경
- 서버 /refund S3 순서 body 의존 · preflight 후 workflow 실패 보상 없음(로그만) — 비블로커
- 영수증 Print 버튼 = 토스트뿐(BLE 프린트 미연결 · 기존 Reprint 동일)
- 주문 metadata 에 당시 적립률·기준 저장 · POS pairing-status 엔드포인트
