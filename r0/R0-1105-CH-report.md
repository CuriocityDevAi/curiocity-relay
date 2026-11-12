# R0-1105-CH 리포트 — PR #105 리뷰 (앱→서버 결제 흐름 자동 테스트 1차 · M1-1105-BE)

**판정**: ✅ APPROVE (조건부 — split-tender 블라인드스팟 코멘트 첨부)

---

## 검증 표 (file:line)

| 항목 | 파일:라인 | 판정 |
|------|-----------|------|
| `computeInventoryStatus` import | `tests/flows/screen-calcs.test.ts:10` → `lib/inventory.ts:17` | ✅ 실제 앱 함수 |
| `extractTenders` import | `tests/flows/screen-calcs.test.ts:11` → `api/hooks/pos-orders.ts:70` | ✅ 실제 앱 함수 |
| `buildRefundBody` import | `tests/flows/void-restock-contract.test.ts:4` → `lib/refund-rules.ts:119` | ✅ 실제 앱 함수 |
| `buildMixedRefundBody` import | `tests/flows/void-restock-contract.test.ts:4` → `lib/refund-rules.ts:143` | ✅ 실제 앱 함수 |
| `deriveVoidRefundExposure` import | `tests/flows/void-restock-contract.test.ts:4` → `lib/refund-rules.ts:242` | ✅ 실제 앱 함수 |
| `buildSplitBody` (split-tender 계약 테스트) | `tests/flows/split-tender-contract.test.ts:17` | ⚠️ **로컬 복사본** — 앱 미연결 |
| `buildReturnBody` (return-items 계약 테스트) | `tests/flows/return-items-contract.test.ts:33` | ⚠️ 로컬 정의 (fixture 중심이라 허용) |
| `deriveGrandTotal` / `deriveOutstanding` (screen-calcs B) | `tests/flows/screen-calcs.test.ts:92–102` | ⚠️ 앱 코드에서 복사 (컴포넌트 내부 계산) |
| CI `flow-tests` 잡 | `.github/workflows/ci.yml:51–68` | ✅ 신규 독립 잡, `needs:` 없음 |
| 기존 `assertions` 잡 | `.github/workflows/ci.yml:14` | ✅ 변경 없음 |
| 기존 `playwright` 잡 | `.github/workflows/ci.yml:70` | ✅ 변경 없음 |
| `vitest.config.ts` | 루트 | ✅ 기존 그대로 — `test:flows` 는 `tests/flows` 경로 한정 |

---

## REQ 1 — `it.fails` 가 실제 앱 코드를 import 하는가

### 결론 요약

| 테스트 파일 | `it.fails` canary 방식 | 계약 테스트 방식 | 회귀 감지 여부 |
|------------|----------------------|----------------|--------------|
| `void-restock-contract.test.ts` | 로컬 인라인 객체 | **실제 `buildRefundBody` import** | ✅ 잡힘 |
| `screen-calcs.test.ts` (A구간) | 로컬 `[variantA, variantB]` 직접 호출 | **실제 `computeInventoryStatus` import** | ✅ 잡힘 |
| `screen-calcs.test.ts` (B구간) | 로컬 복사본 `deriveGrandTotal` | 로컬 복사본 | ⚠️ 앱 JSX 변경 미감지 |
| `split-tender-contract.test.ts` | 로컬 `buggy2ndCashBody` / `buggy2ndCardBody` | **로컬 `buildSplitBody` 복사본** | ❌ 앱 함수 변경 미감지 |
| `return-items-contract.test.ts` | 없음 | 로컬 `buildReturnBody` + fixture 기반 | ⚠️ 서버 계약만 검증 |

### split-tender 블라인드스팟 상세

앱의 `buildSplitBody` 는 `SplitTenderContent` 컴포넌트 클로저 내부 (`app/checkout/split-tender/[draftOrderId].tsx:119`) 에 정의되며 `export` 되지 않는다. 테스트는 동일한 로직의 **로컬 복사본**을 정의한다.

- 앱 클로저 (`line 119`): `const buildSplitBody = (...) => ({ ..., split: true as const, ...commonExtras })`
- 테스트 복사본 (`split-tender-contract.test.ts:17`): 동일한 구조 정의

**결과**: 앱에서 `split: true` 를 삭제해도 `split-tender-contract` 테스트 전체가 통과한다 → 뮤테이션 테스트로 확인.

---

## REQ 2 — 뮤테이션 테스트 로그 (커밋 없음)

**환경**: `git worktree add /tmp/pos-test-branch origin/test/m1-1105-be-flow-e2e` 후 실행.

### 베이스라인

```
Tests  46 passed | 6 expected fail (52)   Duration 255ms
```

### 뮤테이션 1: `app/checkout/split-tender/[draftOrderId].tsx:124` — `split: true` 제거

```diff
-     split: true as const,
+     // split: true as const,  ← MUTATION REMOVED
```

```
Tests  46 passed | 6 expected fail (52)   ← 변화 없음 ❌ 잡지 못함
```

**해석**: 테스트가 로컬 복사본을 쓰므로 앱 파일 변경이 반영되지 않는다.

