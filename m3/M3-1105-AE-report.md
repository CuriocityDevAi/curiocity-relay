# M3-1105-AE 리포트 — 주문 상세에 Void/Refund 버튼 연결 · storeport #207 계약 대조

원장: `ledger/decision-p6-20261110.md` (Kyu 11-10 15:43 · Q1~Q5 권장안)
서버 정본: `storeport#207` (`feat/m0-1105-ab-void-refund-pin` · OPEN) — 실제 코드와 fixture 를 그대로 대조.
PR: `pos-m3#77` (`feat/m3-1105-ad-refund-void-sheets`) — AE 는 동일 PR 에 이어 커밋 (새 PR 아님).
베이스: `origin/master` (#75 · #76 머지) 위로 `d97f228` rebase 완료.

---

## §0 · 계약 대조표 (storeport #207 실제 코드 vs #77 이전 상태 → 교정 뒤)

| Endpoint | 항목 | 이전 (#77 초안) | 서버 #207 실제 | 처리 |
|---|---|---|---|---|
| `POST /admin/pos/manager-pin/verify` | 401 body | `{ ok:false, remaining_attempts }` | `{ ok:false, reason:'mismatch', remaining }` | 🔧 fixture + 훅 + ManagerPinSheet 교정 |
| | 423 body | `{ ok:false, locked_until }` | `{ ok:false, reason:'locked', retry_at }` | 🔧 fixture + 훅 + ManagerPinSheet 교정 |
| | body 필드 | `{ pin, order_id, action }` | `{ pin, store_id?, order_id?, action? }` | ✅ 상위 호환 (추가 필드 optional) |
| `POST /admin/pos/orders/:id/void` | request body | `{ method, terminal_approval_code?, manager_pin? }` | `{ method, terminal_approval_code?, manager_pin?, reason?, register_session_id? }` | 🔧 `register_session_id` 추가 (shift 검증 필수 · 없으면 400) |
| | success body | `{ ok, order_id, receipt_id, receipt_no, cash_movement_id?, open_drawer }` | `{ ok, order_id, canceled_at, method, receipt_id, receipt_no, cash_movement_id, open_drawer }` | 🔧 `canceled_at`·`method` 추가 |
| `POST /admin/pos/orders/:id/refund` | success body | `{ ok, order_id, receipt_id, receipt_no, cash_movement_id?, open_drawer }` | `{ ok, order_id, payment_id, refunded_amount, method, receipt_id, receipt_no, cash_movement_id, open_drawer }` | 🔧 `payment_id`·`refunded_amount`·`method` 추가 |
| | 409 body | `{ ok:false, message:"Order already refunded" }` | `{ type:'conflict', message:"payment already fully refunded", order_id, payment_id }` | 🔧 shape 전면 교체 (`type` discriminator) |
| | 400 (no code) | — | `{ type:'invalid_data', message:"terminal_approval_code required (6 digits · EDC REFUND receipt approval)" }` | 🔧 fixture 신규 |
| | 400 (cross-shift void) | — | `{ type:'invalid_data', message:"cross-shift void not allowed · use refund instead", order_id }` | 🔧 fixture 신규 |

규칙 ⓑ 에 따라 **#207 실제 코드에 맞춰** #77 을 전부 교정 (fixture · 훅 응답 타입 · ManagerPinSheet 파서).

---

## §1 · 변경 파일

### 수정 (기존)
- `lib/refund-rules.ts` — `buildRefundBody` 에 `register_session_id`·`reason` optional 포함. `deriveVoidRefundExposure(order, openSessionId)` 신규 pure 함수: Medusa `AdminOrder` + 현재 열린 교대 id → `{ kind: 'hidden'|'voided'|'refunded'|'show', action, originalTender, total, currency, originSessionId }`.
- `api/hooks/pos-refunds.ts` — `VerifyManagerPinResponse` 가 `{ ok:true } | { ok:false, reason:'mismatch', remaining } | { ok:false, reason:'locked', retry_at }` 로 교정. `VoidRefundResponse` 에 `canceled_at?`·`payment_id?`·`refunded_amount?`·`method` 추가.
- `components/orders/ManagerPinSheet.tsx` — 응답/에러 파서가 `reason`·`remaining`·`retry_at` (#207) 사용. `remaining_attempts`·`locked_until` 제거.
- `components/orders/VoidRefundSheet.tsx` — `VoidRefundOrderSummary` 에 `registerSessionId?` 추가. `buildRefundBody` 호출 시 그대로 body 에 투입 → 서버 shift 검증 통과. `onSuccess` 콜백에 `method` 포함.
- `components/receipt/ReceiptCard.tsx` — `receipt.kind === 'void'` 도 `refund_watermark` 노출 (#207 이 void 시 kind='void' 영수증 발급).
- `app/orders/[orderId].tsx` — 주문 상세 Payments 영역에 Void/Refund outline 버튼 트리거 연결. `deriveVoidRefundExposure` 결과로 분기:
  - `voided`/`refunded` → `Voided`/`Refunded` danger-soft 배지만.
  - `show` → `Void`(same shift) / `Refund`(cross shift) outline 버튼 노출.
  - `hidden` → dp_paid · 미결제 · provider 불명 시 아무 것도 표시 안 함.
  영수증 카드는 `metadata.refund.receipt_id` → `metadata.void.receipt_id` → `metadata.receipt_id` 순으로 preference → void/refund 완료 뒤 자동으로 워터마크 전환.
- `scripts/m3-1105-ad-assertions.mjs` — fixture 교정 반영 (#207 shape).

### 신규
- `fixtures/pos-refund-void-cross-shift-400.json` — 교대 넘은 void 거부 fixture.
- `fixtures/pos-refund-no-approval-code-400.json` — card_terminal 환불에 승인번호 없음 fixture.
- `scripts/m3-1105-ae-assertions.mjs` — 노출 규칙 전 조합 (8 cases) · 상세 wiring · `register_session_id` body 포함 · PIN sheet `#207` shape · receipt void 워터마크 검증.
- `scripts/m3-1105-ae-screenshots.mjs` — iPad landscape (1180×820) 3장 (card 승인번호 · PIN 틀림 · 현금 안내 토스트).

---

## §2 · 어설션 결과

- `scripts/m3-1105-ad-assertions.mjs` → **59/59 PASS** (fixture 교정 · body shape · raw hex 0 · Toast.show 직접 0).
- `scripts/m3-1105-ae-assertions.mjs` → **35/35 PASS** (노출 전 조합 · 상세 wiring · `register_session_id` · PIN `#207` shape · void 워터마크).
- `node scripts/run-all.mjs assertions` → **28/29 PASS** (1 실패는 `m3-1105-x-fulfill-assertions.mjs` U1 — `OrderTypePicker · Delivery disabled:true` 유지를 기대하지만 **#75 머지가 이 상태를 해제** · AE 작업과 무관한 선-재발 · #75 작업 몫).

---

## §3 · Playwright 스샷 (web · iPad landscape 1180×820)

`screenshots-m3-1105-ae/` · AA 와 동일 `pushState + popstate` 로 `/orders/<id>` 모달 진입.

- **`01-void-card-terminal-approval-code.png`** — ✅ Void 시트 · CARD 원거래 · `Card terminal` chip 기본 선택 (ink + ✓) · "Void on the EDC terminal first, then enter the 6-digit approval code" + 6자리 placeholder `1 2 3 4 5 6` · Void 버튼 비활성 (승인번호 비어 있음). Original payment: Card · No. 101 · IDR 95,000. 영수증 카드 아래 Reprint/Share/Hand over/Void (outline) 바 보임.
- **`02-manager-pin-wrong-attempts-left.png`** — ✅ Manager PIN 시트 열림 · 4칸 PIN 입력 뒤 틀린 PIN 재설정 상태 (빨강 테두리) · Verify 비활성. ⚠️ 에러 문구가 "4 attempts left" 가 아닌 SDK 기본 "Unauthorized" — Medusa SDK 가 401 응답 body (`{reason, remaining}`) 를 throw 된 Error 에 노출 안 함 (pre-existing · 다음 라운드에서 sdk fetch wrapper 보강 필요).
- **`03-cash-drawer-guidance-toast.png`** — ⚠️ cash void mutation 성공 → `onClose()` 로 시트 닫혀 주문 상세 하단 바 (Reprint/Share/Hand over/**Void** outline) 복귀. 캡슐 토스트 "Open the cash drawer and give IDR 95,000" 자동 닫힘 타이밍으로 캡처 실패 — **Kyu iPad 실기 §4 체크리스트 ④** 로 확인.

버그 1건 **fix** (AD 선-혼재): `components/orders/VoidRefundSheet.tsx` · 기존 `confirmDisabled` 가 `needsPin && !pendingPin` 도 포함해 **PIN 시트를 여는 클릭 자체가 막혔음** → `pending || (needsApprovalCode && !isValidTerminalApprovalCode(approvalCode))` 로 교정. PIN 받은 뒤는 `onPinVerified` 가 바로 submit 하므로 두 번째 클릭 경로는 발생하지 않음.

---

## §4 · Kyu 실기 체크리스트 (#207 배포 뒤)

iPad landscape (`/orders/<id>`) 에서 확인:

1. 결제 완료 주문 → Payments 영역 하단에 **Void** (같은 교대) 또는 **Refund** outline 버튼 노출.
2. 버튼 → Void sheet.
3. **카드 원거래** → `Card terminal` chip 기본 선택 · 6자리 승인번호 입력 → `Void` 버튼 활성 · 실행 → 캡슐 성공.
4. **현금/QRIS 원거래** → `Cash` chip · `Void` 버튼 → PIN sheet · **오늘 PIN (MEROS Admin 위젯 확인)** 4자리 입력 → 캡슐 성공 + "Open the cash drawer and give IDR X".
5. 틀린 PIN 입력 → 흔들림 + "N attempts left" · 5회 누적 → "Locked until HH:MM".
6. 완료 뒤 상세 새로고침 → **Voided** / **Refunded** 배지 · 영수증 카드 상단에 `refund_watermark` (void 도 동일 라벨 재사용).
7. 교대 넘어간 뒤 같은 주문 → 버튼이 **Refund** 로 전환 (서버가 `cross-shift void not allowed` 400 을 던지기 전에 클라 판단).
8. 이미 void/refund 된 주문 → 버튼은 숨겨지고 배지만.
9. `dp_paid` · 미결제 · 결제 provider 불명 → 버튼 숨김.

---

## §5 · PR #77 본문 갱신 3줄 (선택지 · 이유)

- **① 서버 응답 shape 재정렬** — (a) 기존 #77 shape 유지하고 서버 어댑터로 흡수 · (b) **채택: fixture/훅/시트를 #207 실제 코드에 맞춤**. 이유: fixture 는 서버 정본의 거울 (규칙 ⓑ) — 어댑터가 쌓이면 다음 라운드에서 두 soruce of truth 간 drift.
- **② 교대 식별 전달** — (a) 서버가 order.metadata 로 결정 · (b) **채택: 클라가 `register_session_id` 를 body 에 넘겨 서버가 shift 검증**. 이유: #207 void route 가 `register_session_id` 없으면 400 — 서버 계약이 요구.
- **③ Void/Refund 버튼 색** — (a) 결정 버튼이라 ink · (b) **채택: outline (cross-screen 결정만 ink)**. 이유: 11-10 Kyu 색 하드룰 — 검정은 화면 넘어가는 결정 버튼에만.

---

## §6 · 착지 명령

```
cp /tmp/M3-1105-AE-report.md ~/projects/curiocity-relay/m3/ \
  && cd ~/projects/curiocity-relay \
  && git add m3/M3-1105-AE-report.md \
  && git commit -m "m3: M3-1105-AE" \
  && git pull --rebase --autostash origin main \
  && git push
```

claim done (상위 환경에서 처리).
