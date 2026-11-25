# R0-1125-AK 리포트 — 손님화면↔POS 동기화 3자 최종 대조

## 세 PR 판정 · 머지 순서

| PR | 제목 | 판정 | 머지 순서 |
|---|---|---|---|
| storeport #445 | M0-1125-R 서버 CD↔POS 동기화 | **APPROVE** ✅ | 1️⃣ 선행 |
| agilo-pos #266 | M3-1125-R+S POS 칩·경고·link_phone | **CHANGES** ❌ Lint ❌ | 2️⃣ lint fix 후 |
| storeport #444 | M1-1125-T CD mock 신설계 | **CHANGES** ❌ CI e2e + feature-map | 3️⃣ CI fix 후 |
| storeport #446 | M1-1125-U CD live 연결 | **APPROVE** ✅ | 4️⃣ #444 머지 후 |

**머지 순서**: #445 서버 → #266 (lint fix) → #444 (CI fix) → #446

> #446은 base = `feat/M1-1125-T` (#444 브랜치) 위에 쌓인 것 확인. 별개 PR 아님.  
> #266은 M3-1125-R(커밋 1) + M3-1125-S(커밋 2) 한 PR에 적층.

---

## 블로커 목록

| PR | 블로커 | 내용 |
|---|---|---|
| #444 | `e2e-admin-loyalty` CI ❌ | heavy-cloud step 실패 — admin-loyalty e2e 하네스가 구 LinkCustomerSheet API 가정 가능 |
| #444 | feature-map 5파일 미등록 | `app/cd-sync.tsx`, `src/lib/cd-screen-selector.ts`, `src/screens/OrderListScreen.tsx`, `src/screens/PhoneFlowScreen.tsx`, `src/lib/__tests__/cd-screen-selector.test.ts` → `customer-display.cd-sync-flow` 프로세스에 추가 + planned → live |
| #266 | Lint/lint ❌ | `app/checkout/success/[orderId].tsx` — `setLinkedResult`/`setIsLinkedByDisplay` 미사용 추정 (`onLinked`/`onLinkedByDisplay` 콜백 제거 후 setter 잔류) |

---

## 끝에서 끝 표 — 9종 행동

| 행동 | 호출자 | 보내는 body | 서버 route 파일 | 서버 전이 | 응답 | 받는 쪽 처리 |
|---|---|---|---|---|---|---|
| `start_entry` | CD `handleCdAction` (index.tsx:300 Case1 타이머 또는 :280 버튼) | `{action:'start_entry'}` | `customer-display/customer-flow/route.ts:POST` | none/skipped → entering | `{ok:true, customer_flow, snapshot}` | `setLocalCustomerFlow(data.customer_flow)` (index.tsx) |
| `submit_phone` | CD KeypadPanel onSubmit → `handleCdAction` | `{action:'submit_phone', phone:'08xxx'}` | 동일 CD route | entering → first_visit(신규) / confirming(기존) | `{ok:true, customer_flow}` | `setLocalCustomerFlow` |
| `continue_first_visit` | CD FirstVisitPanel → `handleCdAction` | `{action:'continue_first_visit'}` | 동일 CD route | first_visit → confirming | `{ok:true, customer_flow}` | `setLocalCustomerFlow` |
| `change_number` | CD ConfirmPanel/FirstVisitPanel → `handleCdAction` | `{action:'change_number'}` | 동일 CD route | first_visit/confirming → entering | `{ok:true, customer_flow}` | `setLocalCustomerFlow` |
| `confirm` | CD ConfirmPanel → `handleCdAction` | `{action:'confirm'}` | 동일 CD route | confirming → confirmed (paid이면 linkCustomerToOrder → 적립) | `{ok:true, customer_flow}` | `setLocalCustomerFlow` |
| `skip` | CD KeypadPanel 20s 타임아웃 / onSkip → `handleCdAction` | `{action:'skip'}` | 동일 CD route | entering → skipped | `{ok:true, customer_flow}` | `setLocalCustomerFlow` |
| `confirm_timeout` | CD ConfirmPanel 20s → `handleCdAction` | `{action:'confirm_timeout'}` | 동일 CD route | confirming → unconfirmed | `{ok:true, customer_flow}` | `setLocalCustomerFlow` |
| `link_phone` | POS LinkCustomerSheet `handleLink` → `useCustomerFlowAction` | `{action:'link_phone', phone, stock_location_id}` | `admin/pos/customer-flow/route.ts:POST` | 아무 상태 → confirming | `{ok:true, customer_flow}` or `{ok:false, reason:'no_active_snapshot'}` | POS 칩 → snapshot poll 반영 |
| `reset` | POS "Next customer anyway" (products.tsx/sell.tsx) | `{action:'reset', stock_location_id}` | 동일 POS route | 아무 상태 → none | `{ok:true, customer_flow}` or `{ok:false, reason:'no_active_snapshot'}` | POS 칩 hidden, CD order-list 복귀 |

인증:
- CD 7종: `X-Device-Token` 헤더 → `deviceTokenMiddleware` → `DEVICE_REGISTER_ID_KEY` (stock_location_id 추출)
- POS 2종: admin JWT → 미들웨어 → `resolveSnapshot(stock_location_id)` 로 활성 snapshot 조회

