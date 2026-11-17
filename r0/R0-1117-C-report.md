#167 APPROVE · #168 APPROVE

## 실행 환경
- pos-r0 브랜치: pr-62 (merge conflict → worktree로 체크아웃)
- worktree: /tmp/review-167 (fix/m3-1117-a) · /tmp/review-168 (fix/m3-1117-b)
- storeport #322 · #323: `gh pr diff --repo CuriocityDevAi/storeport` 로 직접 대조

---

## #167 M3-1117-A — APPROVE

### 테스트
- vitest: **38 files · 456 pass** (22 신규 m3-1117-a-phone.test.ts 포함)
- `npx expo export --platform web`: **Exported: dist** ✓
- tsc --noEmit: 기존 에러 무변화 (FlashList·global.css 등 pre-existing)

### [REQ 2a] storeport #322 API 계약 대조

| 항목 | storeport #322 | fork #167 | 결과 |
|------|----------------|-----------|------|
| POST 경로 | `/admin/pos/customers` | `sdk.client.fetch('/admin/pos/customers', ...)` | ✓ |
| POST body | `{ phone, email?, first_name?, last_name? }` | 동일 | ✓ |
| 200 response | `{ customer, created: false, filled: string[] }` | `PosCreateCustomerResponse` | ✓ |
| 201 response | `{ customer, created: true }` | 동일 | ✓ |
| 400 | `{ code: "invalid_phone" }` | `form.setError('phone', ...)` | ✓ |
| 409 | `{ code: "email_taken" }` | `form.setError('email', ...)` | ✓ |
| GET `/admin/pos/customers/search` | `q, limit, offset` params | `useInfiniteQuery` with URLSearchParams | ✓ |
| GET response | `{ customers, count, phone_normalized }` | `PosCustomer[]` cast | ✓ |

### [REQ 2b] 기존 번호 → 기존 손님 선택
- `onSuccess`에서 `!res.created` → `showToast.success('Existing customer found', { text2: masked })` ✓
- 400/409 필드 에러 처리 ✓
- **email 필수 규칙**: `z.email().min(3, 'Email is required')` → 현재 필수. Kyu 결정 대기 중. PR 코멘트에 명시함.

### [REQ 2c] 번호 칸 숫자패드
- `PhoneNumpadField` → `NumericKeypad` (#155 재사용) ✓
- `testID="add-customer-phone-numpad"` ✓
- 최대 15자리, 표시 `0813-1234-5678` 포맷 ✓

### [REQ 2e] 미변경 확인
- GitHub PR diff 기준 `api/hooks/draft-orders.tsx` 미포함 ✓
- `app/(tabs)/_layout.tsx` 미포함 ✓
- (참고: `git diff origin/master` 에는 나타나나 이는 master가 PR base 이후에 M1-1117-B를 받은 차이이며 PR 자체에는 없음)

### 머지 조건
storeport M0-1117-A (#322) 먼저 머지.

---

## #168 M3-1117-B — APPROVE

### 테스트
- vitest: **38 files · 446 pass** (신규 m3-1117-b-orders-search.test.ts 포함)
- `npx expo export --platform web`: **FAIL** — `SyntaxError: Unexpected token (66:3)` (pre-existing; `pr-62` 메인 브랜치에서도 동일 발생 → 본 PR 범위 외)
- tsc --noEmit: 기존 에러 무변화

### [REQ 2d] storeport #323 API 계약 대조

| 항목 | storeport #323 | fork #168 | 결과 |
|------|----------------|-----------|------|
| GET 경로 | `/admin/pos/orders-list` | `sdk.client.fetch('/admin/pos/orders-list', ...)` | ✓ |
| query params | `q, limit, offset` | `{ q: q.trim(), limit }` | ✓ |
| response shape (orders 배열) | 13 필드 명세 | `PosOrderRow` 13 필드 | ✓ |
| `customer_phone_masked` | `maskE164` → "0813-****-2480" | `string \| null` | ✓ |

### [REQ 2d] 검색어 有/無 분기
- q 없음 → `useOrders` 활성 (기존 목록) · `usePosOrdersList` disabled ✓
- q 있음 → `usePosOrdersList` 단독 활성 · `useOrders` disabled ✓

### [REQ 2d] setQueryData 캐시 오염 (#166 재발 여부)
- `usePosOrdersList` = `useQuery` 전용. 수동 `setQueryData` 없음 ✓
- 쿼리키 `['pos-orders-list', q.trim()]` ↔ `['orders', …]` 완전 분리 ✓
- `posOrderRowToAdminOrder`: 로컬 변환 함수, 캐시 미작성 ✓
- #166 형태 재발 불가

### [REQ 2e] 미변경 확인
- GitHub PR diff 기준 `api/hooks/draft-orders.tsx` 미포함 ✓
- `app/(tabs)/_layout.tsx` 미포함 ✓

### 머지 조건
storeport M0-1117-B (#323) 머지 + #167 머지 후.

---

## 미실행 항목
- iPad 실기 확인 (서버 M0-1117-A/B 배포 전으로 미실행 → 미검증)
- expo export PR #168: pre-existing 오류로 완료 불가 (별도 fix 필요)
