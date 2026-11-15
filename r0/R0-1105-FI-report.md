fork#146+#283: APPROVE(2건 세트) · #280: APPROVE(minor 1건) · fork#145: APPROVE · 머지순서: fork#145 → storeport#283 → fork#146 → storeport#280(독립)

---

## 명령 로그

```
cd agilo-medusa-pos-fork && npx vitest run              → 27 files, 307 passed | 6 xfail | 2 todo ✓
gh pr checks 146                                        → assertions/flow-tests/lint=pass, playwright=pending(정상)
gh pr checks 145                                        → assertions/flow-tests/lint=pass, playwright=pending
gh pr checks 283 (storeport)                            → customer-display/pos-integration/unit/check=pass ✓
gh pr checks 280 (storeport)                            → customer-display/pos-integration/unit/check=pass ✓
```

---

## fork #146 + storeport #283 (나눠결제 QRIS remaining + 성공 화면)

### remaining 계산 정확성

`remaining = grandTotal - firstResponse.amount` 는 세 시나리오 모두 맞다.

- **할인·세금·반올림 포함 주문**: `grandTotal` 는 `useOrderQuote`(SWR) → 서버 `computedGrand`에서 오므로 이미 포함된 값. `amount` 는 사용자가 지정한 1차 금액. `grandTotal - amount = remaining` 성립.
- **1차 QRIS 만료 후 재발행**: 재발행 응답도 같은 `amount` 를 반환하므로 계산 무변.
- **CASH/CARD 1차 경로 회귀**: CASH/CARD 단락 응답은 이미 `remaining = orderTotal - paidSoFarAfter` 로 정확히 반환. 앱 계산과 동치 → 회귀 없음.

**GET 재조회 1줄 판단**: GET 재조회가 더 안전(DB 권위값 사용)하나, 2차 tender 전송 시 서버 close-out 가드(`amount !== remainingBefore` → 400)가 mismatch 를 차단하므로 현재 앱-계산 방식도 허용 가능. 단 `grandTotal` stale(아이템 변경 경쟁) 시 2차 400 → 사용자 메시지 없이 막힘 위험이 소량 남음.

### paid_so_far 변경 vs close-out 가드 충돌 여부

가드(`tenders/route.ts:490`)는 `remainingBefore = orderTotal - paidSoFarBefore` 를 **DB activeTenders**(status ∈ captured·pending) 로 계산 — QRIS 응답값을 쓰지 않는다. QRIS 1차 pending 은 DB 에 pending 으로 존재하므로 2차 요청 시 `paidSoFarBefore` 에 포함 → `remainingBefore = orderTotal - qrisAmount`. 2차 가드 조건과 정확히 일치. **충돌 없음**.

### #69b 어설션 변경 정당성

기존 `expect(r2.data.remaining).toBe(50000)` 는 버그 상태(QRIS 2차 응답이 `paidSoFarBefore=0` 을 그대로 반환)를 테스트하고 있었다. storeport#283 수정 후 2차 QRIS close-out 응답은 `paid_so_far = paidSoFarBefore(50000) + amount(100000) = 150000`, `remaining = 0` 이 맞음. `0` 으로의 변경은 버그 수정 반영 — 정당.

### QrisConfirmedStep 화면

- **영어**: "1st payment complete" / "QRIS · {IDR}" / "Remaining for 2nd payment" / "Continue to 2nd payment" — 영문 전용 ✓
- **TOKEN_SUCCESS**: `constants/brand.ts:22` → `'#0E1B18'` (검정 ink). "success = ink 로 일원화" 팔레트 D1 결정 적용 ✓
- **결정 버튼**: `<Button>` 기본 `variant='solid'` → `bg-ink`(검정 배경·흰 텍스트) ✓

### vitest

```
27 files, 307 passed | 6 expected fail | 2 todo   ✓
```
`split-tender.test.ts`: 25개 통과(기존 21 + 신규 4). 신규 4 assertion:
- `grandTotal - qrisAmount = 100000` ✓
- 버그 서버 응답 써도 앱 계산 올바름 ✓
- fixture paid_so_far == amount ✓
- fixture remaining == grand_total - amount ✓

