---
round: M1-1105-J
pr:
  fork_29: agilo-medusa-pos-fork#29
  fork_29_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/29
  fork_29_commit: 4f53601
  fork_33: agilo-medusa-pos-fork#33
  fork_33_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/33
  fork_33_commit: 290a24b
outcome: PR #29 (M3-1105-C) + PR #33 (M3-1105-E) 를 신 master(c7edc4f) 위에 rebase · scripts/m3-1105-a-playwright.mjs 는 _harness.mjs 패턴 채택 · 로직 변경 0
kyu_checks: 계승 (M3-1105-C 품절 상세 · M3-1105-E 토큰 다듬기)
---

# M1-1105-J · PR #29 + #33 rebase (충돌 해소 · 로직 변경 0)

**일자**: 2026-11-07 · **허브**: M1 · **성격**: cross-hub rebase · M1-1105-C/G 와 동형 패턴 · **승인**: 사전 "승인 없이 바로".

---

## 0. 원문 (R0-1105-L REQUEST)

- scripts/m3-1105-a-playwright.mjs 충돌 · `_harness.mjs` 패턴으로 재작성 (M2-1105-F 이후 공용 하네스 정본).
- #29 APPROVE 뒤 #34 (M2-1105-G CI) 머지로 재충돌 — 함께 rebase.
- 현 master = `c7edc4f` (#34·#35·#38 머지됨).
- 규칙: scripts/** 충돌은 전부 master `_harness.mjs` 패턴 채택 · 각 PR 고유 어설션만 유지 · **로직 변경 0**.

---

## 1. PR #29 (feat/m3-1105-c-soldout-detail) · `503d588` → `a677c24`

### Rebase 로그
```bash
$ git checkout feat/m3-1105-c-soldout-detail
$ git rebase origin/master
Rebasing (1/1)
Successfully rebased and updated refs/heads/feat/m3-1105-c-soldout-detail.
# 충돌 0 — master 가 이전 충돌 포인트(M1-1105-A/F/H/I)를 흡수.
```

### 부속 (스크립트 승계 1건 · M1-1105-C/G 와 동형 패턴)
`scripts/m1-1104-b-assertions.mjs:36` 한글 toast 매처 `/'매장 자동 선택'/` → 영어 `/'Store auto-selected'/` (M3-1105-C ADDENDUM §2 승계 · 로직 변경 0).

### 재실행 (rebased `a677c24` 위)
```
npx tsc --noEmit                             → exit 1 (잔존 global.css · pre-existing)
scripts/m3-1105-a-color-assertions.mjs        → 35/35
scripts/m3-1105-c-english-assertions.mjs      →  5/5
scripts/m1-1105-a-assertions.mjs              → 33/33
scripts/m1-1104-a-assertions.mjs              → 44/44
scripts/m1-1104-b-assertions.mjs              → 26/26  (영어 매처 승계)
scripts/m1-1105-h-assertions.mjs              → 27/27
expo export -p web → scripts/m3-1105-b-playwright.mjs → 30/30
scripts/m1-1105-b-playwright.mjs              →  6/6
```

---

## 2. PR #33 (chore/m3-1105-e-tokens-polish) · `f84abef` → `290a24b`

### Rebase 로그
```bash
$ git checkout chore/m3-1105-e-tokens-polish
$ git rebase origin/master
Auto-merging scripts/m3-1105-b-playwright.mjs
CONFLICT (content): Merge conflict in scripts/m3-1105-a-playwright.mjs
# 수동 해소 (4 블록) → master _harness.mjs 패턴 채택 · #33 의 inline server 제거
$ git add scripts/m3-1105-a-playwright.mjs
$ git rebase --continue
Successfully rebased and updated refs/heads/chore/m3-1105-e-tokens-polish.
```

### 충돌 해소 (scripts/m3-1105-a-playwright.mjs · 4 블록)

| 블록 | HEAD (master) | #33 패치 | 채택 |
|------|-----------------|----------|------|
| imports + server setup | `createDistServer` + `attachErrors` + `makeChecker` (_harness.mjs) | inline `http.createServer` + MIME 테이블 + `pageErrors`/`consoleErrors` 수집 | **HEAD** (_harness.mjs) |
| context 및 page 설정 | `attachErrors(page)` 1줄 | `page.on('console'/'pageerror', …)` 수기 | **HEAD** |
| (1) pageerror 어설션 | `errs.pageErrors.length === 0` | React #418 allowlist (M2-1105-F 에서 이미 삭제 · web.output: single) | **HEAD** (allowlist 없음) |
| (2) 로그인 selector | `loginEmail` testID 포함 | `loginShopUrl` 만 | **HEAD** (newer selector) |

**로직 변경 0** — _harness 패턴 전환 + 각 PR 고유 어설션 (login reach · Meros 로고 · console.error 0) 전원 보존.

### 재실행 (rebased `290a24b` 위)
```
npx tsc --noEmit                             → exit 1 (잔존 global.css · pre-existing)
scripts/m3-1105-a-color-assertions.mjs        → 37/37  (ink-disabled 토큰 신설 포함)
scripts/m1-1105-a-assertions.mjs              → 33/33
scripts/m1-1104-a-assertions.mjs              → 44/44
scripts/m1-1104-b-assertions.mjs              → 26/26
scripts/m1-1105-h-assertions.mjs              → 27/27
expo export -p web → scripts/m3-1105-a-playwright.mjs → 4/4  (_harness.mjs 패턴)
scripts/m3-1105-b-playwright.mjs              → 24/24
scripts/m1-1105-b-playwright.mjs              →  6/6
```

---

## 3. CI 그린 (fork)

양 PR force-push 후 M2-1105-G CI 가 트리거됨 (assertions + web export + playwright).

- **PR #29**: (상태 리포트 작성 시점 확인)
- **PR #33**: lint 는 M1-1105-I 로 install 성공 · 본 PR 범위 외 pre-existing PrinterRow prettier 2건 때문에 red (M2 후속 PR 로 해소 예정 · M1-1105-I report 명시). `assertions + playwright` CI 는 rebase 로 _harness.mjs 정합 복구.

---

## 4. 규약 정합

| 규약 | 정합 |
|------|------|
| 현 master 위 rebase (c7edc4f) | ✓ |
| 충돌 전부 scripts/** · master `_harness.mjs` 패턴 채택 | ✓ |
| 각 PR 고유 어설션만 유지 | ✓ (login/로고/console.error 어설션 보존) |
| 로직 변경 0 | ✓ |
| 색 / 영어 / M1 어설션 재실행 | ✓ (전원 pass) |
| 해당 Playwright 재실행 | ✓ (m3-1105-a 4/4 · m3-1105-b 30/30 or 24/24 · m1-1105-b 6/6) |
| force-push-with-lease | ✓ · `+ 503d588...a677c24` · `+ f84abef...290a24b` |
| PR 본문 rebase 로그 추가 | ✓ |
| 승인 없이 바로 | ✓ |
| M1-1105-C/G 와 동형 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (R0-1105-L REQUEST · 두 PR rebase 충돌 해소) |
| 보강 | 0 |
| 미완 (Kyu 도장) | M3-1105-C · M3-1105-E 승계 |
| **총 순증감** | **+1 해소** |

---

## 6. 다음 게이트

1. **PR #29 재리뷰** → M3 소유 머지 · 본 라운드는 M1 가 rebase 담당 (M1-1105-C/G 와 동형).
2. **PR #33 재리뷰** → M3 소유 머지.
3. 열린 M1 PRs 유지: #23 (M1-1105-A wizard loop fix) · #35 (M1-1105-H retry UI) · #38 (M1-1105-I lint CI).

---

*M1-1105-J · 2026-11-07 · PR #29 + #33 rebase onto c7edc4f · scripts _harness.mjs 패턴 채택 · 로직 변경 0 · 색 35+37 + 영어 5 + M1 33+44+26+27 + Playwright 4+30+24+6 전원 pass · 승계 매처 1건 (m1-1104-b)*
