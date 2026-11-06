---
round: M1-1105-G
pr:
  fork: agilo-medusa-pos-fork#29
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/29
  fork_commit: 503d588
outcome: PR #29 (feat/m3-1105-c-soldout-detail) 를 신 master(6cd6234) 위에 rebase · 충돌 1곳 수동 해소 (M1-1105-A state 가드 + M3-1105-C 영어 toast 둘 다 유지) · 로직 변경 0
kyu_checks: 계승 (M3-1105-C 품절 상세 · 영어 UI)
---

# M1-1105-G · PR #29 rebase (충돌 해소 · 로직 변경 0)

**일자**: 2026-11-06 · **허브**: M1 · **작업 디렉토리**: `pos-m1` · **리포지토리**: `agilo-medusa-pos-fork` (브랜치 `feat/m3-1105-c-soldout-detail` force-push · onto `6cd6234`) · **승인**: 사전 "승인 없이 바로" · **M1-1105-C 와 동일 패턴** (로직 변경 0).

---

## 0. 원문 (Kyu 11-06 · R0-1105-H REQUEST CHANGES)

fork#29 (feat/m3-1105-c-soldout-detail) 를 현 master(6cd6234 · #23·#27·#28·#30 머지 뒤) 위에 rebase. 충돌 해소 규칙:
- `StockLocationSelectionStep.tsx` = **M1-1105-A state 가드 유지 + M3-1105-C 영어 토스트 문구 유지**
- PNG 4장·`scripts/m3-1105-b-playwright.mjs` = **#29 쪽 (최신 fixture · C1~C6 포함) 채택**
- 로직 변경 0

---

## 1. Rebase 경과

```
$ git fetch origin master
   21eb6f3..6cd6234  master -> origin/master
$ git checkout feat/m3-1105-c-soldout-detail
$ git rebase origin/master
warning: skipped previously applied commit 96db52e   # M3-1105-B 는 이미 #27 로 master 에 머지됨
Rebasing (1/1)
Auto-merging components/setup-wizard/StockLocationSelectionStep.tsx
CONFLICT (content): Merge conflict in components/setup-wizard/StockLocationSelectionStep.tsx
# 수동 해소 (useEffect 본문 1곳) → M1-1105-A state 가드 + M3-1105-C 영어 toast 둘 다 유지
$ git add components/setup-wizard/StockLocationSelectionStep.tsx
$ git rebase --continue
Successfully rebased and updated refs/heads/feat/m3-1105-c-soldout-detail.
$ git push --force-with-lease
 + 9e2af0e...503d588 feat/m3-1105-c-soldout-detail -> feat/m3-1105-c-soldout-detail (forced update)
```

### 충돌 요약

| 파일 | 상태 | 비고 |
|------|------|------|
| `components/setup-wizard/StockLocationSelectionStep.tsx` | **수동 해소** | useEffect 본문 1곳 — #29 패치는 `autoSelectFiredRef.current = true` + 영어 toast 주석 추가. master HEAD 는 이미 M1-1105-A state 가드 (useRef 완전 제거). **해소 = state 가드 유지 + 영어 toast 유지** (문구 + 주석) · `autoSelectFiredRef` 는 삭제. |
| `docs/M3-1105-B-detail-{in-stock,low,sold-out,unknown}.png` (4장) | auto-apply | master 미수정 · #29 쪽 신규 캡처 그대로. |
| `scripts/m3-1105-b-playwright.mjs` | auto-apply | master 미수정 · #29 쪽 fixture (C1~C6) 그대로. |
| `docs/M3-1105-C-grid-soldout.png` · `scripts/m3-1105-c-english-assertions.mjs` | 신규 | #29 신규 파일 그대로. |

**로직 변경 0** · 트리 동기화만.

### 변경된 라인 (해소 지점)
```diff
   React.useEffect(() => {
     if (!willAutoSelect || !onlyLocation || !onAutoSelect) return;
-<<<<<<< HEAD
-=======
-    autoSelectFiredRef.current = true;
-    // M3-1105-C · ADDENDUM §2 영어 전용 UI — 한글 toast 문구 영어로 치환.
->>>>>>> 9e2af0e (feat(product): ...)
+    // M3-1105-C · ADDENDUM §2 영어 전용 UI — toast 문구 영어 유지.
+    // M1-1105-A · state 가드 (stockLocationAlreadySaved · isSavingOrSaved) 적용 — useRef 제거.
     Toast.show({
       type: 'info',
       text1: 'Store auto-selected',
       text2: `Store: ${onlyLocation.name}`,
```

### 부속 (스크립트 승계)
`scripts/m1-1104-b-assertions.mjs:36` 한글 toast 매처 `/'매장 자동 선택'/` → 영어 매처 `/'Store auto-selected'/` (M3-1105-C 승계). 로직/의도 변경 0 · 매칭 문자열만 업데이트. M1-1105-C rebase 때의 "useRef → state 승계" 패턴과 동형.

