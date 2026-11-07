---
name: R0-1105-S · 허브-1107-S 재리뷰 relay
description: storeport #196 (M0-1105-P · 자동 draft→order 전환) + fork #50 (M1-1105-O · draft stale 안전망 + close z_report inline + opener_nickname) 둘 다 APPROVE · pair 설계 · 이중 전환/레이스 없음
author: R0
dated: 2026-11-07
---

# R0-1105-S · pair 리뷰 relay

**스코프**: 실기 피드백 뿌리 (결제 뒤 draft 미전환 → Orders 탭 ✗) 해소 pair.
- storeport #196 (M0-1105-P · 서버 자동 전환)
- fork #50 (M1-1105-O · 앱 안전망)

**정본**: storeport `32ab911` (#194 머지 후) · fork `cf78d22` (#48 머지 후).
**금지**: 코드 수정 · 커밋.

## 판정 요약

| PR | head | 판정 | 핵심 근거 |
| --- | --- | --- | --- |
| **storeport #196** (M0-1105-P) | `94a9f72` | **APPROVE** | section 7 이 capture/receipt/metadata 뒤 · 멱등 (non-draft skip) · 실패 non-fatal · preorder DP 첫 tender 에서 전환 · 통합 #1 이 `/admin/orders` 응답 `display_id` 포함 어설션으로 Kyu 실기 재현 · 로컬 13/13 PASS · 금지 영역 0 |
| **fork #50** (M1-1105-O) | `9e4158d` | **APPROVE** | 404 + `is_draft_order=false` + `status!=='draft'` 셋 다 stale 판정 · SecureStore delete + null (조용히) · close z_report inline (roundtrip -1) · opener_nickname 지원 · UI 변경 0 · merge clean |

**교차 판단 (한 줄)**: 서버 convert 멱등 가드 (`is_draft_order === true`) + 앱 로컬-only 가드 (SecureStore delete + null) + M3-1105-L 명시 clear 는 각자 자기 책임만 수행 · **이중 전환·레이스 없음**.

---

## ① storeport #196 · M0-1105-P

### Section 7 위치 + 설계

sections 1-6 (payment_collection → session → authorize → capture → register_session → receipt mint → receipt_id metadata) 뒤 · response 직전.

```typescript
// --- 7) Auto-convert draft → order
let converted = false;
let finalIsDraft = Boolean(order.is_draft_order);
if (order.is_draft_order === true) {
  try {
    await convertDraftOrderWorkflow(container).run({ input: { id: order_id } });
    converted = true;
    finalIsDraft = false;
  } catch (e) {
    console.warn(`[M0-1105-P] convertDraftOrderWorkflow failed (non-fatal · 결제 유지): ...`);
  }
}
```

| 축 | 구현 | ✓ |
| --- | --- | --- |
| 순서 (capture·receipt·metadata 뒤) | sections 1-6 뒤에 section 7 배치 | ✓ |
| 실패 시 결제 유지 (non-fatal) | try/catch + console.warn · 200 유지 + `converted:false` · payment/receipt 롤백 없음 (M0-1105-K 패턴 재사용) | ✓ |
| 멱등 (non-draft skip) | `if (order.is_draft_order === true)` 가드 · 이미 non-draft 면 skip · preorder 2차 tender · retender 안전 | ✓ |
| preorder DP 첫 tender 전환 | section 7 은 order_type 과 무관 · 통합 #3 명시 검증 | ✓ |

### 통합 #1 Kyu 버그 재현 가드

```typescript
const listRes = await api.get(`/admin/orders?fields=%2Bcustomer.*,%2Btotal,%2Bcurrency_code&order=-created_at&limit=50`, {...});
const displayIds = (listRes.data?.orders ?? []).map((o: any) => o.display_id);
expect(displayIds).toContain(row.display_id);
```

**버그 재현 유효성**: PR 전 코드에선 draft 가 `is_draft_order=true` 로 영구 잔존 · Medusa 2.17 `/admin/orders` 하드코딩 `is_draft_order: false` 필터로 제외 → 어설션 실패 · PR 후 section 7 이 전환 → 포함 → 통과. **실 Kyu 실기 (Order #30 missing in Orders tab) 를 1-to-1 재현** ✓

이전 테스트 helpers 가 completed order 로 만들어 이 버그 보이지 않던 것 — PR #196 가 `createTestOrder({ isDraft: true })` 옵션 추가로 실 P2 흐름 재현 ✓

### 응답 shape 확장

추가 필드:
- `converted: boolean` — 이번 호출에서 전환됐으면 true · skip 이면 false
- `is_draft_order: boolean` — 최종 상태

기존 필드 전부 유지 · additive · 프론트 호환성 유지 ✓

### 금지 영역

| 축 | 결과 |
| --- | --- |
| medusa-config 수정 | 0 ✓ |
| providers 수정 | 0 ✓ |
| package.json 수정 | 0 ✓ |
| `readFileSync` source add | 0 ✓ |
| 재고 차감 시점 (ADDENDUM §3 · fulfill route) | 미건드림 ✓ |

### 로컬 재현

```
PASS integration-tests/pos/tenders.spec.ts (16.428 s)
  ✓ #1 cash tender · [M0-1105-K] metadata.receipt_id · [M0-1105-P] draft→order auto-convert + Orders 목록 포함 (713 ms)
  ✓ #3 preorder with dp_percent=50 · [M0-1105-P] 첫 tender 에서 draft→order 전환 (542 ms)
  ✓ #10 [M0-1105-L] preorder DP → 잔금 수금 (converted:true DP · converted:false 잔금 · 멱등) (542 ms)
  ✓ #13 [M0-1105-P] non-draft order 에 tender → convert skip (970 ms)
  ... 9 others
Test Suites: 1 passed · Tests: 13 passed · Time: 16.48 s
```

Build PASS (backend 4.32s · frontend 16.58s) · merge-tree vs main clean (`4462e8b`).

---

## ② fork #50 · M1-1105-O

### `useCurrentDraftOrder` 안전망 (404 + is_draft_order=false 둘 다)

**404 경로** (기존 M0-1103-D · 유지):
```typescript
} catch (error) {
  if (isStaleDraftOrderError(error)) {
    console.warn('[M0-1103-D] current cart stale · discard · empty cart', { draftOrderId });
    await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);
    return null;
  }
  throw error;
}
```

**`is_draft_order=false` 경로** (신규 M1-1105-O):
```typescript
const response = await sdk.admin.draftOrder.retrieve(draftOrderId, { fields: '...' });
const draftOrder = (response as unknown as { draft_order?: Record<string, unknown> })?.draft_order ?? null;
const isDraftFlag = (draftOrder as { is_draft_order?: unknown } | null)?.is_draft_order;
const statusFlag = (draftOrder as { status?: unknown } | null)?.status;
const hasExplicitFalse = isDraftFlag === false;
const nonDraftStatus = typeof statusFlag === 'string' && statusFlag !== 'draft';
if (hasExplicitFalse || nonDraftStatus) {
  console.warn('[M1-1105-O] current cart converted to order · discard · empty cart', {...});
  await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);
  return null;
}
return response;
```

| 경로 | 조건 | 처리 |
| --- | --- | --- |
| 404 | `isStaleDraftOrderError(error)` | catch → SecureStore delete + null |
| 200 + `is_draft_order === false` | `hasExplicitFalse` | try 가드 → SecureStore delete + null |
| 200 + `status !== 'draft'` | `nonDraftStatus` | try 가드 → SecureStore delete + null |

**에러 토스트 없이 조용히 비움** ✓ · `console.warn` 만 · throw 없음 · react-query 가 null 캐시 → 카트 UI empty state.

`validateStoredDraftOrderId` (boot 시점) 에도 같은 가드 적용 — 앱 재시작 시 즉시 폐기 ✓

### Playwright 2 cases

- Case A `mode='404'`: 서버 404 → catch 분기
- Case B `mode='converted'`: 서버 200 + `is_draft_order:false, status:'pending'` → try 가드 분기

양 케이스 공통 어설션:
- (2b) DELETE /admin/draft-orders/:id 미호출 (**cancel 이 아님** · 로컬 삭제만) ✓
- (3) SecureStore draft_order_id 키 삭제됨 ✓
- (4) 빈 카트 UI "cart is empty" 문구 ✓
- (5b) 신규 console.error 0 (의도된 404 외) — **에러 토스트 안 뜸 검증** ✓

### close z_report inline (R0-1105-O ④ P3 ① 적용)

```typescript
export type CloseRegisterSessionResult = {
  register_session: RegisterSession;
  z_report: ReportSnapshot;
};
// 이전: return res.register_session · z_report 버림
// 지금: return res · z_report 포함
onSuccess: (result, variables) => {
  qc.setQueryData([...REGISTER_QK, 'z-report', variables.session_id], result.z_report);
  qc.invalidateQueries({ queryKey: REGISTER_QK });
},
```

storeport `close/route.ts:86` 응답과 1:1 일치: `res.json({ register_session, z_report })` · roundtrip -1 (z-report 별도 GET 불요).

### opener_nickname 지원 (R0-1105-O ④ P3 ② 적용)

```typescript
mutationFn: async (input: {
  stock_location_id: string;
  opening_float: number;
  sales_channel_id?: string;
  opener_nickname?: string;  // ← NEW
}) => { ... }
```

M1-1105-N OpenShiftSheet 의 `as any` cast 를 다음 라운드에서 제거 가능 (옵션 · 기능상 변화 없음).

### UI 변경 0

- `api/hooks/draft-orders.tsx` · `api/hooks/register-session.ts`: hook 로직 only · 직접 렌더 없음
- `app/register/close.tsx`: `then/catch` → `await/try-catch` 제어 흐름 refactor · Toast 문구 · router.replace path · form field **전부 그대로** ✓
- `scripts/m1-1105-o-playwright.mjs`: 신규 테스트 · UI 아님

### merge-tree 상태

`git merge-tree origin/master origin/feat/m1-1105-o-hooks-safety` → **clean** (`98779ab`) · 현 master `cf78d22` (#48 M1-1105-N 머지 후) 와 충돌 0 ✓

### 서버 의존성

- storeport #196 머지 전: 서버가 영원히 draft 상태 반환 → fork 가드 **unused path** · regression 없음
- storeport #196 머지 뒤: fork 가드 작동 · 서버 전환 완료 · "서버 전환 + 앱 안전망" 효과 발현

---

## ③ 교차 판단 (서버 #196 + 앱 #50 + M3-1105-L)

### 이중 전환?

- 서버 #196 `if (order.is_draft_order === true)` 가드 선행 · 두 번째 호출 시 `is_draft_order=false` → skip
- `convertDraftOrderWorkflow` 가 비멱등하더라도 가드 선행으로 호출 자체 차단
- **이중 전환 가능성 0** ✓

### 레이스?

| 흐름 | 서버 state | 로컬 state |
| --- | --- | --- |
| 정상 결제: tender → 서버가 1 트랜잭션 안에서 capture+receipt+metadata+convert → 200 | 전환 완료 (is_draft_order=false) | 앱이 응답 후 M3-1105-L A 가 DRAFT_ORDER_ID_STORAGE_KEY 삭제 |
| 재진입 (앱이 응답 못 받음 · 뒤로가기 뒤 복귀): 옛 id 로 retrieve → 서버 is_draft_order=false 반환 | 변화 없음 | fork #50 M1-1105-O 가드가 SecureStore 삭제 + null |
| 네트워크 재시도 (앱이 tender 2번 호출): 두 번째 POST 도달 → 서버가 is_draft_order=false (이미 전환) → section 7 skip | 변화 없음 (멱등) | — |

**모든 경로에서 서버 state 영향 중복 없음** · **로컬 state 정리는 멱등 (삭제는 어차피 중복 safe)** · **레이스 없음** ✓

### 한 줄 판단

storeport #196 (서버 convert 멱등 가드) + fork #50 (앱 로컬-only 안전망) + M3-1105-L A (명시 clear) 3자가 각자 자기 책임만 수행하는 설계 · **이중 전환·레이스 없음**.

---

## 환경 보조

- storeport main HEAD: `32ab911` (#194 M0-1105-L 머지 후) → PR #196 머지 시 next HEAD = `94a9f72` 포함
- fork master HEAD: `cf78d22` (#48 M1-1105-N 머지 후) → PR #50 머지 시 next HEAD = `9e4158d` 포함
- 로컬 재현:
  - `cd /Users/kyu.lee/projects/storeport && git checkout origin/feat/m0-1105-p-tender-auto-convert` → Build PASS · Integration **13/13 PASS**
  - `cd /Users/kyu.lee/projects/pos-r0 && git merge-tree origin/master origin/feat/m1-1105-o-hooks-safety` → clean
- check_runs API 403 (MCP 제약) → 로컬 재현으로 대체

## 참조

- 직전 리뷰: `r0/R0-1105-R-report.md` (fork #48 M1-1105-N APPROVE)
- storeport main: `32ab911f0...` (#194)
- fork master: `cf78d22...` (#48)
- GitHub reviews 제출 (COMMENT · self-authored 제약):
  - [storeport #196](https://github.com/CuriocityDevAi/storeport/pull/196) · APPROVE
  - [fork #50](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/50) · APPROVE
