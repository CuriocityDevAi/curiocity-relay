# 계약서: 손님화면(CD) ↔ POS 동기화 — v1 (2026-11-25 · 오케)

정본 흐름: `ledger/decision-cd-pos-sync-flow-20261125.md` · 디자인: `ledger/decision-cd-pos-sync-design-20261125.md` · 캔버스 https://claude.ai/artifact/VFoyrbxnvgB7akmS3xHvVW

**이 문서가 세 PR(서버 M0 · CD M1 · POS M3)의 단일 계약.** 필드·값 이름을 바꾸려면 PR 본문에 사유를 쓰고 이 파일 개정을 오케에게 요청(임의 변경 금지). 오늘 #438↔#263 처럼 서로 다르게 가정하는 일을 막기 위함.

## 1. 두 갈래 상태 (CD snapshot 에 실림)
```ts
type PaymentPhase = 'building' | 'tendering' | 'paid' | 'failed' | 'cancelled';
// building = Sell/Cart/Checkout · tendering = 결제수단 화면(Cash/Card/QRIS, 나눠 결제 중 포함)

type CustomerFlowState =
  | 'none'          // 번호 흐름 시작 안 함
  | 'entering'      // CD 키패드 입력 중
  | 'first_visit'   // 처음 보는 번호 — 첫 방문 안내 중
  | 'confirming'    // 번호 확인 화면 (CD 또는 POS Link customer 로 진입)
  | 'confirmed'     // 손님이 [Yes, that's me]
  | 'skipped'       // [Skip] 또는 입력 20초 무입력
  | 'unconfirmed';  // 확인 화면 20초 무응답 — 포인트 없음, POS 에서 나중에 Link 가능

interface CustomerFlow {
  state: CustomerFlowState;
  phone: string | null;          // 숫자만. entering/first_visit/confirming 동안만 전체, 그 외 서버가 마스킹 문자열 별도 제공
  phone_masked: string | null;   // 예 "0813-••••-42480"
  is_first_visit: boolean;
  points_balance: number | null; // 현재 적립금(IDR, 정수)
  points_to_earn: number | null; // 이번 주문 적립 예정 (세전 금액 기준 기존 규칙)
  points_earned: number | null;  // 실제 적립 완료 시에만 값
  source: 'cd' | 'pos';
  updated_at: string;
}

interface CdSnapshot {             // 기존 snapshot 에 필드 추가 (기존 필드 유지)
  payment_phase: PaymentPhase;
  customer_flow: CustomerFlow;
  tender?: { method: 'cash' | 'card' | 'qris'; paid_so_far: number; remaining: number; qr_string?: string | null };
  receipt?: Receipt;               // POS 영수증과 동일 데이터 (#437 의 full receipt · 금액 필드 total)
  // items[], totals… 기존 그대로
}
```

## 2. 행동 (요청 → 서버가 상태 전이 → snapshot 갱신 → CD·POS 둘 다 반영)
| 호출자 | 행동 | 허용 상태 → 결과 |
|---|---|---|
| CD | `start_entry` | none/skipped → entering |
| CD | `submit_phone {phone}` | entering → first_visit(새 번호) 또는 confirming(기존 번호). 서버가 번호로 손님 조회, balance·is_first_visit 채움 |
| CD | `continue_first_visit` | first_visit → confirming |
| CD | `change_number` | first_visit/confirming → entering (phone 비움) |
| CD | `confirm` | confirming → confirmed |
| CD | `skip` | entering → skipped |
| CD | `confirm_timeout` | confirming → unconfirmed |
| POS | `link_phone {phone}` | 아무 상태 → confirming (source pos) |
| POS | `reset` | 아무 상태 → none (Next customer anyway · 다음 주문) |

엔드포인트 경로는 **기존 CD·로열티 엔드포인트를 먼저 재사용**(M0 대사표). 새로 만들면 `POST /customer-display/customer-flow` (CD 인증) · `POST /admin/pos/customer-flow` (POS 인증), body `{ action, phone? }`, 응답 `200 { ok: true, customer_flow }` · 허용 안 되는 전이 `200 { ok: false, reason: 'invalid_transition', customer_flow }` (상태 코드로 분기하지 않음 — #438 방식).

## 3. 포인트 적립 규칙 (서버 단독 · 멱등)
- 적립 = `payment_phase === 'paid'` **AND** `customer_flow.state === 'confirmed'`. 둘 중 나중에 도달한 쪽 이벤트에서 1회 적립(멱등 키 = order_id). 적립 시 `points_earned` 채움.
- `unconfirmed`/`skipped`/`none` 으로 결제 완료 → 적립 없음. POS 칩에 "Not confirmed · Link customer".
- `confirmed` 인데 결제 `failed/cancelled` → 적립 없음, CD 는 "Payment was not completed".

## 4. CD 화면 선택 (CD 앱 단독 규칙 · 레이아웃 = 모든 경우 좌 1/3 + 우 2/3 통일, Kyu 18:00)
- 우 2/3 = customer_flow (entering → 키패드 · first_visit → 첫 방문 · confirming → 확인 · confirmed → 결제 전이면 "Points will be added once payment is done", paid 면 Points earned · failed/cancelled 면 Payment was not completed)
- 좌 1/3 = payment (tendering: 화면명 / QRIS 면 QR + 금액 / 나눠 결제 중이면 Remaining · paid: 영수증 인쇄 애니메이션)
- customer_flow = none 이고 paid → 영수증 전체 화면 → 인쇄 끝 3초 뒤 좌 1/3 로 밀리고 우측에서 키패드(entering 으로 start_entry 자동)
- customer_flow = none 이고 building/tendering → ① 주문내역(크게) · tendering 에서만 [Enter phone number] 활성
- 20초 무입력(entering) → skip · 20초 무응답(confirming) → confirm_timeout · skipped/unconfirmed/points earned 표시 후 → 처음 화면(다음 주문 시작 또는 POS reset 시)
- 모든 문구 영어 기본. 영수증은 POS 와 같은 데이터·같은 배치.

## 5. POS
- 우상단 칩: entering/first_visit → "Customer typing •••" · confirming → "Awaiting confirm · <phone>" · confirmed → "✓ <phone> · IDR <balance>" · unconfirmed/skipped(결제 후) → "Not confirmed · Link customer"
- Next customer: customer_flow ∈ {entering, first_visit, confirming} 이면 경고 "Customer is entering their number / Moving on now resets the customer screen. No points will be earned for this order." [Keep waiting] [Next customer anyway → reset]
- Link customer(기존 버튼) → `link_phone`
- POS 결제 진행은 customer_flow 와 무관하게 계속 가능.
