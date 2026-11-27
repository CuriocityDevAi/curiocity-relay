# M3-1128-B report

PASS — storeport PR #486 · fork PR #297 · storeport 1.9s · fork 18s

## PR 목록

| 리포 | PR | 브랜치 |
|------|-----|--------|
| storeport | [#486](https://github.com/CuriocityDevAi/storeport/pull/486) | `chore/M3-1128-B-precheck` |
| fork (agilo-medusa-pos-fork) | [#297](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/297) | `chore/M3-1128-B-precheck` |

## 변경 파일

| 파일 | 리포 | 비고 |
|------|------|------|
| `scripts/precheck.sh` | storeport + fork | 신규 (실행 권한 755) |
| `package.json` | storeport + fork | `"check:pr": "bash scripts/precheck.sh"` 추가 |
| `CLAUDE.md` | storeport | §6 항상 할 것 ⑤번 추가 |
| `CLAUDE.md` | fork | 신규 생성 (규칙 한 줄) |

## precheck 5단계

① 머지된 브랜치 — `gh pr list --head <branch> --state merged`
② origin/{main|master} 충돌·뒤처짐 — `git merge-tree <base> HEAD origin/main` + `git rev-list --count`
③ 바뀐 패키지만 lint — storeport: `git diff --name-only origin/main...HEAD | awk` → `pnpm --filter` / fork: 소스 변경 있을 때 `npm run lint`
④ typecheck — storeport: 바뀐 패키지 `pnpm --filter typecheck` / fork: `npx tsc --noEmit`
⑤ 단위 테스트 — storeport: 바뀐 패키지 `pnpm --filter test` / fork: `npm test`

각 단계 `✓ PASS` / `✗ FAIL + 한 줄 힌트` 출력 · 마지막 요약 블록.

## 실행 시간

| 리포 | 케이스 | 시간 |
|------|--------|------|
| storeport | 바뀐 패키지 없음 (스킵) | 1.9s |
| fork | lint + 1200 단위 테스트 전체 | 18s |

목표 5분 이내 충족 (바뀐 패키지만 → storeport 2s 미만).

## 자기 검증 로그

### 검증 1: lint 오류 → ✗ FAIL ✅

```
③ lint...
✗ FAIL lint
  → lint 오류. 위 출력에서 오류를 수정하거나 'npx expo lint --fix' 를 실행하세요.
④ typecheck...
✗ FAIL typecheck
  → 타입 오류. 위 출력의 오류를 수정하세요.
❌ 검사 FAIL 2 건 — 위 항목을 수정 후 다시 실행하세요.
```

(TestLintError.tsx prettier 위반 커밋 → precheck → 원상 복구)

### 검증 2: 머지된 브랜치 → ✗ FAIL ✅

```
① 머지된 브랜치 검사...
✗ FAIL 머지 여부
  → 이 브랜치는 이미 PR #295 로 머지됐습니다. 새 브랜치를 만드세요: git checkout -b <new-branch>
✗ FAIL origin/master 뒤처짐
  → 2 커밋 뒤처짐. 'git rebase origin/master' 를 실행하세요.
❌ 검사 FAIL 2 건 — 위 항목을 수정 후 다시 실행하세요.
```

(브랜치: `ci/M3-1127-P-storeport-sync` — 이미 #295 로 머지된 브랜치)

### 검증 3: origin 충돌 → ✗ FAIL ✅

```
② origin/master 충돌·뒤처짐 검사...
✗ FAIL origin/master 충돌
  → 충돌 마커 발견. 'git rebase origin/master' 후 충돌을 해소하세요.
❌ 검사 FAIL 3 건 — 위 항목을 수정 후 다시 실행하세요.
```

(origin/master~2 에서 분기, `OrderChips.tsx` 21번째 줄 import 충돌 — `git merge-tree` 출력에서 `<<<<<<< ` 1건 감지)

## PR 본문 확인 항목

- [x] `pnpm run check:pr` 또는 `npm run check:pr` 로 실행 가능
- [x] 각 단계 PASS/FAIL 한 줄 출력
- [x] FAIL 시 "무엇을 고치면 되는지" 한 줄 힌트
- [x] 마지막 요약 블록 (`════` 박스 + PASS/FAIL 목록)
- [x] `.github/workflows/**` · 앱 소스 미터치
- [x] 기존 CI 그대로 (추가 · 대체 아님)

## ⓒ 상시 조항

- 리포트는 `/Users/kyu.lee/.hub-runner/reports/m3/M3-1128-B/report.md` 에만 작성
- git 리포 내 리포트 없음 · commit/push 없음
- relay 작업은 `~/projects/curiocity-relay-wts/<ID>` worktree 에서만 (해당 없음 — 이 태스크는 storeport + fork)
- CI 대기 없음 · /loop · 예약 깨우기 없음
