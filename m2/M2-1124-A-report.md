PASS — PR #12: https://github.com/CuriocityDevAi/curiocity-relay/pull/12

## 판정

정상 정보 줄을 오류로 세던 버그 수정 완료.
수정 본체: `32e00f161` (heartbeat runner 선점 커밋 — 아래 비고 참조).
PR #12 는 trace commit 포함 (코드 변경 없음 · 실제 diff 는 32e00f161 확인).

## 변경 (scripts/ci-watch.mjs 만)

- `ERR_PATTERNS` 허용 목록 추가
- `computeErrTailAlerts()` 신설: 허용 목록 패턴에 해당하는 줄만 3회 반복 집계
- `computeRunnerAlerts()` 에 `err_tail` 미전달 (double-processing 차단)
- 해소됨 조건(git_state 깨끗 + 뒤에 성공 줄): 경보 카운트 제외 → `[해소됨]` 회색 줄 표기
- `scripts/hub-runner*.mjs` · `scripts/claim.mjs` 미수정

## 자기 검증 (node -e 테스트)

**정상 줄 표본 → ⚠ 0건 (기대값 충족)**

| 줄 | 판정 |
|---|---|
| `[build-hubs] scanned hubs (10): k0, k1, ...` | OK |
| `[build-hubs] status/hubs.json rewritten (10 hubs)` | OK |
| `[claim] committed` | OK |
| `[claim] pushed` | OK |
| `[claim] wrote /Users/...` | OK |
| `[hub-runner-v7.8:m2 ...] pick` | OK |
| `[hub-runner-v7.8:claim ...] M2-1124-A → started` | OK |
| `[claim] 경고: 스코프 밖 변경 1건 ...` | OK |
| `[claim] rebase + retry` | OK |
| `[claim] pushed (after rebase)` | OK |
| `skip restart` | OK |
| `자동 복구 완료` | OK |

정상 줄 오탐: **0건**

**오류 줄 표본 → ⚠ 5/5건 탐지 (기대값 충족)**

| 줄 | 판정 |
|---|---|
| `Could not resolve host: github.com` | ⚠ CAUGHT |
| `[hub-runner-v7.8:heartbeat ...] standalone push 실패: ...` | ⚠ CAUGHT |
| `[hub-runner-v7.8:git ...] 러너 폴더 침범 감지` | ⚠ CAUGHT |
| `[hub-runner-v7.8:git ...] blocked: runner-folder change pending Kyu install` | ⚠ CAUGHT |
| `Error: ENOENT: no such file or directory` | ⚠ CAUGHT |

오류 줄 미탐: **0건**

`node --check scripts/ci-watch.mjs` → OK

## 비고

heartbeat runner(`chore(runner-v7.8): heartbeat all.json + ci`, `32e00f161`)가
ci-watch.mjs 수정 작업 중 working tree 를 선점 커밋해 origin/main 에 직접 push.
fix 브랜치(`fix/M2-1124-A-ci-watch-errors`)와 origin/main 이 동일 커밋이 되어
PR 에 코드 diff 없음 — trace commit(`736b58fe5`) 추가 후 PR #12 생성.
