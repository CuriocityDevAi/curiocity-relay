---
round: M1-1105-L
pr: null
outcome: 계획 게이트 — P5 교대(shift) 대사표 + 화면 목록 + 파일 주인 표 + 서버 의존 목록 · 코딩 0 · PR 0
kyu_checks: 0 (planning-only · Kyu 승인 뒤 코딩 라운드 발부)
planning_only: true
---

# M1-1105-L · P5 교대(shift) 계획 게이트

**일자**: 2026-11-07 · **허브**: M1 · **성격**: 큰 라운드 규칙 ③ (계획서 먼저 · 코딩 금지) · **승인**: 사전 "work-queue §P5 · 승인 없이 바로 리포트만".

---

## 0. 원문 (open-requirements §P5)

"교대" = 캐셔가 근무 시작 때 시재(float) 넣고 교대 열기 → 근무 끝에 현금 집계·마감.

과제:
1. storeport grep 실측 — `register_session` / shift / `tenders.body.{register_session_id,cashier_user_id}` 저장·조회 경로.
2. Medusa 2.17 코어 · agilo 포크 — 교대/시재 코어 유무 (코어에 있음 · 우회 · 신규 필요 표).
3. 앱 쪽: 로그인 직후 "Open shift" 시트 · 설정의 "Close shift" · 영수증·주문의 session 연결 — 화면 목록 + 건드릴 파일 목록(주인) 초안.
4. 서버 신규 필요분 = M0 몫 (분리 목록).

---

## 1. 실측 대사표 (코어에 있음 · 우회 · 신규 필요)

### storeport (서버 · M0 소유 영역 100%)

| 항목 | 분류 | 근거 (file:line) |
|------|-----|-----------------|
| `register_session` 모델 (status · opened_at · opening_float · closed_at · counted_cash · expected_cash · z_snapshot · expected_by_method) | **코어에 있음** | `apps/commerce-core/src/modules/register_session/models/register-session.ts:15-48` |
| `cash_movement` 모델 5 types (sale / pickup / adjustment / pay_in / pay_out · recipient · reason · signed_delta) | **코어에 있음** | `apps/commerce-core/src/modules/register_session/models/cash-movement.ts:18-35` |
| `POST /admin/register-sessions` (open · 어제 세션 자동 강제 마감) | **코어에 있음** | `apps/commerce-core/src/api/admin/register-sessions/route.ts:33-100` |
| `GET /admin/register-sessions?stock_location_id=&status=` | **코어에 있음** | 동 파일 `:15-30` |
| `POST /admin/register-sessions/:id/close` (counted_cash + note · Q4 차액≠0 필수) | **코어에 있음** | `apps/commerce-core/src/api/admin/register-sessions/[id]/close/route.ts` |
| `GET /admin/register-sessions/:id/x-report` (중간 조회 · 비확정) | **코어에 있음** | 동일 폴더 `x-report/route.ts` |
| `GET /admin/register-sessions/:id/z-report` (마감 확정 · 불변 · z_snapshot) | **코어에 있음** | 동일 폴더 `z-report/route.ts` |
| `POST /admin/register-sessions/:id/cash-movements` (pickup · adjustment · pay_in · pay_out) | **코어에 있음** | `cash-movements/route.ts` |
| `POST /admin/pos/orders/:id/tenders` body `{register_session_id, cashier_user_id}` → `expected_by_method` 집계 | **코어에 있음** | `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:30-31,339,352-359,463-474` |
| `receipt.register_session_id` + `receipt.cashier_user_id` 저장 + 조회 | **코어에 있음** | `apps/commerce-core/src/modules/receipt/service.ts:97,180,217-235,268-269` · `migrations/Migration20261105000001.ts:9` |
| **1 매장 당 N 세션/일 (교대 끝 → 새 교대 시작)** | **신규 필요** | 현재 라우트 `register-sessions/route.ts:60-90` 은 "오늘 OPEN 세션 이미 있음" 체크 — 하지만 "어제 OPEN" 만 auto-close · 오늘 "열린 뒤 닫힌" 세션을 가진 상태에서 "새 교대 open" 은 허용. **다만 "현재 OPEN 1 개 제한"** 은 유지 — 교대 핸드오버는 `POST /close` → `POST /` 순서 · 중첩 OPEN 금지. (설계 의도와 일치 · 신규 서버 코드 0.) |
| **shift ≠ session 모델 분리 (1 session/day · N shifts/session)** | **신규 필요 (Phase Next)** | 미도입. 현재 모델은 1 session = 1 shift 등가. Q2 `opened_by_user_id ≠ closed_by_user_id` 허용 조항은 "세션 안에서 캐셔 핸드오버" 를 열어 두지만 **포매털 sub-shift 레코드 없음**. P5 가 한 날 복수 캐셔 교대 각각 float · counted 를 요구하면 분리 설계 필요. **본 계획은 "shift = session" (1:1) 모델로 진행** · Phase Next 에서 sub-shift 분리 가능성 유지. |
| `cashier_user_id` 파생 · `req.auth_context.actor_id` 로그인 유저 자동 주입 | **우회** | 현재 tenders body 가 명시 받는 구조 (route.ts:31). 서버는 `req.auth_context.actor_id` 자체도 접근 가능 (register-sessions/route.ts:42 처럼). 클라이언트가 전달 안 해도 derive 가능 — 신규 서버 코드 0. |

