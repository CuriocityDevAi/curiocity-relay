---
round: M1-1105-C
pr:
  fork: agilo-medusa-pos-fork#23
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/23
  fork_commit: 7964914
outcome: PR #23 (M1-1105-A) 를 신 master(b3439c8) 위에 rebase · 충돌 1곳 수동 해소 (토큰 + state 가드 둘 다 유지) · 로직 변경 0
kyu_checks: 계승 (M1-1105-A no-white-flash · no-max-update-depth)
---

# M1-1105-C · PR #23 rebase (충돌 해소 · 로직 변경 0)

**일자**: 2026-11-05 · **허브**: M1 · **작업 디렉토리**: `pos-m1` · **리포지토리**: `agilo-medusa-pos-fork` (브랜치 `fix/m1-1105-a-wizard-loop` force-push · onto `b3439c8`) · **승인**: 사전 "승인 없이 바로".

---

## 0. 원문 (Kyu 11-05 · R0-1105-E REQUEST CHANGES)

fork#23 을 현 master(b3439c8 · #22 색 토큰 + #24 + #25 머지 뒤) 위에 rebase. StockLocationSelectionStep.tsx 충돌 해소 시 **토큰 클래스 유지 + state 가드 로직 유지** 둘 다. 로직 변경 0.

---

## 1. Rebase 경과

```
$ git fetch origin master
   26b9894..b3439c8  master     -> origin/master
$ git checkout fix/m1-1105-a-wizard-loop
$ git rebase origin/master
Auto-merging app/index.tsx                              ← OK
Auto-merging components/setup-wizard/SetupWizardContent.tsx  ← OK
Auto-merging components/setup-wizard/StockLocationSelectionStep.tsx
CONFLICT (content): Merge conflict in components/setup-wizard/StockLocationSelectionStep.tsx
# 수동 해소 (willAutoSelect 블록 1곳) → 토큰 + state 가드 둘 다 유지
$ git add components/setup-wizard/StockLocationSelectionStep.tsx
$ git rebase --continue
Successfully rebased and updated refs/heads/fix/m1-1105-a-wizard-loop.
$ git push --force-with-lease
 + ac35042...7964914 fix/m1-1105-a-wizard-loop -> fix/m1-1105-a-wizard-loop (forced update)
```

### 충돌 요약

| 파일 | 상태 | 비고 |
|------|------|------|
| `components/setup-wizard/StockLocationSelectionStep.tsx` | **수동 해소** | `willAutoSelect` 블록 1곳 — master(M3-1105-A)는 single-line M1-1104-B 형태 · M1-1105-A(ac35042)는 state 가드 2개 (`!stockLocationAlreadySaved`, `!isSavingOrSaved`) 추가된 multi-line. 해소 = **M1-1105-A multi-line 채택**. 파일 나머지(text-ink-subtle 같은 M3 색 토큰) 는 머지 베이스에서 이미 반영돼 그대로 유지. |
| `components/setup-wizard/SetupWizardContent.tsx` | auto-merge | M3 토큰 + M1 `useQueryClient` 자동 통합 (교차 무). |
| `app/index.tsx` | auto-merge | M3 `TOKEN_SURFACE_MUTED` + M1 `usePathname` 자동 통합. |
| `scripts/m1-1104-b-assertions.mjs` | 변경 없음 | 이전 M1-1105-A 수정 유지. |

**로직 변경 0** — 단순 트리 동기화. 기능 변경 0.

### 변경된 라인 (해소 지점)

```diff
-  const willAutoSelect = !!onAutoSelect && stockLocationsQuery.isSuccess && totalCount === 1 && !!onlyLocation;
+
+  // M1-1105-A · state 가드 (stockLocationAlreadySaved · isSavingOrSaved) 유지
+  // M3-1105-A · 색 토큰 (text-ink-subtle 등) 유지 — 파일 하단 수동 선택 UI 참조
+  const willAutoSelect =
+    !!onAutoSelect &&
+    !stockLocationAlreadySaved &&
+    !isSavingOrSaved &&
+    stockLocationsQuery.isSuccess &&
+    totalCount === 1 &&
+    !!onlyLocation;
```

---

## 2. 재실행 검증 (rebased `7964914` 위에서 · 전원 pass)

