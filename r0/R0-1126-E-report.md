#269 APPROVE

## R0-1126-E — PR #269 (M3-1126-B) 리뷰

**판정**: APPROVE (GitHub 셀프-리뷰 거부 → 코멘트 불가 · 기록만)
**worktree**: `/Users/kyu.lee/projects/curiocity-relay-wts/M3-1126-B`
**커밋**: f4329d8

---

## REQ 1 — tender-cash/split useEffect deps 추가 → emit 폭증 여부

**결론**: 폭증 없음.

`draftOrderId`는 Expo Router `useLocalSearchParams<{ draftOrderId: string }>()`에서 반환되는 URL 경로 파라미터. `[draftOrderId]` 라우트이므로 화면 수명 내 절대 변하지 않는 stable 값.

- tender-cash: deps `[method, total]` → `[method, total, draftOrderId]`. `draftOrderId` 변화 없으므로 추가 fire 없음.
- split-tender: deps `[step]` → `[step, draftOrderId]`. 동일.

300ms 디바운스+collapse(`lib/pos-screen/queue.ts`) 가 이중 보호망. 실제 POST 횟수는 화면 진입 1회 고정.

---

## REQ 2 — tender-qris · tender-card · success order_id 커버리지

**grep 명령**:
```
grep -rn "setPosScreenHint" /Users/kyu.lee/projects/curiocity-relay-wts/M3-1126-B/app/
```

**결과**:
| 화면 | setPosScreenHint order_id |
|---|---|
| `app/checkout/tender-qris/[draftOrderId].tsx:347` | `order_id: orderId ?? draftOrderId` ✅ |
| `app/checkout/success/[orderId].tsx:108` | `order_id: orderId` ✅ |
| `app/checkout/tender-cash/[draftOrderId].tsx:141` | `order_id: draftOrderId` ✅ (이번 PR) |
| `app/checkout/split-tender/[draftOrderId].tsx:167` | `order_id: draftOrderId` ✅ (이번 PR) |
| `app/register/open.tsx`, `app/register/close.tsx`, `app/orders/[orderId].tsx` | order_id 없음(shift_*/handover — 의도적 drop) |

tender-card 별도 화면 없음 — `app/checkout/` 하위에 존재하지 않음(grep 0 matches). 누락 화면 없음.

---

## REQ 3 — usePosScreen.ts production warn 스팸 · Sentry PII

**변경 내용** (`hooks/usePosScreen.ts`):
```diff
-    if (__DEV__) {
-      console.warn('[pos-screen] drop: order_id null', { screen: item.pos_screen, seq: item.seq });
-    }
+    console.warn('[pos-screen] drop: order_id null', { screen: item.pos_screen, seq: item.seq });
+    Sentry.addBreadcrumb({
+      category: 'pos-screen',
+      message: 'drop: order_id null',
+      data: { screen: item.pos_screen, seq: item.seq },
+      level: 'warning',
+    });
```

**스팸 없음**: `postEmit`은 비동기 큐 처리기(`usePosScreen.ts:49` 함수 내부) — render path 아님. `order_id null` 경로는 shift_opening/shift_closing/handover 등 비주문 화면에서만 hit. 이번 PR로 tender-cash/split이 `draftOrderId`를 명시하므로 해당 경로 빈도 추가 감소.

**PII 없음**: Sentry breadcrumb `data` = `{ screen: item.pos_screen, seq: item.seq }`. `pos_screen`은 enum 문자열(예: `'shift_opening'`), `seq`는 시퀀스 정수. 전화번호·이메일 등 PII 없음.

---

## REQ 4 — Playwright 직접 실행 · vitest · lint · CI

### vitest (로컬 직접 실행)
```
cd /Users/kyu.lee/projects/curiocity-relay-wts/M3-1126-B && npx vitest run
```
```
Test Files  88 passed (88)
     Tests  1125 passed | 6 expected fail | 3 todo (1134)
  Duration  2.99s
```
✅ 전체 pass.

### lint (로컬 직접 실행)
```
cd /Users/kyu.lee/projects/curiocity-relay-wts/M3-1126-B && npx expo lint
```
```
✖ 71 problems (0 errors, 71 warnings)
```
✅ 에러 0. 경고 71건 모두 기존 파일(`components/ui/BottomSheet.tsx` 등) — 이번 PR 변경 파일과 무관.

### Playwright e2e (로컬 직접 실행 — dist 기존 빌드 사용)
```
cd /Users/kyu.lee/projects/curiocity-relay-wts/M3-1126-B && npx playwright test e2e/flows/M3-1126-B-checkout-snapshot.spec.ts --config playwright.config.ts
```
```
Running 2 tests using 1 worker
  ✓  Cash 진입 → checkout-snapshot POST 에 pos_screen=payment_cash · order_id 포함 (1.9s)
  ✓  Process 성공 → checkout-snapshot POST 에 pos_screen=paid · order_id 포함 (2.0s)
  2 passed (4.6s)
```
✅ 2 passed.

### CI (gh pr checks 269 — 조회 시각 기준)
```
gh pr checks 269 --repo CuriocityDevAi/agilo-medusa-pos-fork
gh api repos/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45743245246/jobs --jq '.jobs[] | {name, status, conclusion, runner_name}'
```

| job | status | runner |
|---|---|---|
| route | pass | GitHub Actions 1000008199 |
| assertions | pass | **ci-box-fork-light-imac** (iMac) |
| flow-tests | pass | curiocity-mac-fork-light |
| unit-tests | pass | curiocity-mac-fork-light |
| heavy-cloud | skipping | — |
| lint | pass | (run 45743244810) |
| playwright | **in_progress** | **ci-box-fork-heavy-imac** (iMac) |

playwright CI 잡은 `ci-box-fork-heavy-imac` 아이맥 러너에서 실행 중(조회 시점 미완료). assertions 잡은 `ci-box-fork-light-imac` 아이맥 러너 pass.

---

## 스레드 처리

PR review_threads: 0건 — 처리 불필요.
GitHub 셀프-리뷰 불가(`Can not approve your own pull request`) → approve 미제출 · 본 리포트로 대체.

---

## 종합

이슈 없음. APPROVE.
