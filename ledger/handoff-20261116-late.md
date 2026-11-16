# handoff 2026-11-16 → 17 밤샘 결과 (01:00 WIB 갱신 · 오케)

새 세션 첫 줄: "CurioCity 오케. relay ledger/handoff-20261116-late.md 읽고 현황판부터."

## ⚠ 아침 첫 할 일 (Kyu)
- 맥북 잠자기 억제 해제: 작업 끝나면 `sudo pmset -a disablesleep 0` (어젯밤 23:11 켜둠)

## 밤사이 머지 (전부 R0 APPROVE + storeport 는 ci pos-integration ✅)
- storeport: #316 · **#317**(손님 화면 짝짓기 계산대 단위 + 시크릿창 /pair · 운영 a2d780a9 반영 확인) · **#319**(QRIS 영수증 Ref = Xendit `payment_details.receipt_id`) · **#321**(서버 /refund 가 QRIS 몫 Xendit 환불 · 실패 시 현금도 안 나감 · 운영 eeda3c34 반영 확인)
- fork: #158 #159 #160 · **#161**(장바구니 즉시 표시 · 빈 카트 null-cache 버그) · **#163**(나눠결제 슬립 Payment 1/2 · Ref 전체 표시) · **#165**(Order type 높이 = Pay · 뱃지/톱니 겹침) · **#164**(Cash+QRIS / Card+QRIS 환불 분류 · QRIS 포함 주문 Void 차단 → Refund 안내 · 선택 버튼 높이 공유 상수 BUTTON_PY)

## 머지 보류 (Kyu 필요)
- 아이콘 A안: storeport **#318**(HP Point · 알파 제거 완료) · fork **#162**(POS) — R0 APPROVE. 색 = 손님 화면 토큰 #FFE58A / #3B2A1F. **Kyu 미리보기 OK → 오케 머지 → 두 앱 EAS 재빌드**
- 전화번호 계획서(M0-1116-AS · 문서 PR · 브랜치 `docs/m0-1116-as-phone-identity`) — M0-1116-BB 로 fork 경로 보강 중. **Kyu 결정 Q1~Q4** 후 코딩(R1~R5).

## Kyu 결정 (어젯밤)
- 적립 세금 제외 ✅ · 기존 테스트 초과적립 +180 = (a) 그대로
- 나눠결제 = (가) 슬립 + 최종 영수증 1장 · 아이콘 = A 각진 M
- 현금 키패드 (b) 숨김 ✅ · 버튼 영어 ✅

## 아침 실기 순서 (POS 코드 받기 1회 먼저: `cd ~/projects/agilo-fork-test && git pull && npx expo start --dev-client` → 아이패드 POS Reload)
1. **장바구니 즉시 표시(#161)** — 빈 장바구니에서 상품 탭 → 1초 안에 줄 보이고 "Your cart is empty" 안 뜸 · 두 번째 상품도 즉시 · 같은 상품 5연타 → 줄 1·수량 5.
2. **손님 화면 동기화(#317)** — 같은 아이패드 화면 분할(POS + HP Point). HP Point 가 6자리 코드 화면이면 POS Settings 의 코드로 재짝짓기 1회. POS 에서 Checkout 진입 → 손님 화면에 품목·금액·적립 예고 → 결제 → 영수증·번호 입력 → 잔액. 시크릿 창으로 손님 화면 웹 열면 6자리 코드부터 물어야 정상.
3. **Order type 높이(#165)** — Checkout 의 Takeaway/Pre-order/Delivery 버튼 높이 = 아래 Pay 버튼 · 보조 문구 한 줄 · 오른쪽 위 손님 화면 표시가 톱니에 안 가려짐.
4. **나눠결제 슬립·Ref(#163·#319)** — Split payment QRIS 50,000 → Simulate → "Payment 1 of 2" 슬립(금액·QRIS·거래번호·시각, 합계·세금 없음) + Share 이미지 → 2차 → 최종 화면 [Slip 1][Slip 2] · 영수증 Ref 가 잘리지 않음(Simulate 에선 "Xendit ID" 로 나올 수 있음 — 정상).
5. **Cash+QRIS 환불(#164·#321)** — Cash 50,000 + QRIS 나머지로 결제한 주문 → Orders → Refund 전액 → "Original payment: Cash + QRIS" · 카드 승인번호 칸 없음 · 매니저 PIN 만 → 성공 · 현금 서랍 안내 · QRIS 몫 Pending→Succeeded. 같은 주문 Void → "QRIS orders: use Refund" 안내.
6. **아이콘 미리보기 확인 → 재빌드** — 오케가 PNG 보여줌 → OK 면 머지 → POS·HP Point 각각 `eas build --profile development --platform ios`.
7. **전화번호 계획 결정 Q1~Q4** — Q1 운영 DB 조회(SQL 은 계획서 §7) · Q2 병합 시 이름/이메일 = 비어 있는 쪽 채우기(권장) · Q3 해외 번호 = 당분간 인도네시아만(권장) · Q4 병합 실행 = dry-run 오케, apply 는 Kyu(권장).
8. 백필(이름 없는 phone-only 손님) — 전화번호 R3·R4 와 합칠 예정(별도 실행 안 함).
9. QRIS 나눠결제 실기 5~7(환불 실패·현금 대체·늦은 웹훅) — 서버 R2(refund-retry 확장) 이후.

## 후속 과제
- 허브 cwd 미스매치(M0-1116-Q): Kyu 2단계(전 허브 idle 때) — m2/m3 전용 storeport worktree + runner-config cwd 변경 · 그 전까지 프롬프트에 작업 폴더 명시로 회피 중(밤새 문제 없음)
- 서버 `/refund` 의 S3 순서가 body 순서 의존(R0-AX 비블로커) · preflight 성공 후 workflow 실패 시 보상 없음(로그만)
- 영수증 Print 버튼은 아직 토스트뿐(실제 BLE 프린트 미연결 — 기존 Reprint 도 동일)
- 주문 metadata 에 당시 적립률·기준 저장 · POS pairing-status 엔드포인트
