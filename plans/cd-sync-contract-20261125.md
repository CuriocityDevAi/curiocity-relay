# 계약서: 손님화면(CD) ↔ POS 동기화 — v1.3 (2026-11-26 · 오케)

정본 흐름: `ledger/decision-cd-pos-sync-flow-20261125.md` · 디자인: `ledger/decision-cd-pos-sync-design-20261125.md` · 캔버스 https://claude.ai/artifact/VFoyrbxnvgB7akmS3xHvVW

**이 문서가 세 PR(서버 M0 · CD M1 · POS M3)의 단일 계약.** 필드·값 이름을 바꾸려면 PR 본문에 사유를 쓰고 이 파일 개정을 오케에게 요청(임의 변경 금지). 오늘 #438↔#263 처럼 서로 다르게 가정하는 일을 막기 위함.

개정 이력:
- v1.1 (19:00) — `source` 는 `state === 'none'` 일 때 `null` 허용(R0-1125-AH 지적).
- v1.2 (19:45) — POS body 에 **`stock_location_id` 필수**(서버가 그 매장의 활성 CD snapshot 을 찾는 키 · M0-1125-T) · 응답 reason 에 `no_active_snapshot` 추가 · `register_mismatch`(403) 는 다른 매장 접근 차단용.
- v1.3 (2026-11-26 · M0-1126-E · R0-1126-L) — `entering` 중 `customer_flow.phone` = 손님이 지금까지 누른 숫자(`phone_partial`). POS fork #270(머지됨)이 이 필드를 chip 에 실시간 표시(POS-2).

## 1. 두 갈래 상태 (CD snapshot 에 실림)
```ts
type PaymentPhase = 'building' | 'tendering' | 'paid' | 'failed' | 'cancelled';
// building = Sell/Cart/Checkout · tendering = 결제수단 화면(Cash/Card/QRIS, 나눠 결제 중 포함)

type CustomerFlowState =
  | 'none' | 'entering' | 'first_visit' | 'confirming' | 'confirmed' | 'skipped' | 'unconfirmed';

interface CustomerFlow {
  state: CustomerFlowState;
  phone: string | null;          // 숫자만. entering/first_visit/confirming 동안만 전체, 그 외 null
  phone_masked: string | null;   // 예 "0813-••••-42480"
  is_first_visit: boolean;
  points_balance: number | null; // 현재 적립금(IDR, 정수)
  points_to_earn: number | null; // 이번 주문 적립 예정
  points_earned: number | null;  // 실제 적립 완료 시에만 값, 그 외 null
  source: 'cd' | 'pos' | null;   // state === 'none' 일 때만 null
  updated_at: string;
}

interface CdSnapshot {             // 기존 snapshot 에 필드 추가 (기존 필드 유지)
  payment_phase: PaymentPhase;
  customer_flow: CustomerFlow;
  tender?: { method: 'cash' | 'card' | 'qris'; paid_so_far: number; remaining: number; qr_string?: string | null };
  receipt?: Receipt;               // POS 영수증과 동일 데이터 (금액 필드 total)
}
```

## 2. 행동
| 호출자 | 행동 | 허용 상태 → 결과 |
|---|---|---|
| CD | `start_entry` | none/skipped → entering |
| CD | `submit_phone {phone}` | entering → first_visit(새 번호) / confirming(기존 번호) |
| CD | `continue_first_visit` | first_visit → confirming |
| CD | `change_number` | first_visit/confirming → entering |
| CD | `confirm` | confirming → confirmed |
| CD | `skip` | entering → skipped (none 에서는 거부) |
| CD | `confirm_timeout` | confirming → unconfirmed |
| POS | `link_phone {phone}` | 아무 상태 → confirming (source pos) |
| POS | `reset` | 아무 상태 → none |

엔드포인트·body:
- CD: `POST /customer-display/customer-flow` (디바이스 토큰) · body `{ action, phone? }` — 서버가 디바이스의 매장으로 활성 snapshot 조회.
- POS: `POST /admin/pos/customer-flow` (POS 인증) · body **`{ action, phone?, stock_location_id }`** (v1.2 필수) · `register_session_id`·`snapshot_id` 는 선택.

응답(전부 상태 코드 200, `ok` 로 분기):
- `{ ok: true, customer_flow, ... }`
- `{ ok: false, reason: 'invalid_transition', customer_flow }`
- `{ ok: false, reason: 'no_active_snapshot', customer_flow: null }` (v1.2 · 그 매장에 연결된 손님화면 주문이 없음 → POS 는 "Customer display not connected" 안내, 실패 처리)
- 예외: 인증 실패 401 · 다른 매장 접근 403 `register_mismatch` · 잘못된 action 400 — 이건 버그/보안 경로라 상태 코드 그대로.

## 3. 포인트 적립 규칙 (서버 단독 · 멱등)
- 적립 = `payment_phase === 'paid'` AND `customer_flow.state === 'confirmed'`. 나중 이벤트에서 1회(멱등 키 = order_id). 적립 시 `points_earned` 채움.
- `unconfirmed`/`skipped`/`none` 으로 결제 완료 → 적립 없음. POS 칩 "Not confirmed · Link customer".
- `confirmed` 인데 결제 `failed/cancelled` → 적립 없음, CD "Payment was not completed".
- customer_flow_state 가 없는 기존 주문(옛 경로)은 기존 적립 동작 유지.

## 4. CD 화면 선택 (모든 경우 좌 1/3 + 우 2/3, Kyu 18:00)
- 우 2/3 = customer_flow (entering 키패드 · first_visit 첫 방문 · confirming 확인 · confirmed: 결제 전 "Points will be added once payment is done" / paid Points earned / failed·cancelled Payment was not completed)
- 좌 1/3 = payment (tendering 화면명 · QRIS 면 QR+금액 · 나눠 결제 Remaining · paid 영수증 인쇄)
- none + paid → 영수증 전체 → 인쇄 끝 3초 → 좌 1/3 로 밀리고 키패드(start_entry 서버 호출)
- none + building/tendering → ① 주문내역(크게) · tendering 에서만 [Enter phone number] 활성
- 20초 무입력 → skip · 20초 무응답 → confirm_timeout · 이후 처음 화면(다음 주문 또는 POS reset)
- 문구 영어 기본 · 영수증 POS 와 같은 데이터·배치.

## 5. POS
- 칩: entering/first_visit "Customer typing •••" · confirming "Awaiting confirm · <phone>" · confirmed "✓ <phone> · IDR <balance>" · unconfirmed/skipped(결제 후) "Not confirmed · Link customer"
- Next customer: entering/first_visit/confirming 이면 경고 [Keep waiting] [Next customer anyway → reset]
- Link customer → `link_phone` (손님화면 확인 후 적립 · `no_active_snapshot` 이면 "Customer display not connected")
- 모든 POS 호출에 현재 매장 `stock_location_id` 포함.