### 뮤테이션 2: `lib/inventory.ts:23` — `computeInventoryStatus` 반환값 강제 999

```diff
+   return { kind: "in-stock" as const, total: 999 };  // MUTATION
    const managed = variants.filter(...)
```

```
FAIL  screen-calcs.test.ts > A … > FIXED: computeInventoryStatus([selectedVariant]) → 단일 69
FAIL  screen-calcs.test.ts > A … > available_quantity 우선 · inventory_quantity 대체
FAIL  screen-calcs.test.ts > A … > managed variant 없으면 unknown (fail-open)
FAIL  screen-calcs.test.ts > A … > available_quantity=0 → sold-out
Tests  4 failed | 42 passed | 6 expected fail (52)   ✅ 잡힘
```

### 뮤테이션 3: `lib/refund-rules.ts:132,151` — `restock` passthrough 제거 (두 함수)

```diff
-   if (input.restock !== undefined) extra.restock = input.restock;
+   // MUTATION: restock always omitted
```

```
FAIL  void-restock-contract.test.ts > void body — restock:true 계약 > 현금 void: buildRefundBody restock:true
FAIL  void-restock-contract.test.ts > void body — restock:true 계약 > 카드 void: buildRefundBody restock:true
FAIL  void-restock-contract.test.ts > void body — restock:true 계약 > 나눠(mixed) void: buildMixedRefundBody restock:true
Tests  3 failed | 43 passed | 6 expected fail (52)   ✅ 잡힘
```

---

## REQ 3 — fixture 서버 계약 · CI · vitest.config

### fixture 서버 계약

| fixture | 검증 필드 | storeport 계약 일치 여부 |
|---------|-----------|------------------------|
| `m0-1105-aj.split-tender-1st-cash.json` | `remaining`, `is_complete: false`, `receipt_id: null` | ✅ |
| `m0-1105-aj.split-tender-2nd-cash/card.json` | `remaining: 0`, `is_complete: true`, `receipt_id` non-null | ✅ |
| `pos-void-restock-200.json` | `request.body.restock: true`, `response.body.ok: true`, `receipt_id` | ✅ |
| `pos-return-400-qty-exceeded.json` | `status: 400`, `type: 'invalid_data'`, 메시지 형식 | ✅ |
| `m0-1105-aj.split-return-distribution.json` | `refund_distribution[0].method: 'cash'` (S3) | ✅ |

### CI 잡 구조

```
assertions  (기존 · 변경 없음)
flow-tests  (신규 · needs: 없음 · timeout 5m · npm run test:flows)
playwright  (기존 · needs: assertions · 변경 없음)
```

기존 `assertions` / `playwright` 잡 완전 불변 확인. `flow-tests` 는 assertions 에 의존하지 않으므로 병렬 실행.

### vitest.config.ts

```ts
// 변경 없음 — 기존 환경/alias 유지
test: { environment: 'node' }
```

`npm run test:flows` = `vitest run tests/flows --reporter=verbose` — 기존 `__tests__/` 경로와 분리되어 기존 테스트에 영향 없음.

---

## REQ 4 — Void 토스트 간접 커버리지 평가

**테스트가 잡는 것**: `receipt_id non-null` (토스트 발화 조건) + `restock:true` (onSuccess 블로킹 원인 제거).

**테스트가 잡지 못하는 것**: 실제 UI 토스트 `showToast.success()` 호출 — React 컴포넌트 레벨, `VoidRefundSheet.tsx` `onSuccess` 콜백.

**M3-1105-AY 연관성**: 버그 원인은 `restock` 단계가 `onSuccess` 를 블로킹했던 것. `void-restock-contract` 는 `buildRefundBody` 에 `restock:true` 가 포함됨을 직접 검증하므로 **원인 수정을 올바르게 커버**한다. 토스트 UI 자체는 커버하지 않으나, PR 설명대로 "간접(receipt_id 계약)" 이라는 표현은 정확하다.

---

## 이연 순증감

| | |
|--|--|
| 새 테스트 | +4 파일 (52개 테스트) |
| 수정 파일 | `package.json` · `vitest.config.ts` · `.github/workflows/ci.yml` |
| 앱 소스 변경 | 없음 |
| 이연 항목 | Playwright E2E (REQ 5) · `buildSplitBody` export 리팩터 (컴포넌트 외부 헬퍼로 이동 시 split-tender 블라인드스팟 해소 가능) |

---

## 판정 근거

APPROVE.

- `void-restock`, `screen-calcs` (A·C구간), `return-items` 는 실제 앱 함수를 import 하거나 fixture 계약을 검증하여 회귀 가치가 있음.
- `split-tender` 의 `buildSplitBody` 는 컴포넌트 클로저 내부 함수라 export 불가 — 로컬 복사는 구조적 한계이며, 코드 리뷰 코멘트로 기록해 다음 라운드 개선 목표로 남긴다.
- CI 잡 분리, 기존 잡 불변, vitest.config 영향 없음 모두 확인.
- 뮤테이션 2·3 에서 실제 앱 함수 변경 시 테스트가 올바르게 실패함 확인.
