# R0-1105-CN 리포트 — PR #105 재확인 · PR #107 Playwright 흐름 리뷰

## 판정

| PR | 판정 | 조건 |
|----|------|------|
| #105 (M1-1105-BG: 충돌 해소 · 순수 함수 이동) | ✅ APPROVE | lint 수정 후 머지 |
| #107 (M1-1105-BF: Playwright 흐름) | ✅ APPROVE | #105 머지 후 master retarget |

---

## REQ 1 — PR #105 뮤테이션 직접 재현 로그

**환경**: `git worktree add /tmp/pos-105-review origin/test/m1-1105-be-flow-e2e`

### 베이스라인
```
Test Files  4 passed (4)
Tests  46 passed | 6 expected fail (52)   Duration 253ms
```

### 뮤테이션 1 — `lib/split-tender.ts:8` `split: true as const` 제거

```diff
-  return { order_id: draftOrderId, provider_id, input, amount, split: true as const, ...extras };
+  return { order_id: draftOrderId, provider_id, input, amount, ...extras };
```

```
Test Files  1 failed | 3 passed (4)
Tests  5 failed | 41 passed | 6 expected fail (52)   ✅ 감지됨
```

(실패: split-tender 4조합 + it.fails 반전 1개)

### 뮤테이션 2 — `lib/order-totals.ts:6` `pos_totals` 무시

```diff
-  return posTotals?.grand_total ?? orderTotal;
+  return orderTotal;
```

```
Test Files  1 failed | 3 passed (4)
Tests  1 failed | 45 passed | 6 expected fail (52)   ✅ 감지됨
```

(실패: `pos_totals.grand_total 있으면 그것 사용`)

---

## 검증 표

| 항목 | 파일:라인 | 판정 |
|------|-----------|------|
| `buildSplitBody` lib 이동 | `lib/split-tender.ts:1` | ✅ export 순수 함수 |
| `buildSplitBody` 앱 import | `app/checkout/split-tender/[draftOrderId].tsx:37` | ✅ lib 연결 |
| `buildSplitBody` 호출부 갱신 (4곳) | `[draftOrderId].tsx:138,150,167,179` | ✅ 모두 갱신 |
| `deriveGrandTotal` lib 이동 | `lib/order-totals.ts:1` | ✅ export 순수 함수 |
| `deriveOutstanding` lib 이동 | `lib/order-totals.ts:9` | ✅ export 순수 함수 |
| `app/orders/[orderId].tsx` import | `line 35` | ✅ lib 연결 |
| 동작 변경 여부 | — | ✅ 로직 동등, 테스트 전체 통과 |
| master mergeable | GitHub API | ✅ `mergeable: "MERGEABLE"` |
| **신규 lint 오류** | `app/orders/[orderId].tsx:228` | ❌ `Array<T>` → `T[]` 수정 필요 |
| flow-tests CI | `run 43177155086` | ✅ pass |
| assertions CI | `run 43177155086` | ✅ pass |

---

## REQ 2 — PR #107 Playwright 흐름 검증 표

| 항목 | 결과 |
|------|------|
| 실제 화면 클릭 여부 | ✅ Flow1: `cash-process` 클릭→`payment-success`/`receipt-qr-block` 대기 |
| | ✅ Flow2: 금액입력→클릭→카드입력→클릭→success QR 2단계 |
| 모킹 과다 여부 | ✅ API=fixture intercept, UI 렌더·클릭=실제 Chromium |
| `navigateTo` 패턴 | ✅ root→/products 대기→History.pushState (Stack.Protected 우회 정당) |
| LIFO route 순서 | ✅ catch-all 먼저, narrow route 나중 |
| 실행 시간 | timeout=45s/test, retries=0 |
| 스샷 커밋 | ✅ `e2e/screenshots/` 5개 PNG |
| trace 설정 | ✅ `trace:'on'` (`e2e/test-results/` — 미커밋) |
| CI 통합 여부 | ⚠️ 미통합 — `playwright.config.ts` 로컬 전용, CI workflow 수정 없음 |
| base(#105) retarget | ⚠️ 필요 — #105 머지 후 master로 retarget |
| `@playwright/test` devDep | ✅ `^1.65.0` 추가 |

---

## 머지 순서

1. **PR #105**: `app/orders/[orderId].tsx:228` `Array<T>` → `T[]` lint 수정 → lint CI 통과 후 → `master`
2. **PR #107**: #105 머지 후 base를 `master`로 retarget → `master`

---

## 이연 순증감

| | 항목 |
|--|------|
| ✅ 해소 | `buildSplitBody` 클로저 블라인드스팟 (R0-1105-CH 지적) |
| ✅ 해소 | `deriveGrandTotal/Outstanding` 복사본 |
| ⬆️ 신규 | PR #107 E2E가 CI에 미통합 (로컬 전용 `npm run test:e2e:flows`) |
| ⬆️ 신규 | PR #105 lint 오류 (`Array<T>` 1건) |

---

## 착지 명령

```
cp /tmp/R0-1105-CN-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CN-report.md && git commit -m "r0: R0-1105-CN" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CN done "#105 APPROVE(lint 수정 후) · #107 APPROVE(retarget 후)"
```
