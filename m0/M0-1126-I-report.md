PASS #456 f6743a1

# M0-1126-I — V4-7/V4-8 Phone entry (계약 v1.4)

## 범위

- **V4-8** (Kyu 재언급 🔴) · 결제 진행 중 어느 단계에서든 캐셔가 "CD 에 번호 입력 열기" 가능.
  `start_entry` 를 none/skipped 외 **confirmed** (Re-enter) 에서도 허용. 기존 번호는 새 `submit_phone` 가
  확정될 때만 교체. `cancel_entry` 로 되돌리면 원래 번호 유지. 다른 손님 사용 중이면 `phone_entry_busy`
  거절 (+ `entering_order_id`).
- **V4-7** (Kyu 15:53 확정) · 결제 완료 주문에 "Phone entry" 서버 판정 엔드포인트 (PIN 없음).
  `POST /admin/pos/orders/:id/phone-entry` — 4조건 (가장 최근 결제 · 새 장바구니 전 · 번호 미확인 ·
  영업 마감 전) + lock 을 서버가 판정해 `eligible` + 사유 코드. 열리면 좌측 영수증 + 우측 키패드.
- **계약 v1.4** · POS 가 규칙을 추측하지 않도록 `customer_flow.actions` (`'ask'|'reenter'|'ask_again'`)
  + `customer_flow.locked` 두 필드 신규. `docs/contracts/cd-sync-contract-v1.4.md` 로 고정. 6상태 표 포함.
- **POS fork 수정 없음** — M3 다음 라운드 소관. 서버 계약 + CD 반응만 변경. CD 는
  `resolveRightPanel('entering')='keypad'` 기존 로직 재사용 — 다음 poll 에서 자동으로 keypad 가
  뜨고 `phone_partial` 가 POS 로 흘러감 (POS-2 debounce 재사용 · 변경 없음).

## 변경 파일

| 파일 | 변경 |
| --- | --- |
| `apps/commerce-core/src/lib/customer-flow/transitions.ts` | `start_entry` from `confirmed` 허용 · `cancel_entry` 신설 (prior phone 있으면 confirmed, 없으면 none) |
| `apps/commerce-core/src/lib/customer-flow/orchestrator.ts` | start_entry lock 체크 (phone_entry_busy) · Re-enter 시 `customer_phone` 보존 · cancel_entry 핸들러 · `ApplyCustomerFlowOutput.reason` 에 `phone_entry_busy` + `entering_order_id` 추가 |
| `apps/commerce-core/src/modules/register_session/service.ts` | `openPostSettlementPhoneEntry(order_id)` 신설 — 4조건 판정 + lock + 열기 원자 |
| `apps/commerce-core/src/modules/register_session/lifecycle.ts` | `deriveCustomerFlowActions` + `customer_flow.actions`/`locked` DTO |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/phone-entry/route.ts` | 신규 — V4-7 endpoint |
| `apps/commerce-core/src/api/admin/pos/customer-flow/route.ts` | POS_ACTIONS 에 `start_entry`, `cancel_entry` 추가 · phone_entry_busy payload 에 `entering_order_id` |
| `apps/commerce-core/src/api/customer-display/customer-flow/route.ts` | CD_ACTIONS 에 `cancel_entry` 추가 · phone_entry_busy 호환 |
| `apps/commerce-core/src/types/customer-display.ts` | `CustomerFlowAction`+`cancel_entry` · `CustomerFlowUiAction` · `CustomerFlow.actions`/`locked` |
| `apps/customer-display/src/types/order-snapshot.ts` | 서버 타입 미러 — `actions`/`locked` optional + `CdAction.cancel_entry` |
| `apps/customer-display/src/types/cd-sync-contract.ts` | 재export |
| `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4.spec.ts` | 신규 4 시나리오 |
| `apps/commerce-core/src/lib/customer-flow/__tests__/transitions.unit.spec.ts` | 전이 표에 `cancel_entry` + confirmed-start 케이스 |
| `docs/contracts/cd-sync-contract-v1.4.md` | 신규 — v1.4 델타 + 6상태 표 + API |
| `docs/feature-map.yaml` | 신규 파일 등록 |

## 테스트 로그 (직접 실행)

### typecheck · unit · naming
- `pnpm typecheck` commerce-core · **0 err**
- `pnpm typecheck` customer-display · **0 err**
- `pnpm test` commerce-core · **877 / 877 pass** (29 s · 전이 표에 confirmed-start / cancel_entry 포함 → 72 case)
- `pnpm test` customer-display · **327 / 327 pass** (550 ms)
- `bash scripts/naming-check.sh` · PASS (meros 매치 0 · 모듈명 정합 · [...x] 없음 · 동명 migration 없음)

### integration
- `bash scripts/it.sh cd-pos-sync-v4` · **4 / 4 pass** (11.35 s):
  - V4-8 결제 중 Ask → 입력 → OK → Re-enter → 다른 번호 확정 (기존 번호 보존) ✓ 868 ms
  - V4-8 Skipped → Ask again (start_entry from skipped) ✓ 782 ms
  - V4-7 결제 완료 주문 Phone entry = eligible · 새 장바구니 시작 후 `new_cart_started` ✓ 445 ms
  - V4-8 lock — 다른 손님 번호 입력 중 start_entry 거절 (`phone_entry_busy`) ✓ 420 ms
- 회귀 `bash scripts/it.sh cd-pos-sync-v3` · **3 / 3 pass** (9.30 s · V3-1 x2 + V3-2 x1)
- 회귀 `bash scripts/it.sh cd-full-flow` · **8 / 8 pass** (11.81 s)
- 회귀 `bash scripts/it.sh cd-snapshot-skip` · **7 / 7 pass** (11.12 s)

### 실기 미검증
운영 CD/POS 실기 (`admin.meros.id`) 는 러너 환경 밖 — Kyu 재배포 후 PR #456 체크리스트 6개 실기 필요.

## 기술 선택지 (권장안으로 진행 · PR 본문 3줄)

1. Re-enter 번호 보존 = 별도 `prev_phone` 컬럼 vs **customer_phone 그대로 유지 + phone_partial 리셋**.
   후자 채택 — 마이그레이션 0개, `submit_phone` 가 덮어쓰면 교체 · 안 하면 원래 유지.
2. V4-7 endpoint = GET preflight + POST open 2단 vs **단일 POST (eligible 판정 + 열기 원자)**.
   후자 채택 — eligibility race (판정 후 새 장바구니 끼어들기) 를 서비스 메서드 한 호출로 봉인.
3. Lock 체크 위치 = 라우트 vs **orchestrator.applyCustomerFlow**. orchestrator 채택 —
   CD · POS 양쪽 route 가 재사용 · 응답에 `entering_order_id` 포함 → POS 가 "#N entering…" 뱃지.

## M3 (POS) 가 쓸 API

```http
# V4-8 — 결제 중 "CD 에 번호 입력 열기"
POST /admin/pos/customer-flow
     { "action": "start_entry", "register_session_id": "<sess_id>" }
