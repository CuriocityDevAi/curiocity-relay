PR #338 · 공용 OK 3 / 조건부 10 / POS 전용 3 · 1차 확인 참 4/5 (조건부 참 1/5) · 정리 라운드 6

## 감사 결과 요약

### 기능 지도 (§1)

| 판정 | 기능 도메인 |
|---|---|
| 공용 OK (3) | 재고/예약, 포인트 적립, 포인트 회수/빚, 영수증 |
| 조건부 (10) | QRIS결제·Xendit웹훅, 환불·Void·Return·출고/픽업, 손님·주문목록, 픽업슬롯/Pre-order, 알림(WA) |
| POS 전용 (3) | 현금결제, EDC, 나눠결제 |

### 오케 1차 확인 (§2)

| # | 판정 | 핵심 근거 |
|---|---|---|
| ① 로직이 라우트 안에 직접 | **참** | refund:758줄 · void:828줄 · return:1170줄 · fulfill:890줄 · workflows/ 비어 있음 |
| ② Xendit 웹훅 POS 전용 | **참** | `findSessionByXenditRefs` → draft order만 · Wing cart 완료 분기 없음 |
| ③ CA → `/admin/pos/customers/:id/loyalty-info` | **조건부 참** | 경로 오기(실제는 orders 하위) · CA는 아직 hello-world |
| ④ 재고 보정 POS 라우트에만 | **참** | `adjustInventory` · `deleteReservationItems` return/route.ts 직접 호출 |
| ⑤ pickup_slot 스텁·Pre-order 미연결 | **참** | service.ts:17줄 스텁 · fork 앱 pickup 코드 없음 |

### 계획서 정정 (§3)
1. "웹훅 수정 없음" → Wing Xendit 도입 시 cart 완료 분기 추가 필수 (틀림)
2. CareAgent loyalty-info 경로 오기 (`/customers/` → 실제 `/orders/` 하위)
3. "포인트 모듈 없음" → loyalty_settings·loyalty_negative 이미 구현됨 (구식)

### 공통 정리 계획 (§4)
- W1 returnOrderWorkflow (45분) → W2 refundPayment (30분) → W3 voidOrder (30분) → W4 fulfillOrder (30분) → W5 Xendit 웹훅 분기 (45분) → W6 고객 엔드포인트 (20분)
- 순서 제약: W2 완료 후 S4~S8 loyalty refund 작업 (동일 파일 충돌 방지)

### Kyu 결정 (§5)
- D1: Wing 전에 W1~W4 먼저 할지 / 병행할지
- D2: W5(Xendit 웹훅 분기) 타이밍 — Wing Xendit 도입 직전 vs W1~W4와 함께

## 파일
- `docs/plans/shared-commerce-audit.md` (storeport PR #338)