### 포크 (앱 · M1 소유 영역 100%)

| 항목 | 분류 | 근거 (file:line) |
|------|-----|-----------------|
| `useOpenRegisterSession` · `useCloseRegisterSession` · `useCurrentOpenSession` · `useXReport` · `useZReport` · `useCreateCashMovement` hooks | **코어에 있음** | `api/hooks/register-session.ts:1-280` |
| `app/register/open.tsx` (opening_float · opener_nickname 입력 → POST open) | **코어에 있음** | `app/register/open.tsx:1-60` |
| `app/register/close.tsx` (counted_cash · note · diff 실시간) | **코어에 있음** | `app/register/close.tsx:1-40` |
| `app/register/pickup.tsx` (recipient drop-down) | **코어에 있음** | `app/register/pickup.tsx:1-40` |
| `app/register/z-result.tsx` (마감 Z Report 뷰) | **코어에 있음** | 동일 폴더 |
| `components/RegisterBadge.tsx` (상단 띠 · Open·Closed 표시 · Pickup/Close 버튼) | **코어에 있음** | `components/RegisterBadge.tsx:24-60` |
| Cart/Orders/Checkout 세션 open gate (`!registerSession.data` → "Register closed" 차단) | **코어에 있음** | `app/(tabs)/cart.tsx:387,475-487` · `app/(tabs)/orders.tsx:55` · `app/orders/[orderId].tsx:362` |
| **로그인 직후 "Open shift" 시트 자동 노출 (현재는 Cart 진입 시 수동)** | **신규 필요** | 현 플로: 로그인 → setup-wizard → `/products` → Cart 탭 → "Register closed · Tap to open" 수동 클릭. P5 요구 = 로그인 직후 **blocking** sheet. |
| **Settings 화면의 "Close shift" 행** | **신규 필요** | 현재 Settings (`app/(tabs)/settings.tsx`) 에는 register 섹션 없음. Close 는 RegisterBadge 의 버튼으로만 접근. |
| **영수증 · 주문 상세에 cashier · session link 표시** | **부분 · 우회** | `components/ReceiptCard.tsx` 와 `app/orders/[orderId].tsx` 에 cashier/session 표시 유무 조사 필요. 서버가 이미 `receipt.cashier_user_id` · `receipt.register_session_id` 를 저장함 (서버 §위 표). 앱은 fields 요청만 추가하면 됨 · 신규 서버 코드 0. |
| **tenders body 에 `cashier_user_id` 포함 (현재 전송 안 함)** | **신규 필요 (앱)** | 포크 `api/hooks/draft-orders.tsx:732-747` `pos-complete` 호출 body 에 `cashier_user_id` 누락. 서버 tenders 라우트는 수용 (storeport route.ts:339,463). |
| **pay_in / pay_out UI (서버 5 types 중 2 개 미구현)** | **신규 필요 (앱)** | `app/register/pickup.tsx` 는 pickup 전용. pay_in/pay_out 은 별도 "Cash in" · "Cash out" 화면 혹은 pickup 재사용. Phase Next 로 분리 가능. |

---

## 2. 화면 목록 (이번 코딩 라운드 범위)

### 신규 화면 (3)