→ 200 { ok: true, customer_flow: { state: "entering", actions: [], locked: false, ... }, snapshot }
→ 200 { ok: false, reason: "phone_entry_busy", entering_order_id: "ord_abc",
        customer_flow: { locked: true, ... }, snapshot }
→ 200 { ok: false, reason: "invalid_transition", customer_flow, snapshot }

# V4-8 — Re-enter 취소 (원래 번호 복원)
POST /admin/pos/customer-flow
     { "action": "cancel_entry", "register_session_id": "<sess_id>" }
→ 200 { ok: true, customer_flow: { state: "confirmed", ... }, snapshot }
  # 또는 prior phone 없으면 state: "none"

# V4-7 — 결제 완료 주문 Phone entry (PIN 없음)
POST /admin/pos/orders/:id/phone-entry
→ 200 { eligible: true, idempotent: false,
        snapshot: { customer_flow: { state: "entering", source: "pos", ... },
                    snapshot_state: "paid", phone_entry_open: true, ... } }
→ 200 { eligible: false,
        reason: "no_snapshot" | "not_paid" | "phone_already_linked"
              | "link_window_closed" | "not_latest_paid"
              | "new_cart_started" | "phone_entry_busy",
        entering_order_id?: "<ord_id>",   # new_cart_started / not_latest_paid / phone_entry_busy
        snapshot?: { ... } }
```

### 버튼 매핑 (`customer_flow.actions` 배열 그대로 사용 · 규칙 추측 금지)

| state | actions | POS 버튼 |
| --- | --- | --- |
| `none` | `['ask']` | "Ask phone" |
| `entering` | `[]` | (손님이 입력 중 · 표시만) |
| `confirmed` | `['reenter']` | "Re-enter" |
| `skipped` | `['ask_again']` | "Ask again" |
| `unconfirmed` | `['ask_again']` | "Ask again" |
| 어느 상태든 `locked=true` | — | 버튼 비활성 + "#N entering…" |

### V4-7 사유 코드

| reason | 의미 |
| --- | --- |
| `no_snapshot` | order 에 대응하는 snapshot 없음 |
| `not_paid` | snapshot 이 아직 paid 아님 (결제 중 → V4-8 path) |
| `phone_already_linked` | `customer_phone` 이미 세팅 |
| `link_window_closed` | `link_open_until <= now` (EOB 지남) |
| `not_latest_paid` | 같은 레지스터에 더 최근 paid snapshot 존재 (`entering_order_id`) |
| `new_cart_started` | 같은 레지스터에 active snapshot (`entering_order_id`) |
| `phone_entry_busy` | 다른 snapshot 이 phone_entry_open (`entering_order_id`) |
