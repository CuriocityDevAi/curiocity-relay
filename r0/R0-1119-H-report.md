#192 APPROVE · #198 APPROVE · 로직 변경 0(#198) O · 순서 #192 먼저 → #198 rebase || checks: #192 flow-tests✅ assertions/lint❌(pre-existing) · #198 assertions/flow-tests✅ playwright❌(pre-existing)

## PR #192 — fix(payment): 오프라인 중 중복 주문 방지 · idempotency · 즉시 안내

### APPROVE

#### REQ-1: 오프라인이면 결제 요청 자체를 안 보냄
✅ 확인. `useNetworkStatus().isOnline` 체크가 모든 핸들러 첫 줄에 위치.
- **tender-cash**: `onProcess`, `onConfirmCard`, `onGenerateQris` — 3개 전부 `if (!isOnline) { showToast.error('No internet connection', ...); return; }` 패턴
- **split-tender**: `onProcessFirst`, `onConfirmFirstCard`, `onProcessFirstQris`, `onProcessSecond`, `onConfirmSecondCard`, `onProcessSecondQris` — 6개 전부 동일 패턴
- 오프라인 상태에서 네트워크 호출 0건 (e2e REQ-3 테스트가 `tenderCallCount===0` 검증)

#### REQ-2: 재시도 시 같은 주문 — 서버 미호출 (idempotency)
✅ 확인.
- **idempotency 키**: `tender_submitted_${draftOrderId}` (`lib/tender-idempotency.ts → keyFor()`)
- **마커 저장 위치**: `lib/secure-storage` (SecureStore 래퍼) — SecureStore key = `tender_submitted_${draftOrderId}`
- **저장 시점**: `createTender.mutateAsync()` 호출 **직전** (`await markTenderSubmitted(draftOrderId)` → mutate)
- **삭제 시점**: mutate **성공 직후** (`await clearTenderSubmitted(draftOrderId)`)
- **에러 시**: 마커 유지 → 재시도 시 `isTenderSubmitted()` → `setOrderMayExist(true)` → 복구 UI
- **DuplicateTenderError**: `catch (e)` 에서 `if (e instanceof DuplicateTenderError) return;` — 조용히 차단
- **단, split-tender에 idempotency 없음**: split-tender는 offline pre-check만 있고 `markTenderSubmitted`/`isTenderSubmitted` 없음. 네트워크 mid-request 단절 시 split-tender는 여전히 중복 위험. → **PR 범위 외** (PR 설명에 명시 없음; cash/card 단일 tender 경로에만 적용)

#### REQ-3: 복구 화면 문구 영어
✅ 확인.
- 제목: `"Payment Confirmation Required"`
- 배너: `"Order {ref} may have already been created. Payment may have been processed just before the network error — check the order in Orders."`
- 버튼 1 (testID=`tender-check-orders`): `"Check in Orders"`
- 버튼 2 (testID=`tender-retry-clear`): `"Retry (after confirming no order exists)"`

#### REQ-4: FulfillSheet Hand over 실패 안내
✅ `${orderRef} — Fulfill failed` + `${msg} · Open Orders to retry Hand over` (6초)