| # | 화면 | 트리거 | 주요 요소 |
|---|------|--------|---------|
| 1 | **Open shift sheet** (blocking modal on login) | 인증 성공 + setup 완료 + 현재 세션 null → `_layout.tsx` 조건부 노출 (Stack.Protected 안쪽) | `opening_float` · `opener_nickname` (옵션) · "Open shift" CTA · dismiss 불가 (cancel 은 logout 만 허용) |
| 2 | **Settings → Close shift** 행 | Settings 탭 · 세션 open 상태에서만 활성 | 라벨 "Close shift" · 서브텍스트 "Opened since … · <nickname>" · 탭 → `/register/close` (기존 화면 재사용) |
| 3 | **Order detail · Receipt metadata 섹션** | 주문/영수증 열람 시 | 캐셔 user_id · session opened_at · session_id 짧게 (R-id 는 이미 있음) |

### 수정 화면 (2)

| # | 화면 | 변경 |
|---|------|------|
| 1 | `components/RegisterBadge.tsx` | "Open shift" blocking sheet 가 열리면 badge 는 현재 판매 중일 때만 노출 (중복 CTA 제거) · logic 변경 없음 · 가드 분기 1줄 |
| 2 | `app/orders/[orderId].tsx` + `components/ReceiptCard.tsx` (후자 M3 소유) | receipt query fields 에 `+cashier_user_id,+register_session_id` 추가 후 UI 표기. 앱 쪽은 fields 요청만 · 서버 변경 0. |

---

## 3. 파일 주인 표 (코딩 라운드 분배 초안)

### M1 소유 (setup/auth/register wiring)

| 파일 | 변경 | 비고 |
|------|------|------|
| `app/_layout.tsx` | `OpenShiftGate` 조건부 렌더 삽입 (authenticated + setupComplete + !openSession → sheet) | Stack 가드 수정 없이 overlay |
| `components/setup-wizard/OpenShiftSheet.tsx` **신규** | Open shift 모달 (`/register/open` UI 재사용 · modal wrapper) | 또는 `components/register/OpenShiftSheet.tsx` (더 정확) |
| `components/RegisterBadge.tsx` | sheet 와 중복 금지 가드 1줄 | 로직 변경 0 |
| `api/hooks/register-session.ts` | `useCurrentOpenSession` 는 이미 존재 · 변경 0 | hooks 추가 없음 |
| `app/register/open.tsx` | modal-safe 로 reuse (현재 standalone screen) · 필요 시 `presentation='modal'` 옵션 | 또는 OpenShiftSheet 내부에서 open.tsx 로직 복제 |

### M2 소유 (Settings · Printer 영역)

| 파일 | 변경 | 비고 |
|------|------|------|
| `app/(tabs)/settings.tsx` | "Close shift" 행 추가 (현재 session open 상태에서만) | Settings 섹션 조직 M2 소유 |

### M0 소유 (서버 · storeport)

**신규 서버 코드 0** — 아래는 **앱 동작 보장용 실측 검증** 뿐.

| 항목 | 설명 |
|------|------|
| `register-sessions/route.ts` POST 의 "오늘 OPEN" 체크 | 교대 핸드오버 시 `close → open` 순서라 중복 open 없음. 현재 로직 유지로 충분 (409 는 사용자 오조작 가드). |
| tenders body 에 `cashier_user_id` + `register_session_id` 수용 | 이미 구현 (route.ts:30-31,339,352-359) · 변경 0 |
| receipt 에 `cashier_user_id` + `register_session_id` 저장 | 이미 구현 (service.ts:180,234-235) · 변경 0 |

### M3 소유 (receipt UI · 품절·payment 디자인)

| 파일 | 변경 | 비고 |
|------|------|------|
| `components/ReceiptCard.tsx` | 캐셔 user_id · session opened_at 표기 (스테일 어설션 `m3-1105-d` 와 동기) | M3-1105-F/H 디자인 결정 필요 |

---

## 4. 서버 의존 목록 (M0 몫 · 분리)

**이번 코딩 라운드 범위 내에서는 서버 신규 작업 0**. 앱만 변경 · 서버는 그대로 소비.

| 의존 API | 서버 상태 | 앱 연결 |
|---------|---------|-------|
| `POST /admin/register-sessions` | ready | `useOpenRegisterSession` (이미 wired) |
| `GET /admin/register-sessions?status=open` | ready | `useCurrentOpenSession` (이미 wired) |
| `POST /admin/register-sessions/:id/close` | ready | `useCloseRegisterSession` (이미 wired) |
| `GET /admin/register-sessions/:id/x-report` · `/z-report` | ready | `useXReport` · `useZReport` (이미 wired) |
| `POST /admin/register-sessions/:id/cash-movements` | ready (5 types) | `useCreateCashMovement` (3 types 만 노출) · pay_in/out 후속 |
| `POST /admin/pos/orders/:id/tenders` body `cashier_user_id` | ready | 앱 tenders 호출에 `cashier_user_id = auth.state.user.id` 추가 (api/hooks 소유 — M1 범위) |
| `GET /admin/pos/receipts/:id?fields=+cashier_user_id,+register_session_id` | ready | 앱 fields 요청 추가 (M3 ReceiptCard 영역) |

