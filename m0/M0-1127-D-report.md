PASS · PR https://github.com/CuriocityDevAi/curiocity-relay/pull/60 · HEAD 930ddab54

## 수행 결과

### REQ 1 — relay#60 rebase + CI_WATCH_VERSION 1.20

- `git rebase origin/main` 성공 (충돌 1건: `scripts/ci-watch.mjs` 버전/이력 줄)
- 충돌 해소: 버전 이력 "1.17 번호는 예약만 되고 미사용 · 1.20 M2-1126-T/M0-1127-D(all.json·mem-log → status-wt)" + `CI_WATCH_VERSION = '1.20'`
- PR diff status 파일: **0개** (rebase 후 origin/main과 동일 상태)
- 비-status 변경 파일 9개: `scripts/ci-watch.mjs`, `scripts/hub-runner-v8.3.mjs`, `scripts/lib/gh-runner-watchdog.mjs`, `scripts/test/ci-watch-v2.test.mjs`, `scripts/test/hub-runner-gh-watchdog.test.mjs`, `scripts/watch/sources-git.mjs`, `scripts/watch/sources-local.mjs`, `scripts/ci-box/setup.sh`, `ledger/decision-imac-workers-20261126.md`

### REQ 2 — watchdog: launchd 미등록 맥북 러너 조용히 건너뜀

- `defaultCheckLaunchdRegistered(label, uid)` 추가: `launchctl print gui/<uid>/<label>` → exit 0=등록, non-zero=미등록
- `runOnce` opts에 `checkLaunchdRegisteredFn` 추가 (null = 기존 동작 유지)
- `launchdEnabled` Set 사전 계산: sleep-wake / partial-but-safe / stuck 세 경로 모두 `skip(launchd-disabled)` 처리
- `state.launchdRegistered` 추가: 등록→미등록 또는 미등록→등록 상태 변화 시 `warn` 1줄만 출력
- 기존 로그 (`partial-but-safe exec 실패: mac-light …` · `partial skip: mac-heavy in_progress not empty`) 35초마다 반복 → 초회 1회로 감소

### REQ 3 — heartbeat push 경쟁 분석

- **줄어드는 것**: `git add status/runners/all.json` staging 경쟁. all.json이 더 이상 REPO_ROOT에 쓰이지 않으므로 복수 러너가 같은 파일 staging 시도 없어짐.
- **남는 것**: runner-status 브랜치 `git push --force` 간 순서 역전은 여전히 가능하나 단일-워크트리 단일-force-push 구조라 데이터 손실 없음. `status/ci/*.jsonl` push는 append-only이므로 충돌 없음.

### REQ 4 — 테스트 전체 통과

```
node --test scripts/test/*.test.mjs
# tests 498 / pass 498 / fail 0

watchdog 단위 테스트:
  T25: checkLaunchdRegisteredFn → false → skip(launchd-disabled) · exec 0  ✓
  T26: 이전 false → 이번 true → warn "등록됨" 1회 · exec 호출  ✓
  T1~T24 기존 27개 전부 통과  ✓

ci-watch-spec-guard: 7/7 pass  ✓
```

PR #60 force-push 완료. 머지는 허브 유휴 + Kyu 있을 때 (self-update 트리거).

### REQ 5 — Kyu 손 필요 (PR 본문에 기재)

PR 본문 "Kyu 손 필요" 절:
```bash
rm ~/projects/curiocity-relay/events/runner-main-guard-20261126T085622Z.md
```
(2026-11-26 main-guard rescue 로컬 흔적 · git 불필요)

## 커밋 목록 (origin/main..HEAD)

- `930ddab54` fix(watchdog): M0-1127-D — launchd 미등록 맥북 러너 조용히 건너뜀 (상태 변화 시 1줄 로그)
- `5b80497ed` fix(ci-watch-v2): M2-1126-V — sources-{local,git}.mjs all.json 경로 → status-wt · 테스트 allJson 주입  
- `d26d8faa0` feat(runner): M2-1126-T — all.json·mem-log status-wt 분리 (Kyu 폴더 git pull 보호)
