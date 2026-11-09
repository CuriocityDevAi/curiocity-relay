# R0-1105-AM · 리뷰 · fork #67 Fulfill 시트 1/2

**PR**: CuriocityDevAi/agilo-medusa-pos-fork#67  
**브랜치**: feat/m3-1105-x-fulfill-sheet → master (base c34a2b8)  
**리뷰어**: R0 (2026-11-10)  
**판정**: ✅ APPROVE

---

## 판정 근거

### REQ 1 — Fulfill 버튼 노출 규칙

| 조건 | 경로 | 판정 |
|---|---|---|
| preorder `paid_full` | `showFulfillSheet = !isFulfilled && (isPreorderReady \|\| isDeliveryAwaiting)` / `isPreorderReady = orderType==='preorder' && preorderStage==='paid_full'` | ✓ |
| delivery `awaiting_dispatch` | `isDeliveryAwaiting = orderType==='delivery' && deliveryStage==='awaiting_dispatch'` | ✓ |
| takeaway paid | `showHandOverImmediate = !isFulfilled && orderType==='takeaway' && payState==='paid'` → `useHandOver` 즉시 POST (기존 경로 유지) | ✓ |
| preorder `dp_paid` 숨김 | `isPreorderReady`가 `paid_full` 한정이므로 `dp_paid`는 자동 false → `showFulfillSheet=false` | ✓ |
| dp_paid 서버 400 영어 메시지 | fixture `pos-fulfill-dp-paid-400.json` → `{type:'invalid_data', message:'preorder hand_over requires paid_full · current preorder.stage="dp_paid"'}` · `extractError`가 body.message 그대로 Toast | ✓ |

### REQ 2 — 시트 구현

| 체크 | 판정 |
|---|---|
| Pickup = Note(선택) | ✓ |
| Delivery = Courier **필수** + Driver/Contact/Tracking/Note 선택 | ✓ |
| Courier 공백·공백문자 → Fulfill 비활성 | `courierTrimmedEmpty = courier.trim().length === 0` / `submitDisabled = isPending \|\| (method==='delivery' && courierTrimmedEmpty)` ✓ |
| `* Courier is required` 힌트 | ✓ |
| 요청 body 서버 계약 키 일치 | `{stage:'hand_over', method, courier?, driver?, contact?, tracking_ref?, note?}` — storeport #200 shape 완전 일치 ✓ |
| fixture 3종 서버 #200 실제 응답 shape | pickup(200) · delivery(200) · dp-paid(400) — `completed`, `inventory_decremented`, `reservations_released`, `inventory_warning` 모두 포함 ✓ |
| delivery fixture `request_body_sample` courier/driver/contact/tracking_ref/note 포함 | ✓ |

### REQ 3 — 성공 뒤

| 체크 | 판정 |
|---|---|
| Delivery 배지 (`Dispatched`) · completed 즉시 | `method==='delivery' ? 'Dispatched' : 'Handed over'` Toast · 서버 `completed:true` 1단계 ✓ |
| 목록/상세 invalidate | `useFulfillOrder.onSuccess` → `qc.invalidateQueries(['order'])` + `qc.invalidateQueries(['orders'])` ✓ |
| 이중 탭 가드 | `fulfill.isPending` → `submitDisabled` → `<Button disabled>` ✓ |

### REQ 4 — 금지 파일 미수정 · 영어 UI · 색 규칙 · 번들 안전

| 파일 / 항목 | 판정 |
|---|---|
| `app/checkout/**` | 변경 파일 목록에 없음 ✓ |
| `components/payment/OrderTypePicker.tsx` | Delivery `disabled:true` 유지 · U1 어설션 가드 ✓ |
| `lib/printer/*` · `lib/receipt-layout.ts` | 미수정 ✓ |
| `app/_layout.tsx` · `ShiftCloseGate*` | 미수정 ✓ |
| `api/hooks/pos-orders.ts` useHandOver | 미수정 · body shape 불변 가드 ✓ |
| 영어 UI | Fulfill / Hand over / Courier / Driver name / Driver contact / Tracking number / Note / Pickup / Delivery / Dispatched / Handed over — 전부 영어 ✓ |
| 색 규칙 | 결정 버튼 Fulfill = default (bg-ink) · `bg-warning` 제거는 M3-1105-V 이전 Hand over 잔재 정리 (어설션 U9 주석 근거) ✓ |
| 번들 안전 | U12: `scripts/m2-1105-q-bundle-guard.mjs` 존재 확인 ✓ |

### REQ 5 — 회귀 재실행 · CI

| 항목 | 결과 |
|---|---|
| `node scripts/m3-1105-x-fulfill-assertions.mjs` | **71/71 PASS** (PR 보고서 · M3-1105-X-report.md 로그 확인) |
| `node scripts/run-all.mjs assertions` | **21/21 PASS · 10.5s** (m3-1105-d 회귀 가드 포함) |
| `npx tsc --noEmit` | 0 에러 (global.css 사이드이펙트 경고 1건 — 사전 존재) |
| CI check-runs | GitHub API 403 (권한 미흡) — 직접 확인 불가 · PR 보고서 로그로 대체 |

---

## 전체 판정

**APPROVE** — 모든 REQ 항목 충족. 71/71 어설션 pass. 금지 파일 미수정. 서버 계약 키 완전 일치. 색 규칙 준수.
