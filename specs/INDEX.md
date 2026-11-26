# specs — 주제 색인

**오케 읽는 순서**: Kyu 에게 뭔가 묻기 전에 반드시 이 색인부터. 해당 주제의 정본 파일을 먼저 읽고(= "이미 정해져 있나") → 없으면 `ledger/decision-*` 검색 → 그래도 없으면 질문.

## 도메인 규칙 (주제별 · 정본)

| 주제 키워드 | 정본 파일 | 요약 |
|---|---|---|
| 주문번호 · 채번 · 긴 번호 · 매장 닉네임 · 시작번호 | [domain/order-number.md](./domain/order-number.md) | 긴 번호 `PIM-26B1001` (11-24 + 11-25 하이픈) · 짧은 칩 `#N` 매장별 1~99(진행 중 M0-1126-Q) · 영수증 하단 R-… |
| 짧은 번호 · 칩 번호 · `#N` · `pos_order_num` · Square | [domain/order-number.md § 2](./domain/order-number.md) | 매장별 1→99→1 순환 (진행 중 M0-1126-Q) ⚠ Kyu 확인 대기(초기화 타이밍) — domain/order-number.md §2.2 |
| 포인트 · 적립 · 회수 · 로열티 · store credit · 적립금 | [domain/loyalty-points.md](./domain/loyalty-points.md) | paid ∧ confirmed · 주문당 1회 · 환불 자동 회수 · Re-enter A→B 이동 |
| Re-enter · 번호 교체 · A→B | [domain/loyalty-points.md § 3](./domain/loyalty-points.md) | A 회수 + B 적립 · 한 트랜잭션 · 멱등 · 취소/건너뜀 시 A 그대로 |
| Link customer · 나중 연결 · 매니저 PIN | [domain/loyalty-points.md § 5](./domain/loyalty-points.md) | 입구 A(PIN 없음 · 결제완료) vs 입구 B(PIN 필수 · 주문 상세) · 서버 기록 → Admin 조회 |
| PB1 · 세금 · 세율 · PBJT · PPN | [domain/tax-pb1.md](./domain/tax-pb1.md) | 10% 고정(11-26) · 값 없으면 세금 줄 전체 숨김 · 과세표준 = store credit 차감 전 total |
| 손님 번호 상태 칸 · 6상태 · phone status chip | [screens/pos-payment-flow.md § POS-HDR-PHONE](./screens/pos-payment-flow.md) | 7화면 공용 · ① Ask · ② Waiting · ③ Typing · ④ Done+Re-enter · ⑤ Skipped+Ask again · ⑥ Busy |
| Phone entry · 결제완료 번호 입력 · V4-7 | [screens/pos-order-detail.md ORDER-PHONE-ENTRY](./screens/pos-order-detail.md) · [screens/pos-payment-flow.md POS-SUCC-PHONEENTRY](./screens/pos-payment-flow.md) | Link customer 오른쪽 · PIN 없음 · 조건 4가지 · `POST /admin/pos/orders/:id/phone-entry` |
| 영수증 · POS = 손님 화면 영수증 · 영수증 번호 | [screens/customer-display.md CD-RECEIPT-FORMAT](./screens/customer-display.md) · [domain/order-number.md § 3](./domain/order-number.md) | POS 영수증과 **같은 데이터** · 영수증 하단 번호 = 긴 주문번호 |
| 검게 안 보이는 Sell 탭 · 상품 사진 fit | [screens/pos-payment-flow.md SELL-TAB-LABEL · SELL-PRODUCT-SHEET-IMG](./screens/pos-payment-flow.md) | 11-26 V4 · 복구 완료 (`fork` #274) |
| 로그인 화면 로고 · 톱니 · Email 입력 | [screens/pos-payment-flow.md LG-1·LG-2·LG-3](./screens/pos-payment-flow.md) | 11-26 Kyu · 복구 완료 (`fork` #271) |

## 화면 명세서 (정본)

| 파일 | 범위 |
|---|---|
| [screens/pos-payment-flow.md](./screens/pos-payment-flow.md) | POS 로그인 · Sell · Cart · Checkout · Cash/Card/QRIS · 나눠결제 · Payment successful + 공용 `POS-HDR-PHONE` |
| [screens/pos-order-detail.md](./screens/pos-order-detail.md) | POS Orders → 주문 상세 (결제 완료 뒤 Link customer · V4-7 Phone entry) |
| [screens/customer-display.md](./screens/customer-display.md) | 손님 화면(CD) 대기 · Order list · QRIS QR · 키패드 · First visit · Confirm · Earned · Failed · Skipped · Payment complete · 영수증 full/mini · 좌측 패널 |
| [screens/README.md](./screens/README.md) | 화면 명세서 작성 규약 (ID 체계 · 갱신 절차 · 보존 테스트) |

## 결정 기록 (날짜별)

- `ledger/decision-*.md` 는 **언제 누가 무엇을 정했나** 의 기록. 현재 정답은 여기 `specs/` 로. 양방향 꼬리표:
  - 결정 파일의 "미결" 줄 끝에 `→ 해결: <파일>` (내용 수정 금지 · 꼬리표만).
  - specs 각 규칙 줄에 `(ledger/decision-...:줄)` 출처 링크.

## 발부 전 체크

1. 이 INDEX 에서 주제 키워드 찾기.
2. 찾은 정본 파일을 **읽기** (요약만 보지 말고 § 1·2 규칙까지).
3. 새 요청이 명세와 **부딪히면** → Kyu 에게 "기존 `<ID>` 와 충돌 — 바꿀까/유지할까".
4. Kyu 답 뒤 → `ledger/` 에 새 결정 파일 + 옛 파일에 `→ 해결/갱신` 꼬리표 + 이 색인·정본 파일 갱신 → 그 다음 프롬프트 발부.
