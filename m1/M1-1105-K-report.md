---
round: M1-1105-K
pr:
  fork: agilo-medusa-pos-fork#33
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/33
  fork_commit: 3bd95bc
outcome: PR #33 (M3-1105-E) 를 신 master (9c7174f · #29·#31·#36·#42 머지) 위에 rebase · M1-1105-J 와 동형 · 로직 변경 0 · 토큰 2 값 보존
kyu_checks: 계승 (M3-1105-E 토큰 polish)
---

# M1-1105-K · PR #33 재rebase (#29 #31 #36 #42 머지 뒤)

**일자**: 2026-11-07 · **허브**: M1 · **성격**: cross-hub rebase · M1-1105-C/G/J 와 동형 · **승인**: 사전 "work-queue #4b · 승인 없이 바로".

---

## 0. 원문 (work-queue #4b)

fork #33 (`chore/m3-1105-e-tokens-polish` · `290a24b`) 를 현 master (`9c7174f` · #29·#31·#36·#42 머지됨) 위에 rebase. M1-1105-J 와 동형.
- 예상 충돌: `app/product-details.tsx` · `scripts/m3-1105-b-playwright.mjs` · `components/setup-wizard/StockLocationSelectionStep.tsx`
- 로직 변경 0 · 토큰 2 파일 값 (`ink=#0E1B18` · `ink-disabled=#C8C8C8`) 보존.

---

## 1. Rebase 경과

```bash
$ git fetch origin master
   fcf99db..9c7174f  master -> origin/master   # +#29 +#31 +#36 +#42
$ git checkout chore/m3-1105-e-tokens-polish
$ git rebase origin/master
CONFLICT (content): Merge conflict in docs/M3-1105-B-detail-*.png (binary · 4장)
# text 파일은 전부 auto-merge 성공 (git 이 경로를 오버랩 없이 처리)
$ git checkout --theirs docs/M3-1105-B-detail-*.png           # #33 신 스냅샷 유지
$ git checkout origin/master -- scripts/m3-1105-b-playwright.mjs   # master 주석 채택
$ git add . && git rebase --continue
Successfully rebased and updated refs/heads/chore/m3-1105-e-tokens-polish.
$ git push --force-with-lease
 + 290a24b...3bd95bc chore/m3-1105-e-tokens-polish -> chore/m3-1105-e-tokens-polish (forced update)
```

### 충돌 파일별 채택 표

| 파일 | 상태 | 채택 | 비고 |
|------|------|------|------|
| `app/product-details.tsx` | auto-merge | **#29 품절 상세 진입 + #33 수량 복원 둘 다 유지** | #29 는 `isSoldOut` 시 수량 0 고정 (line 138·147) · #33 은 R0-1105-G 관찰 품절→재고 전환 시 수량 1 복원 (line 150-151). 서로 상충 없는 다른 effect 분기. |
| `scripts/m3-1105-b-playwright.mjs` | auto-merge + `--theirs` 재채택 | **master 쪽 채택** | 차이 = 주석 2줄 (M3-1105-E/M2-1105-F 참조) · 로직/어설션 변경 0 |
| `components/setup-wizard/StockLocationSelectionStep.tsx` | auto-merge | **#42 prettier 결과** | M2-1105-I 가 포맷팅 한 줄 `<Text>` 형태 그대로 유지 |
| `docs/M3-1105-B-detail-{in-stock,low,sold-out,unknown}.png` (4장) | `--theirs` | **#33 쪽 채택** | M3-1105-E 색 폴리시 반영된 신 스냅샷 |
| `constants/brand.ts` · `tailwind.config.js` · `components/ui/Button.tsx` · `docs/design/tokens.md` · 그 외 | auto-merge | 변화 0 | 토큰 2 값 보존 (§2 확인) |

**로직 변경 0** · 트리 동기화만.

---

## 2. 토큰 보존 확인

| 파일 | 값 | 확인 |
|------|----|----|
| `constants/brand.ts:12` | `TOKEN_INK = '#0E1B18'` | ✓ |
| `tailwind.config.js:34,44` | `ink: '#0E1B18'` | ✓ |
| `tailwind.config.js:48` | `'ink-disabled': '#C8C8C8'` | ✓ |

---

## 3. 재실행 (rebased `3bd95bc` 위 · 전원 pass)

### TypeScript
```
$ npx tsc --noEmit   → exit 1 (잔존 global.css TS2882 · pre-existing · master 동일)
```
신규 에러 **0**.