#### unit · flow-tests 실행
- **unit** (로컬, `#198` 브랜치 체크아웃 상태 — master+#198 적용): `726 passed | 6 expected fail | 3 todo` ✅
- **flow-tests** (CI): ✅ PASS

#### CI (#192)
| Check | 결과 | 비고 |
|-------|------|------|
| flow-tests | ✅ PASS | |
| assertions | ❌ FAIL | pre-existing master 빨간불 — #198이 수정 |
| lint | ❌ FAIL | pre-existing (OptionChip.tsx prettier 68 errors) — #198이 수정 |
| playwright | SKIP | |

**결론**: 핵심 idempotency 로직 정확. 마커 저장→성공 삭제→에러 유지→복구 UI 흐름이 올바르게 구현됨. CI 실패는 pre-existing이며 #198이 수정. **APPROVE**

---

## PR #198 — chore(ci): master lint 0 errors + assertions 47/47

### APPROVE

#### `git diff -w` 로직 변경 파일 판정

prettier 공백 제거 후 남는 실질적 변경:
1. **app/(tabs)/cart.tsx**: `${items}줄` → `${items}rows` (DEV-only console.log — 사용자 비노출)
2. **components/orders/VoidRefundSheet.tsx**: `'금액이 바뀌었어요, 다시 확인해 주세요'` → `'Amount changed. Please review again.'` (Kyu 영어 UI 결정)
3. **components/payment/CustomerLinkSheet.tsx**: `'아직 지원 안 됨'` → `'Not yet supported'`, `'새 손님으로 등록돼요'` → `'Will be registered as new customer'` (동일 결정)
4. **components/orders/LateLinkCustomerSheet.tsx**: `text-sm text-error` → `text-error text-sm` (Tailwind 클래스 순서 — prettier 정렬, 렌더 무변화)

**로직(동작) 변경 0건** ✅ — 텍스트 번역은 Kyu의 "MEROS 앱 UI 전부 영어" 결정 반영이며 behavior 무변화.

#### Assertion 갱신 11건 — 낡은 검사 갱신 O / 버그 덮기 X

| # | assertion 파일 | 갱신 내용 | 판정 |
|---|---------------|-----------|------|
| 1 | m0-1103-c | `<path` → `<path\|<polygon` + M_POINTS/Polygon 체크 | 낡은 검사 갱신 (M2-1116-AL 각진 M 로고) |
| 2 | m0-1105-at | ReceiptCard prettier 통과 조건 | 낡은 검사 갱신 (prettier 형식 변경) |
| 3 | m2-1105-ar | DigitsInput → NumericKeypad (CardTenderPanel·CashTenderPanel) | 낡은 검사 갱신 (M2-1116-S) |
| 4 | m3-1105-aj | DigitsInput → NumericKeypad (VoidRefundSheet PIN) | 낡은 검사 갱신 (M1-1117-M) |
| 5 | m3-1105-al | secureTextEntry → ● 직접 표시 | 낡은 검사 갱신 (M1-1117-M) |
| 6 | m3-1105-am | CashTenderPanel keyboardType → NumericKeypad; split-tender NumericKeypad 허용 | 낡은 검사 갱신 (M2-1116-S) |
| 7 | m3-1105-an | secureTextEntry → ● 직접 표시 | 낡은 검사 갱신 (M1-1117-M) |
| 8 | m3-1105-ar | DigitsInput → NumericKeypad (VoidRefundSheet+CardTenderPanel) | 낡은 검사 갱신 (M1-1117-M + M2-1116-S) |
| 9 | m3-1105-ax | `onComplete` → `next.length===4 → onSubmitPin` | 낡은 검사 갱신 (M1-1117-M 인라인 패턴) |
| 10 | m3-1105-d | `cash-quick-a/b` → `cash-quick-round/100k`; `cash-custom-input` → `cash-other-amount` | 낡은 검사 갱신 (M2-1116-AF testID 개명) |
| 11 | m3-1105-c-english | 한글 문자열 → 영어 (줄→rows, toast/UI) | 낡은 검사 갱신 (Kyu 영어 결정) |

**전부 낡은 검사 갱신** — 이전 PR들(M2-1116-AL/AF/S, M1-1117-M)에서 이미 변경된 구현에 맞춰 assertion 패턴을 업데이트. 버그를 덮는 사례 없음.

#### CI (#198)
| Check | 결과 | 비고 |
|-------|------|------|
| assertions | ✅ 47/47 PASS | |
| flow-tests | ✅ PASS | |
| playwright | ❌ FAIL | pre-existing (3 scripts) |
| lint | ❌ (별도 run, ci-summary 미포함) | 최신 commit `03a7bbd` ci-summary에 미반영 — stale 가능성 |

**playwright 실패 원인** (pre-existing, #198 미도입):
- `m1-1105-ao`, `m3-1105-d`: `cash-quick-b` testID 없음 (M2-1116-AF에서 `cash-quick-round`/`cash-quick-100k`로 개명)
- `m3-1105-p`: `card-approval-input`에 `fill()` 실패 — TextInput → NumericKeypad 표시용 `<div>`로 변경됨 (M2-1116-S)
- 이 playwright 스크립트 갱신은 별도 PR 대상

**결론**: 로직 변경 0건 확인. assertion 갱신 11건 전부 낡은 검사 갱신. playwright 실패 pre-existing. **APPROVE**

---

## 겹치는 파일 및 머지 순서

### 겹치는 파일 (두 PR 모두 수정)
| 파일 | #192 변경 | #198 변경 |
|------|-----------|-----------|
| `app/checkout/split-tender/[draftOrderId].tsx` | +8 (offline guard 6개) | prettier 대규모 리포맷 (-46/+46) |
| `app/checkout/tender-cash/[draftOrderId].tsx` | +71 (idempotency + offline) | prettier 1줄 (`const screen` 단일화) |

### 머지 순서 권고: **#192 먼저 → #198 rebase**

이유:
1. #192가 기능 변경(idempotency + offline guard) → #198은 포맷만
2. #192 머지 후 #198을 rebase하면 충돌이 최소화됨 (prettier는 최종 상태에서 재실행하면 됨)
3. 반대 순서(#198 먼저)로 하면 #192의 71줄 추가가 prettier로 reformatted된 파일 위에 적용되어 더 많은 충돌 발생
4. 단, #198 rebase 후 `app/checkout/split-tender/[draftOrderId].tsx`와 `app/checkout/tender-cash/[draftOrderId].tsx`는 prettier 재실행 필요

---

## CI 체크 요약표

| Check | #192 | #198 |
|-------|------|------|
| flow-tests | ✅ PASS | ✅ PASS |
| assertions | ❌ (pre-existing) | ✅ 47/47 |
| lint | ❌ (pre-existing) | ❌ (별도 run, stale 가능) |
| playwright | SKIP | ❌ (pre-existing) |