### storeport CI

`pos-integration(#69b 포함)=pass · unit-commerce-core=pass · check=pass` ✓

### 네이티브 의존

스타일·상태 로직 변경만 — RN native 모듈 신규 추가 없음 ✓

---

**PR 코멘트** (두 PR 동시 APPROVE)

**storeport#283** — `tenders/route.ts:1056`
> APPROVE. `paid_so_far = paidSoFarBefore + amount` 로 QRIS 단락 응답 정정 맞음. close-out 가드는 DB activeTenders 를 독립 계산하므로 충돌 없음. #69b assertion 50000→0 도 정당 (버그값 → 올바른 close-out 반영). unit/pos-integration CI pass ✓

**fork#146** — `app/checkout/split-tender/[draftOrderId].tsx:134`
> APPROVE. `remaining = grandTotal - firstResponse.amount` 는 할인·만료·Cash/Card 경로 모두 맞음. QrisConfirmedStep: TOKEN_SUCCESS(검정 ✓)·영문 ✓·solid 버튼(검정) ✓. vitest 307 pass. minor 1건: `grandTotal` 는 SWR 캐시 — 아이템 변경 경쟁 시 stale 가능성이 있으나 close-out 가드가 400 으로 차단하므로 blocking 아님.

---

## storeport #280 (S1c 정식 경로 + 페어링 보안 2건)

### 재시도 비멱등성 (커밋 후 커넥션 끊김)

`rawWithTransientRetry` 는 `Connection ended unexpectedly|ECONNRESET` 계열 에러에만 재시도. 문제: 커밋 완료 후 클라이언트 소켓 DROP 이 발생하면 `pg.raw()` 가 ECONNRESET 을 던지고 재시도 → `pair_code_attempts` 가 한 요청에서 2회 증가. 결과: 정상 사용자가 조기 lockout(pair_code = null) 가능.

**심각도**: minor — 커밋 후 소켓 DROP 은 µs 단위 타이밍이 맞아야 하는 드문 경우. 보안 우회(토큰 추가 발급)는 없고 UX 열화(재발급 필요)에 그침. 현재 비원자 fallback 보다 낫다. 미래 개선 방향: PostgreSQL `SAVEPOINT` 또는 idempotency_key 컬럼.

**지적 위치**: `service.ts:rawWithTransientRetry` + 호출부 `~:656`

### matcher 축소 → 기존 보호 경로 무인증 여부

현재 `/customer-display/*` 하위 라우트 전수:
- `/customer-display/pair` (인증 불필요 · 코드 소비) → 구 matcher도 unlessPath 로 제외, 신 matcher도 `/snapshots/*` 에 미해당 → 올바르게 제외 ✓
- `/customer-display/snapshots/[id]` → `/customer-display/snapshots/*` 에 해당 · 보호 유지 ✓
- `/customer-display/snapshots/active` → 동일 ✓
- 신규 `/customer-display/snapshots/[id]/link-phone` → 동일 ✓

**무인증 경로 발생 없음**. 단 향후 `/customer-display/something-not-snapshot` 추가 시 matcher 에 수동 추가 필요 — 주석에 명시돼 있음(L 503).

### 테스트 단정 완화 → 원자성 요구 약화 여부

약화 없음. 핵심 보안 불변식:
- `okCount ≤ 1` → 중복 토큰 발급 차단 ✓
- `serverErrorCount === 0` → 5xx 없음 ✓
- `okCount + limitCount + notFoundCount === 5` → 모든 요청 처리 완료 ✓

404 허용은 CTE 소비 후 pair_code=null 리셋된 뒤 뒤늦게 도착한 요청이 not_found 로 떨어지는 올바른 동작 반영. 이전에 이를 테스트 실패로 보게 하면 dead-socket 재시도(현 CI 하네스 환경) 에서 false negative 가 생김 — 완화 정당.

### safeEqualStrings 적용 범위

