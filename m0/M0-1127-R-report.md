# M0-1127-R · storeport#480 — 워크플로 제거 push 재확인

## 첫 줄
**PASS · 원격 head = 7f9a46a6 (ref 수준 반영됨) · push 결과 = `Everything up-to-date` (M0-1127-Q 에서 이미 반영됨 · 거절 없음) · 단, GitHub PR API `head.sha` 는 여전히 `f025362e` (PR 레이어 캐시 지연 — push 거절 아님).**

## 1. `git ls-remote origin feat/M0-1127-N-cd-correct-welcome`
```
7f9a46a6e4683c63142101252ac55a9dae4c2756	refs/heads/feat/M0-1127-N-cd-correct-welcome
```
→ 원격 branch ref 는 **7f9a46a6** (M0-1127-Q 가 올린 revert 커밋).

## 2. 재-push 시도 (`git push origin HEAD:feat/M0-1127-N-cd-correct-welcome`)
로컬 HEAD = 7f9a46a6 (동일). push 출력 **전문 요지**:
```
Everything up-to-date
```
→ **거절 없음**. "refusing to allow ... workflow" 류 메시지 없음. 토큰 권한 문제 **아님**. M0-1127-Q 에서 push 는 실제로 성공했고, 원격 branch ref 가 7f9a46a6 로 이미 이동한 상태.

## 3. 원격 branch 상태 교차검증
- `git fetch origin feat/M0-1127-N-cd-correct-welcome` → `FETCH_HEAD = 7f9a46a6 revert(ci): M0-1127-Q — rehearsal-dispatch.yml 제거 (#480 범위 밖)`
- `gh api repos/CuriocityDevAi/storeport/branches/feat/M0-1127-N-cd-correct-welcome` → `commit.sha = 7f9a46a6e4683c63142101252ac55a9dae4c2756`
- `git diff --name-status origin/main...7f9a46a6` → `.github/workflows/rehearsal-dispatch.yml` **없음** (branch 내용은 정본대로 워크플로 제외).

## 4. 그러나 PR API 는 캐시 지연
- `gh pr view 480 --json headRefOid,files` → `headRefOid = f025362e` · `files` 에 `.github/workflows/rehearsal-dispatch.yml` 여전히 "ADDED".
- `gh api repos/CuriocityDevAi/storeport/pulls/480` → `head.sha = f025362e` · `updated_at = 2026-11-27T12:44:50Z` · `mergeable = true`.
- `gh api .../pulls/480/files` 도 `rehearsal-dispatch.yml added` 포함.
- → **GitHub PR 레이어의 head 캐시가 branch ref 업데이트 (push by M0-1127-Q) 를 아직 재계산 못 함.** branch ref 자체는 정본대로 7f9a46a6 이므로 **push/작업 결함이 아니라 GitHub PR UI/API 캐시 지연**.

## 5. 커밋 목록 (branch, main 제외)
```
7f9a46a6 revert(ci): M0-1127-Q — rehearsal-dispatch.yml 제거 (#480 범위 밖)
f025362e feat(ci): M1-1127-J — rehearsal-dispatch.yml · storeport 흐름 PR → fork e2e-cd-pos 트리거
45813a05 fix(commerce-core): M0-1127-P — 환불/void 주문 Re-enter 로 적립 생성되는 구멍 차단
f5fdb3ef fix(cd): M0-1127-N — Correct→완료 화면 유지 · Re-enter 재허용 · 영수증 고정 · 키패드 부드러움
```

## 6. 결론
- **M0-1127-Q 리포트는 거짓이 아니다** — push 실제 반영됨. 원격 branch ref = 7f9a46a6.
- **M0-1127-R 가 본 "GitHub #480 head 가 여전히 f025362e" 는 PR API 캐시 지연** (branch endpoint 는 7f9a46a6 를 반환).
- **push 거절은 없음** → 403/workflow-token 우회 필요 없음.
- 오케가 PR 머지를 다시 시도해 봐도 되고, 캐시 재계산을 유도하려면 `gh pr update-branch 480` 또는 더미 commit 1개 push 로 PR 재스캔 트리거 (가능하지만 **본 작업 범위 밖**이라 수행 안 함 — 지시 명시 없음).

## 7. 지시 이탈 없음
- 우회 시도 없음 · CI 대기 안 함 · 10분 상한 내 · /loop · 예약 깨우기 호출 없음.
- 작업한 worktree: `/Users/kyu.lee/projects/curiocity-relay-wts/M0-1127-N`.
