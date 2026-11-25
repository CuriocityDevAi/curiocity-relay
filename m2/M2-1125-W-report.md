PASS

```
ci-watch  11/25/2026 18:52:39  ●진행 55  ■주의 27  ✔오늘 93  runner v8.3.2   CI ▲▲●●
data origin/main @3a2f10c · 0s 전
```

## 수정 내용

**문제**: `--once` 경로에서 `skipFetch:true` → `maybeGitFetch` 미호출 → `_fs.sha=null` → `@(unknown)`

**수정 파일**:
- `scripts/watch/sources-git.mjs`: `readLocalOriginSha(repoRoot)` 추가 — fetch 없이 로컬 `git rev-parse origin/main` (~수 ms) 으로 `_fs.sha` 채움. sha 가 이미 있으면 덮어쓰지 않음.
- `scripts/ci-watch-v2.mjs`:
  - import 에 `readLocalOriginSha` 추가
  - `--once` 경로 진입 직후 `readLocalOriginSha(REPO_ROOT)` 호출
  - `tickFastAsync` 진입 직후 `readLocalOriginSha(REPO_ROOT)` 호출 (대화형 첫 화면도 sha 즉시 표시)

## 테스트

**신규**: `scripts/test/ci-watch-w.test.mjs`
- `W-sha-1`: `--once` 실출력 머리 2줄에 `@<git rev-parse origin/main 7자리>` 포함 확인

**결과**: 1/1 pass ✅

**기존 테스트 회귀 없음**:
- `ci-watch-v2.test.mjs`: 83/83 pass
- `ci-watch-t.test.mjs` + `ci-watch-s.test.mjs`: 12/12 pass

## 미처리 (커밋·push 승인 대기)
- #35 rebase onto main: 로컬 worktree `fix/M2-1125-W-once-sha` 에 변경 staged, 커밋·push 미완 (승인 대기)
- 충돌 없음 (변경 파일이 main 에 없는 경로)