`device-token.ts` 에 `safeEqualStrings` 정의됨. 그러나 실제 비교 경로:
- `consumePairCode` atomic path: SQL `WHERE pair_code = ?` 비교 (상수시간 아님)
- `verifyDeviceToken`: M0-1105-CQ 에서 safeEqualStrings double-check 추가했으나 `listRegisterSessions` 가 `device_token_hash` 를 엔티티에 반환 안 해 항상 false → 401 regression → 본 PR 에서 제거. SQL WHERE 가 평문 동치를 보장하므로 중복 비교 불필요 주석 처리.

**평가**: SQL hash 비교는 DB 왕복 레이턴시가 타이밍 신호를 압도해 실용적 timing attack 불가. 보안 약화 없음. 단 R0-2 의도(코드 `safeEqualStrings` 적용)가 실제로는 달성되지 않음을 명시적으로 인식.

### CI

`customer-display=pass · pos-integration=pass · unit-commerce-core=pass · markers-and-forbidden=pass · check=pass` ✓

---

**PR 코멘트**

**storeport#280** — APPROVE

`service.ts:rawWithTransientRetry` 호출부(~L656):
> minor: `rawWithTransientRetry` 는 비멱등 UPDATE 를 재시도합니다. PG 커밋 성공 후 소켓 ECONNRESET 이 오면 `pair_code_attempts` 가 한 요청에서 2회 증가 → 정상 사용자 조기 lockout 가능성. 드문 케이스이고 보안 우회 아니나, 향후 idempotency key 컬럼으로 개선 여지 있음.

`middlewares.ts:514`:
> APPROVE. `/customer-display/snapshots/*` 로 축소해도 현재 보호 대상 경로 전부 커버됨 — `/pair` 는 원래 무인증, 나머지 2개 + 신규 1개 모두 `/snapshots/*` 하위. 신규 경로 추가 시 matcher 등록 명시 주석도 ✓

---

## fork #145 (결제수단 버튼 높이 약 2배)

### py-2 → py-6 변경 위치

`components/ui/OptionChip.tsx:49` 단 1곳. `variant === 'tab'` 조건 내 → 이 파일을 공유하는 모든 탭 화면에 자동 반영.

### 3화면 커버 확인

- 일반 결제 `tender-cash/[id]` → `PaymentMethodTabs` → `OptionChip variant="tab"` ✓
- 나눠결제 1차 `split-tender/[id]` FirstStep → `OptionChip variant="tab"` 직접 ✓
- 나눠결제 2차 `split-tender/[id]` SecondStep → `OptionChip variant="tab"` 직접 ✓

### 넘침 여부

padding-only 변경(px 고정 아이콘 크기 13→16 보조). `flex-1` 레이아웃 유지 → 텍스트 wrapping 위험 없음. 스크린샷 3장 커밋 확인(`06-payment-tabs-icons.png`, `02-split-step1.png`, `02-split-step2.png`).

### #146 과 파일 충돌 여부

- #145: `OptionChip.tsx`, `e2e/screenshots/02-*.png`
- #146: `split-tender/[draftOrderId].tsx`, `__tests__/split-tender.test.ts`

**코드 파일 충돌 없음**. 스크린샷 02-split-step1/step2.png 는 #145 만 변경, #146 미변경 → merge 충돌 없음.

**머지 순서 제안**: fork#145 → storeport#283 → fork#146 → storeport#280(독립·순서 무관)
- 이유: #145 먼저 머지해 베이스 UI 확정 후 #146 의 QrisConfirmedStep 추가, storeport 는 각 앱 PR 직전에 머지.

### CI

`assertions/flow-tests/lint=pass` ✓. Playwright pending 은 정상(앱 실행 환경 없음).

---

**PR 코멘트**

**fork#145** — `components/ui/OptionChip.tsx:49`
> APPROVE. `py-2→py-6` 1곳 변경으로 3화면 동시 반영 ✓. 스크린샷 3장 커밋 ✓. #146 과 파일 충돌 없음. 머지 순서: 이 PR 먼저 → 그다음 #146.