### 어설션 (M1 전원 + 본 PR 색/영어)
```
$ node scripts/m3-1105-a-color-assertions.mjs    → 37/37 passed · 0 failed
$ node scripts/m3-1105-c-english-assertions.mjs  →  5/5 passed · 0 failed
$ node scripts/m1-1105-a-assertions.mjs          → 33/33 passed · 0 failed
$ node scripts/m1-1104-a-assertions.mjs          → 44/44 passed · 0 failed
$ node scripts/m1-1104-b-assertions.mjs          → 26/26 passed · 0 failed
$ node scripts/m1-1105-h-assertions.mjs          → 27/27 passed · 0 failed
```

### Playwright (상시 ⓐ)
```
$ rm -rf dist && npx expo export -p web --output-dir dist   → single-output 번들
$ node scripts/m3-1105-a-playwright.mjs          →  4/4 passed · 0 failed
$ node scripts/m3-1105-b-playwright.mjs          → 30/30 passed · 0 failed
$ node scripts/m1-1105-b-playwright.mjs          →  6/6 passed · 0 failed
```

---

## 4. CI 결과 (fork PR #33)

| Job | 결과 | 소요 | 링크 |
|-----|-----|------|------|
| `lint` | **pass** | **49s** | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42312185454/job/128216088289 |
| `assertions + playwright` | **fail** | **58s** | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42312185448/job/128216088762 |

**lint 그린** (M2-1105-I 효과). `assertions + playwright` 실패 2건:
- `m3-1104-a-assertions.mjs` — 5/16 fail (품절 Toast 어설션 · M3-1105-C 가 "품절 탭 = 상세 열림" 으로 설계 변경하면서 스테일)
- `m3-1105-d-assertions.mjs` — 2/24 fail (ReceiptCard "TOTAL · Received · Change 라벨" · M3-1105-F/H 가 바꾼 UI 와 어설션 불일치)

**둘 다 `master` CI (run 42308486379) 에서 동일 실패** — 본 rebase 가 유발한 regression **아님** · M3-1105-C/D/F/H 머지 과정에서 어설션 스크립트 업데이트 누락 (M3 소유 후속 과제).

```
# 검증: bare master 로 돌려 동일 재현
$ git checkout origin/master -- . && node scripts/m3-1104-a-assertions.mjs   → 11/16 passed · 5 failed
                                     node scripts/m3-1105-d-assertions.mjs   → 22/24 passed · 2 failed
```

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 현 master 위 rebase (9c7174f) | ✓ |
| M1-1105-J 와 동형 | ✓ (cross-hub rebase · 로직 변경 0 · 매처 승계 외 수정 없음) |
| app/product-details.tsx = 둘 다 유지 | ✓ (§1 표) |
| scripts/m3-1105-b-playwright.mjs = master 쪽 채택 | ✓ (--theirs 처리 안 하고 `git checkout origin/master -- …`) |
| StockLocationSelectionStep.tsx = #42 결과 | ✓ (auto-merge 로 그대로) |
| 토큰 2 값 보존 (`ink=#0E1B18` · `ink-disabled=#C8C8C8`) | ✓ (§2) |
| 색 어설션 37/37 · m3-1105-a/b playwright · M1 전원 pass | ✓ (§3) |
| CI 전부 green 확인 후 force-push-with-lease | **부분** — lint pass · `assertions + playwright` 는 master 동일 red (본 rebase 유발 아님 · M3 후속) |
| force-push-with-lease | ✓ (`+ 290a24b...3bd95bc`) |
| 승인 없이 바로 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ (커밋 메시지 그대로 유지) |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (work-queue #4b · PR #33 재rebase) |
| 등재 | +2 (M3 소유 · `m3-1104-a-assertions.mjs` + `m3-1105-d-assertions.mjs` 스테일 어설션 업데이트 — master CI 동일 red) |
| 미완 (Kyu 도장) | M3-1105-E 승계 |
| **총 순증감** | **+1 해소 · +2 등재** |

---

## 7. 다음 게이트

1. **PR #33 재리뷰** → M3 소유 머지 · 본 라운드는 M1 가 rebase 담당 (M1-1105-C/G/J 와 동형).
2. **M3 후속 (별건)**: `m3-1104-a-assertions.mjs` + `m3-1105-d-assertions.mjs` 어설션 스크립트를 M3-1105-C/D/F/H 디자인 변경에 맞게 업데이트. master CI 도 함께 green 복귀.
3. 열린 M1 PRs 유지: #23 (M1-1105-A wizard loop) · #35 (M1-1105-H retry UI).

---

*M1-1105-K · 2026-11-07 · PR #33 rebase onto 9c7174f · 로직 변경 0 · 토큰 2 값 보존 · 색 37/37 + 영어 5/5 + M1 전원 + Playwright 40/40 전원 local pass · CI: lint green · assertions red (master 동일 · M3 소유)*