---

## snapshot 필드 대조

### 서버가 내보내는 모양 (`#445 customer-display.ts`)

```ts
customer_flow: {
  state: CustomerFlowState;      // 7종 enum
  phone: string | null;          // entering/first_visit/confirming 에만 전체 번호
  phone_masked: string | null;
  is_first_visit: boolean;
  points_balance: number | null;
  points_to_earn: number | null;
  points_earned: number | null;  // paid+confirmed 시에만
  source: "cd" | "pos" | null;   // ← state=none 시 null (v1.1)
  updated_at: string;
}
payment_phase: PaymentPhase;     // building/tendering/paid/failed/cancelled
tender?: { method, paid_so_far, remaining, qr_string? };
receipt?: Receipt;
```

### CD 앱이 읽는 모양 (`#446 order-snapshot.ts`)

```ts
// OrderSnapshot 추가 필드
payment_phase?: PaymentPhase;
customer_flow?: CustomerFlow;  // source: "cd"|"pos" (null 없음 ← 불일치)
tender?: CdTender;
```

### POS 가 읽는 모양 (`#266 loyalty-snapshot.ts`)

```ts
// OrderSnapshot 추가 필드
customer_flow?: CustomerFlow | null;  // source: 'cd'|'pos' (null 없음 ← 불일치)
```

### 필드 이름·값 불일치 여부

| 필드 | 서버 | CD | POS | 판정 |
|---|---|---|---|---|
| payment_phase | `PaymentPhase` 5종 | 동일 | — | ✓ |
| customer_flow.state | `CustomerFlowState` 7종 | 동일 | 동일 | ✓ |
| customer_flow.source | `"cd"\|"pos"\|null` | `"cd"\|"pos"` (null 없음) | `"cd"\|"pos"` (null 없음) | ⚠️ 타입 불일치 |
| customer_flow.phone | `string\|null` | 동일 | 동일 | ✓ |
| tender.method | `"cash"\|"card"\|"qris"` | 동일 | — | ✓ |
| stock_location_id (POS body) | 필수 조회 키 | — | 필수 (`CustomerFlowActionInput`) | ✓ |

`source` 타입 불일치: state=none 구간에서 source 필드를 CD/POS 화면 로직이 직접 사용하지 않아 **기능 블로커 아님**. 짝 PR에서 null 허용으로 맞추기 권장.

---

## 버그 재현 경로 2개 — 차단 여부

### (a) 손님이 번호 OK → POS 칩이 계속 "입력 중"

**차단됨 ✅**

이전: CD가 구 `link-phone` 엔드포인트에 번호 전송 → 서버 phone_entry_state 업데이트 지연·불일치 → POS 칩 갱신 없음.

현재:
1. CD ConfirmPanel → `confirm` 액션 → 서버 `confirming → confirmed` DB 저장
2. POS 다음 snapshot poll → `customer_flow.state = 'confirmed'`
3. `classifyCustomerFlowChip('confirmed')` = `'confirmed'`
4. `CustomerFlowChip` → "✓ \<phone\> · IDR \<balance\>"

### (b) OK 뒤 손님화면이 주문내역(입력 버튼)으로 되돌아감

**차단됨 ✅**

이전: CD 앱이 번호 OK 후 phone_entry_open=false 로 꺾여 → 다음 polling 에서 order-list(입력 버튼 있는 화면)로 복귀.

현재: `selectCdView(phase, flowState)` 는 `state ≠ 'none'` 인 한 `order-list` 반환하지 않음. entering → confirming → confirmed 전 구간 PhoneFlowScreen 유지. CD가 order-list로 돌아가는 경우: `state = 'none'` 뿐.

---

## 로컬 실기 (§4)

**미검증** — 이유:

1. `storeport` 로컬은 main 브랜치 (`0349d5f`, M3-1125-Q), `feat/M0-1125-R-cd-sync-server` 는 원격에만 존재
2. DB migration (`Migration20261125000001`) 적용 필요 — 로컬 Postgres 세팅 필요
3. CD 앱 `feat/M1-1125-U` 브랜치 웹 빌드 별도 필요
4. 태스크 `[BUILD]` = "리뷰만. 코드 수정 금지." 범위로 로컬 스택 구동 외

대신: 92 unit tests(transitions 58 + orchestrator 12 + DTO 12 + pb1 4) + 13 vitest(postCdFlowAction) + 4 Playwright(live route) 가 같은 start_entry → submit_phone → confirm 왕복을 커버.

---

## 비블로커 종합

| PR | 항목 | 권장 |
|---|---|---|
| #445 | `CustomerFlow.source` null 허용 계약 명시적 | — (서버는 이미 올바름) |
| #446 | `source: "cd"\|"pos"\|null`로 CD 타입 맞춤 | 권장 |
| #266 | `CustomerFlowActionResult` ok:false `customer_flow: CustomerFlow \| null` | 권장 |
| #266 | `LinkCustomerSheet` `stockLocationId ?? ''` 폴백 guard | 선택적 개선 |