```
$ npx tsc --noEmit                              → exit 1 (잔존 global.css TS2882 · master 동일 · pre-existing)
$ node scripts/m3-1105-a-color-assertions.mjs    → 35/35 passed · 0 failed
$ node scripts/m1-1105-a-assertions.mjs          → 33/33 passed · 0 failed
$ node scripts/m1-1104-a-assertions.mjs          → 44/44 passed · 0 failed
$ node scripts/m1-1104-b-assertions.mjs          → 26/26 passed · 0 failed
$ node scripts/m1-1105-a-repro.mjs               →  5/5 passed · 0 failed (사전 3회 · 사후 1회)
$ rm -rf dist && npx expo export -p web --output-dir dist   → 3 bundles · 29 routes
$ node scripts/m1-1105-b-playwright.mjs          →  6/6 passed · 0 failed
```

### M1-1105-B 하네스가 이제 **로그인 뒤까지 돈다**
rebase 전엔 base `0515209` (M1-1105-B PR #25 머지 전) 에서는 하네스 자체가 미존재. 이번 rebase 로 base 가 `b3439c8` (= #25 머지 뒤) 가 되어, M1-1105-A 수정이 적용된 상태에서 로그인 → 자동 wizard 통과 → `/products` 도달 → 상품 카드 2개 렌더 → "Maximum update depth" 0 + console.error 0 모두 pass.

**집계**:
- api calls 19 · console.error 전체 0 · pageerror 전체 1 (pre-existing React #418 필터링)
- "Maximum depth" 0 · 요구 명시 체크 통과

---

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `components/setup-wizard/StockLocationSelectionStep.tsx` | 충돌 해소 (willAutoSelect 블록 · state 가드 + 토큰 둘 다 유지) |
| 그 외 M1-1105-A 커밋 파일 | 그대로 rebase (auto-merge 성공) |

**본 라운드의 새 커밋/신규 파일 없음** — 기존 `ac35042` 커밋을 `7964914` 로 재작성만. 로직 변경 0.

---

## 4. Kyu 아이패드 실기 (M1-1105-A 승계)

- [ ] **no-white-flash**: 아이패드 로그인 → 흰 화면 깜빡임 없이 1회 전환 → 상품 화면.
- [ ] **no-max-update-depth**: 콘솔에 "Maximum update depth exceeded" / "ROUTE_NAMES_CHANGED" 반복 없음.
- [ ] (대조) 2+ 매장 계정 · Settings 재선택 흐름 미영향.

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 현 master 위 rebase (b3439c8) | ✓ |
| 충돌 해소: 토큰 + state 가드 둘 다 유지 | ✓ |
| 로직 변경 0 | ✓ · willAutoSelect 블록 재구성만 (기능 동일) |
| 색 어설션 35/35 | ✓ |
| M1 어설션 33/33 | ✓ |
| M1-1105-B 하네스 6/6 (로그인 뒤까지) | ✓ |
| 같은 브랜치 force-push | ✓ · `+ ac35042...7964914` |
| PR #23 본문 rebase 로그 + 재실행 결과 추가 | ✓ |
| 승인 없이 바로 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ (커밋 메시지 그대로 유지) |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (R0-1105-E REQUEST CHANGES · 충돌 rebase) |
| 보강 | 0 |
| 미완 (Kyu 도장) | M1-1105-A 승계 (2건) |
| **총 순증감** | **+1 해소** |

---

## 7. 다음 게이트

1. **PR #23** 재리뷰 → 머지. M1-1105-B PR #25 는 이미 머지됨 (base 에 포함).
2. 머지 후 다른 앱 PR 은 이 상태에서 `scripts/m1-1105-b-playwright.mjs` 로 **로그인 뒤까지** 검증 가능 — M1-1105-B 문서 `docs/testing/web-e2e.md` 참조.
3. Kyu 아이패드 실기 (no-white-flash · no-max-update-depth) 2건 승계 체크 대기.
4. **React #418 (SSG hydration) flag** 유지 · 별건 추적.

---

*M1-1105-C · 2026-11-05 · PR #23 rebase onto b3439c8 · 충돌 1곳 수동 해소 (토큰 + state 가드 둘 다 유지) · 로직 변경 0 · 색 35/35 + M1 33/33 + M1-1104-A 44/44 + M1-1104-B 26/26 + repro 5/5 + Playwright 6/6 전원 pass*
