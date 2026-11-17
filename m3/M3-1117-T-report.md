# M3-1117-T 리뷰 보고서

fork #187 · storeport #337 · storeport #334 각각 APPROVE · 문제 0건

---

## fork #187 — CuriocityDevAi/agilo-medusa-pos-fork PR #187

### 결론: APPROVE

### 체크리스트

| 항목 | 결과 |
|---|---|
| 계약 `POST .../checkout-snapshot` body `{ register_session_id, stage: "cart" }` | ✅ |
| stage 없을 때 하위 호환 (`body: stage ? { ..., stage } : { register_session_id }`) | ✅ |
| 디바운스 300ms (`setTimeout(..., 300)` + `timerRef` 취소) | ✅ |
| temp ID 제외 (`filterConfirmedItems` → `!item.id?.startsWith('__temp_')`) | ✅ |
| 세션 없으면 호출 0 (`resolveCartAction` → `!sessionId → null`) | ✅ |
| 서버 400 POS 영향 0 (`.catch(() => {})` in startSnapshot/cancelSnapshot) | ✅ |
| cart.tsx 미변경 (diff에 없음) | ✅ |
| cancelSnapshot 기존 존재 확인 (pos-loyalty.ts 전체 파일 검증) | ✅ |
| tsc 신규 오류 0 (모든 타입 캐스트 명시적, 에러 없음) | ✅ |

### 세부 메모
- `useCustomerDisplayCartSync` → `isMounted.current` skip 패턴으로 첫 마운트 시 불필요 호출 없음.
- `cartKey` 의존성 (`confirmedItems.id:qty + total`)은 충분한 변경 감지 커버.
- `startSnapshot`/`cancelSnapshot`은 `useCallback`으로 메모이즈 — deps 미포함 적절.

---

## storeport #337 — CuriocityDevAi/storeport PR #337

### 결론: APPROVE

### 체크리스트

| 항목 | 결과 |
|---|---|
| 계약 `POST .../checkout-snapshot` body `stage: "cart"\|"checkout"` | ✅ |
| stage 없을 때 → `"checkout"` (하위 호환) | ✅ |
| payment.captured → resolveOrderIdFromPaymentId (order-snapshot-paid.ts 수정) | ✅ |
| resolveOrderIdFromPaymentId 공유 모듈로 추출 (loyalty-earn-on-paid.ts 동일 사용) | ✅ |
| KEYPAD_OPEN 전이 (`currentScreen === "cart"` 조건부 → "keypad") | ✅ |
| onKeypad → `dispatch({ type: "KEYPAD_OPEN" })` index.tsx 연결 | ✅ |
| CTA Pressable 로 교체, `!isCartStage` 조건부 표시 (checkout 모드에서만 노출) | ✅ |
| 대기 복귀(Done 4초 · 3'30" · 건너뛰기) 미수정 — 기존 DONE_TIMER 로직 그대로 | ✅ |
| P-2 보류: E 규칙에 `\|\| snapshot.status === "cart"` 추가 | ✅ |
| 가로/세로: Pressable CTA 가 `isWide ? 88 : 64` 기존 반응형 유지 | ✅ |
| earn.ts 미변경 (`loyalty-earn-on-paid.ts`는 subscriber, `earn.ts` 라이브러리 별개) | ✅ |
| Migration 추가: CHECK constraint `'cart'` 포함 up/down 대칭 | ✅ |
| SnapshotStatus/OrderSnapshot 타입 "cart" 추가 (display-machine, types 일관) | ✅ |
| tsc 신규 오류 0 | ✅ |

### 세부 메모
- `resolveOrderIdFromPaymentId` 공유 추출로 loyalty-earn-on-paid.ts, order-snapshot-paid.ts 중복 제거 — 정상.
- cart status 에서 CartScreen CTA 숨김 → 고객이 직접 번호 입력 화면 넘어갈 수 없는 것이 의도된 설계 (POS 측이 checkout 호출해야 전환).
- display-machine test: KEYPAD_OPEN 비-cart 화면에서의 테스트명("screen unchanged") 이 오해 소지이나, `expect("cart")` 는 `main + checkout → cart` 정상 라우팅 결과이므로 테스트 로직은 정확.

---

## storeport #334 — CuriocityDevAi/storeport PR #334

### 결론: APPROVE

### 체크리스트

| 항목 | 결과 |
|---|---|
| 멱등(ref): `ref: "recover:${orderId}:${ref}"` — recover.ts 선단 early-return + addDebt 양쪽 중복 차단 | ✅ |
| 기존 uncollected 기록 유지: `nextEntries = [...prevEntries, { ... }]` 누적 append | ✅ |
| 손님 없는 주문: `!customerId → return { skipped_reason: "no_customer" }` (line ~137) 가 새 블록 앞에 위치 | ✅ |
| earn.ts 미변경 (diff에 없음) | ✅ |
| route 미변경 (diff에 없음) | ✅ |
| Non-fatal: try/catch — addDebt 실패 시 metadata.loyalty_recover 기록은 유지 | ✅ |
| LOYALTY_NEGATIVE_MODULE 미설치/장애 시에도 container.resolve throws → catch 흡수 | ✅ |
| tsc 신규 오류 0 | ✅ |

### 세부 메모
- `uncollected === 0` 이면 블록 자체 진입 안 함 (`if (uncollected > 0)`) — 충분한 잔액 케이스 장부 미호출 ✅.
- 테스트 "재시도 멱등": 2회차는 recover.ts 자체 entries 중복체크로 early-return, addDebt 미호출 — 2중 보호 구조 적절.
- `container.resolve(LOYALTY_NEGATIVE_MODULE) as any`: 타입 `any` 캐스트이나 주변 try/catch 로 안전.

---

*리뷰어: m3 (R0 감사 대행) · 2026-11-17*
