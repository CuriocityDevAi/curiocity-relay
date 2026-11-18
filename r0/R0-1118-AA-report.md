#381 CHANGES · QRIS 큰 QR X · 키패드 위 요약 X · 뒤로=카트 유지 O · 비회귀 O

## 판정: CHANGES (머지 블로커 2건)

---

## 실행 결과

| 항목 | 결과 |
|------|------|
| typecheck (customer-display) | **에러 0** |
| unit 테스트 | **195/195 pass** (11 files) |
| responsive e2e (Playwright) | **27/27 pass** (landscape·portrait·split × main·keypad·cart × en·id·ko) |

---

## CHANGES (머지 블로커)

### C-1: `payment_qris` → 큰 QR + 금액 2줄 **없음 (X)**

**현상**: `posScreenToDisplay("payment_qris")` → `"cart"` → 일반 `CartScreen` 표시.
QR 코드 없음. 장바구니 목록 + 합계만 보임 (첨부 스크린샷: cart-landscape-en.png).

**PR 설명에서 명시적으로 미룬 항목**:
> ③ QRIS 레이아웃: `payment_qris` → cart 라우팅(큰 QR + 금액 2줄 UI 디자인은 R2 POS 쪽 QR 페이로드 수신 후 CartScreen 변형)

**Kyu 원문 (11-18 16:41)**: "QRIS = 큰 QR + 금액, 장바구니는 아래 작게" — 미충족.

**필요한 작업**:
- `CartScreen`에 `pos_screen === "payment_qris"` 분기 추가 (또는 `QrisScreen` 별도)
- 큰 QR 이미지 영역(QR 페이로드는 snapshot에 추가 필요) + 금액 2줄(결제 금액 크게, 주문명 작게)
- 장바구니는 하단에 작게(fold 처리)
- R2 POS QR 페이로드 미수신 시 fallback: 금액 + "QRIS 결제 중" 안내

---

### C-2: `loyalty_entry` → 키패드 위 주문 요약 **없음 (X)**

**현상**: `KeypadScreen`에 `snapshot` prop 없음. 현재 화면 = 스토어명 + "Enter your phone number to earn points" + 적립 금액 + 번호 입력 (첨부 스크린샷: keypad-landscape-en.png, keypad-portrait-en.png).

주문번호·품목 수·합계가 어디에도 표시되지 않음.

**Kyu 원문 (11-18 16:58)**: "번호 요청 키패드 위에 주문 요약 고정" (주문번호·품목 수·합계) — 미충족.

**필요한 작업**:
- `index.tsx` LiveIndexRoute: `KeypadScreen`에 `snapshot` prop 추가 (현재 호출부: `snapshot` 미전달)
- `KeypadScreen` props에 `snapshot?: OrderSnapshot | null` 추가
- wide(landscape): left panel 상단에 주문 요약 카드(주문번호 `#XXXX` · 품목 수 N개 · 합계 Rp X)
- non-wide(portrait): 정보 섹션 최상단에 주문 요약 1줄 (컴팩트형)

---

## OK 항목 (머지 비블로커)

| REQ | 항목 | 결과 |
|-----|------|------|
| REQ-2 | `cart_review` → cart 유지 (대기로 안 감) | ✅ `posScreenToDisplay("cart_review") = "cart"` + 시나리오 B 테스트 통과 |
| REQ-2 | `idle` → 즉시 main · 이전 손님 정보 없음 | ✅ 터미널 흐름 중 `idle` 수신 시 `stay("main")` 조기 반환 |
| REQ-3 | seq 역행 무시 | ✅ seq rewind guard 구현 + 3케이스 테스트 |
| REQ-3 | `pos_screen` 없는 구버전 fallback | ✅ `snapshot?.pos_screen` 존재 시에만 신 로직 진입 + 2케이스 테스트 |
| REQ-3 | 결제 후 영수증·적립 흐름 비회귀 (Rule E) | ✅ `newCheckoutStatus \|\| newCheckoutPos` 조합으로 기존 동작 보존 |
| REQ-4 | 끼어들기: keypad 중 다른 화면 → 전환 | ✅ `leavingLoyalty=true` 경로에서 target으로 전환 |
| REQ-4 | 다시 `loyalty_entry` 오면 입력값 비어 있음 | ✅ screen 전환 → unmount 후 remount → `useState("")` 초기화 |

---

## 사소한 사항 (본문에만 · 머지 블로커 아님)

- `display-machine.ts:L218` `posScreenCart` 인라인 switch 중복: `posScreenToDisplay` 함수를 재사용하면 단순화 가능.
- `display-sync-scenarios.test.ts` `POLL_MS = 1000` 상수 — `LiveSnapshotSource.pollIntervalMs` 에서 가져오면 의존성 단절 방지.

---

## 스크린샷

첨부 (Playwright responsive 실행 결과):
- `keypad-landscape-en.png`: 주문 요약 없음 확인
- `keypad-portrait-en.png`: 주문 요약 없음 확인 (세로)
- `cart-landscape-en.png`: payment_qris = 일반 cart 화면 (QR 없음) 확인
- `cart-portrait-en.png`: payment_qris = 일반 cart 화면 (QR 없음, 세로) 확인

---

*R0-1118-AA · 2026-11-18*