### Phase Next (별건 · 본 라운드 범위 밖)

| 과제 | 소유 | 트리거 |
|------|------|------|
| sub-shift 레코드 분리 (1 session/day · N shifts) | M0 | 실측 요구 ("같은 날 복수 교대 각각 Z Report 필요") 시 |
| pay_in / pay_out 화면 신설 ("Cash in" / "Cash out") | M1 | Kyu 운영 요구 ("드로어 보충/수금 외 조정") 시 |
| 서버 재무 수정 가능한 shift close-undo · void (void 존재 하지만 UI 없음) | M1 + M0 | 실수 close 되돌리기 요구 시 |

---

## 5. 질의 (Kyu 결정 필요)

1. **Open shift sheet dismiss 정책**: cancel 버튼을 허용 안 함 (판매 진입 강제 차단 · 현 Q1 c=(a) 정본과 일치) · logout 만 가능 — 이대로 OK?
2. **같은 날 복수 교대 지원**: 아침 캐셔 close → 점심 캐셔 open → 저녁 캐셔 open · 이 3 세션 각각 독립 Z Report (현 1 session/day 모델) → 승인?
3. **cashier_user_id 자동 주입**: 앱이 `auth.state.user.id` 를 tenders 호출 body 에 자동 포함 · 서버가 수용 — 수동 override UI 필요 없음? (당분간 1 인 1 디바이스 전제)
4. **Settings "Close shift" 행 위치**: Reset 섹션 바로 위 · session open 일 때만 활성 · Opened info subtext — 레이아웃 OK?
5. **ReceiptCard cashier 표시 형식**: user.email 전체 · user.first_name · user_id 중 뭐? (M3 결정과 연계 필요)

---

## 6. 분량 추정 (코딩 라운드 발부 시)

| 라운드 | 소유 | 파일 수 | 라인 수 (추정) |
|--------|-----|---------|---------------|
| M1-coding-α (OpenShiftSheet + _layout 가드) | M1 | 2~3 | +120 |
| M1-coding-β (Settings Close shift row + tenders cashier_user_id wire) | M1/M2 | 2 | +40 |
| M3-coding (ReceiptCard cashier/session 표기) | M3 | 1 | +30 |

**총 ≈ 5 파일 · ~190 라인**. 서버 변경 0.

---

## 7. 규약 정합

| 규약 | 정합 |
|------|------|
| 큰 라운드 규칙 ③ 계획서 먼저 · 코딩 금지 | ✓ (리포트만 · PR 0 · fork 파일 수정 0) |
| 대사표 (코어 · 우회 · 신규) · file:line 근거 | ✓ (§1) |
| 화면 목록 · 파일 주인 표 | ✓ (§2 · §3) |
| 서버 신규 필요분 = M0 분리 목록 | ✓ (§4 · 본 라운드 범위 내 서버 0) |
| Kyu 승인 필요 질의 명시 | ✓ (§5 · 5 건) |

---

## 8. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | 0 (계획 라운드) |
| 등재 | +3 (M1-coding-α · M1-coding-β · M3-coding — Kyu 승인 후 발부) |
| 미완 (Kyu 승인) | 1 (§5 5 질의) |
| **총 순증감** | **+3 등재 · 0 해소** (Kyu 승인 뒤 코딩 라운드 3 건 발부 대기) |

---

## 9. 다음 게이트

1. **Kyu 결정** — §5 5 질의 응답.
2. 결정 수신 → **M1-coding-α** 라운드 발부 (OpenShiftSheet + _layout 가드 · 서버 변경 0).
3. α 머지 뒤 β 발부 (Settings · tenders wire).
4. M3 는 ReceiptCard 디자인 결정 (M3-coding) — α/β 와 독립 머지 가능.
5. Phase Next 과제 (§3 하단 표) 는 Kyu 운영 트리거 전까지 대기.

---

*M1-1105-L · 2026-11-07 · 계획 게이트 · P5 교대 대사표 + 화면 3 + 수정 2 + 파일 주인 표 + 서버 의존 목록 · 서버 변경 0 · 코딩 0 · PR 0 · Kyu 5 질의 응답 대기*