---

## 2. 재실행 검증 (rebased `503d588` 위에서 · 전원 pass)

```
$ npx tsc --noEmit                              → exit 1 (잔존 global.css TS2882 · pre-existing · master 동일)

# 상시 ⓒ · 상시 ⓓ (어설션)
$ node scripts/m3-1105-a-color-assertions.mjs    → 35/35 passed · 0 failed
$ node scripts/m3-1105-c-english-assertions.mjs  →  5/5 passed · 0 failed
$ node scripts/m1-1105-a-assertions.mjs          → 33/33 passed · 0 failed
$ node scripts/m1-1104-a-assertions.mjs          → 44/44 passed · 0 failed
$ node scripts/m1-1104-b-assertions.mjs          → 26/26 passed · 0 failed  (영어 승계 매처)

# 상시 ⓐ (Expo 웹 Playwright)
$ rm -rf dist && npx expo export -p web --output-dir dist   → 3 bundles · 29 routes
$ node scripts/m3-1105-b-playwright.mjs          → 30/30 passed · 0 failed  (C1~C6 fixture 포함)
$ node scripts/m1-1105-b-playwright.mjs          →  6/6 passed · 0 failed
$ node scripts/m1-1105-d-diagnosis.mjs           → 11 findings (하네스 정상 · 진단 전용)
```

### Pre-existing flag (유지)
`Minified React error #418` (SSG hydration) 1건 — M1-1104-B 때 등재 · 하네스 필터링 · 본 rebase 유발 아님.

---

## 3. 산출물

| 파일 | 변경 |
|------|------|
| `components/setup-wizard/StockLocationSelectionStep.tsx` | 충돌 해소 (useEffect 본문 1곳) · state 가드 + 영어 toast 둘 다 유지 |
| `scripts/m1-1104-b-assertions.mjs` | 한글 매처 1건 → 영어 매처 (M3-1105-C 승계) |
| 그 외 M3-1105-C 커밋 파일 | rebase 자동 적용 (auto-merge 성공) |

**본 라운드 새 커밋 없음** — `9e2af0e` 를 `503d588` 로 재작성만. 로직 변경 0.

---

## 4. Kyu 아이패드 실기 (M3-1105-C 승계)

M3-1105-C 의 Kyu 체크 그대로 승계:
- [ ] 품절 카드 탭 → 상세 시트 열림 (M3-1104-A 토스트 없음)
- [ ] 상세 재고 라인 + Add to cart 가드 작동 (C1~C6 fixture)
- [ ] UI 전부 영어 ("Sold out" · "Store auto-selected" · "Store: <name>")

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 현 master 위 rebase (6cd6234) | ✓ |
| 충돌 해소: state 가드 + 영어 toast 둘 다 유지 | ✓ |
| PNG 4 + m3-1105-b-playwright.mjs = #29 쪽 채택 | ✓ (auto-merge · master 미수정) |
| 로직 변경 0 | ✓ · useEffect 본문 블록 재구성만 (기능 동일) |
| 상시 ⓐ Playwright (m3-1105-b 30/30 · m1-1105-b 6/6) | ✓ |
| 상시 ⓒ 어설션 (색 35/35 · 영어 5/5 · M1 33/33 + 44/44 + 26/26) | ✓ |
| 상시 ⓓ 진단 하네스 (m1-1105-d 11 findings) | ✓ |
| 같은 브랜치 force-push-with-lease | ✓ · `+ 9e2af0e...503d588` |
| PR #29 본문 rebase 로그 + 재실행 결과 추가 | ✓ |
| 승인 없이 바로 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (R0-1105-H REQUEST CHANGES · PR #29 rebase) |
| 보강 | 0 |
| 미완 (Kyu 도장) | M3-1105-C 승계 |
| **총 순증감** | **+1 해소** |

---

## 7. 다음 게이트

1. **PR #29** 재리뷰 → M3 소유 머지. 본 라운드는 M1 가 rebase 만 담당 (M1-1105-C 와 동형).
2. 열린 M1 PRs: #23 (M1-1105-A wizard loop fix). **#30 (M1-1105-F line-item thumbnail)** 는 이미 머지돼 master 에 포함.
3. 다음 라운드엔 M3-1105-D (P2 cash) 또는 다른 M1 요구 소진.
4. **React #418 (SSG hydration) flag** 유지 · 별건 추적.

---

*M1-1105-G · 2026-11-06 · PR #29 rebase onto 6cd6234 · 충돌 1곳 수동 해소 (state 가드 + 영어 toast 둘 다 유지) · 로직 변경 0 · 색 35/35 + 영어 5/5 + M1 33+44+26 + M3 Playwright 30/30 + M1 E2E 6/6 + diag 11 findings 전원 pass*
