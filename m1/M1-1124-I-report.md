LGTM — R0-1124-Q 지적 4건 전부 수정 완료

## 작업 브랜치 / PR

PR #23 (`feat/M1-1124-H-v8-r2-self-update`) commit `929f6af1f`

## 수정 내용

### 1. 업데이트→롤백→업데이트 무한 루프 방지

`scripts/lib/self-update.mjs`:
- `BLOCKED_FILE = 'selfupdate-blocked.json'` 상수 추가.
- `readBlockedSha(runnerHome)` · `writeBlockedSha(runnerHome, record)` 추가.

`scripts/hub-runner-v8.1.mjs` — `handleBootPendingAtStart()` rollback 분기:
- 롤백 시 `origin_sha` 를 `~/.hub-runner/selfupdate-blocked.json` 에 기록.
- 첫 차단(`event_written: false`)인 경우에만 `events/runner-selfupdate-blocked-<ts>.md` 1회 작성 → relay git commit+push. 같은 sha 로 반복 기록 금지.
- `event_written: true` 로 갱신 후 종료.

`maybeSelfUpdate()` — detect 직후:
- `readBlockedSha` 로 차단 sha 조회. `blocked.sha === diff.originSha` 이면 `{ tried:false, reason:'blocked-sha' }` 로 즉시 반환. origin/main 이 새 sha 로 바뀌면 자연스럽게 재시도.

### 2. prev 부재 시 롤백 실패 경로

`handleBootPendingAtStart()` rollback 분기 `else` 절:
- 기존: "prev 파일 부재 · 심링크 유지 · pending 만 정리" → 깨진 버전으로 30초마다 재기동 반복.
- 변경: `SELF_UPDATE_FALLBACK_RUNNER = 'hub-runner-v8.0.mjs'` 로 심링크 복원. fallback 파일도 없을 경우에만 심링크 유지(로그 기록).

### 3. `ci-watch.mjs` 미사용 `realpathSync` import 제거

line 17 에서 `realpathSync` 삭제.

### 4. 셀프테스트 2종 추가

| 플래그 | 내용 |
|--------|------|
| `--selftest-selfupdate-loop-guard` | blocked sha 기록·읽기·갱신 · 같은 sha 차단 · 다른 sha 미차단 · event_written 갱신 |
| `--selftest-selfupdate-no-prev` | rollback 판정 → prev 부재 확인 → fallback 경로 형태 검증 → blocked sha 기록 경로 검증 |

## 셀프테스트 전체 실행 로그

```
=== 기존 5종 ===
--selftest-selfupdate-detect    EXIT:0
  [selftest-selfupdate-detect] OK · (a) 동일 (b) bytesDiffer (c) renamed 세 경로 감지

--selftest-selfupdate-preflight EXIT:0
  [selftest-selfupdate-preflight] node --check hub-runner-v8.1.mjs → status=0
  [selftest-selfupdate-preflight] selftest --selftest-stale-lock → status=0 OK
  [selftest-selfupdate-preflight] selftest --selftest-merge-fail3 → status=0 OK
  [selftest-selfupdate-preflight] selftest --selftest-report-path-off → status=0 OK
  [selftest-selfupdate-preflight] OK · 자기 자신으로 node --check + 3 selftest 통과

--selftest-selfupdate-busy-wait EXIT:0
  [selftest-selfupdate-busy-wait] OK · busy 상태에서 self-update 보류

--selftest-selfupdate-rollback  EXIT:0
  [selftest-selfupdate-rollback] OK · confirm→bootCount=1 · 2차=rollback · currentScript 불일치=stale

--selftest-selfupdate-ciwatch   EXIT:0
  [selftest-selfupdate-ciwatch] OK · copy·no-op·갱신·래퍼 4 분기 정상

=== 신규 2종 (M1-1124-I) ===
--selftest-selfupdate-loop-guard EXIT:0
  [selftest-selfupdate-loop-guard] OK · 같은 sha 재시도 안 함 · 새 sha 는 시도 · event_written 갱신

--selftest-selfupdate-no-prev   EXIT:0
  [selftest-selfupdate-no-prev] OK · rollback prev 부재 → fallback=hub-runner-v8.0.mjs · blocked sha 기록 정상

=== preflight 3종 (selfupdate-preflight 내부) ===
  --selftest-stale-lock       OK
  --selftest-merge-fail3      OK
  --selftest-report-path-off  OK
```

전체 7종 + preflight 3종 = **10종 전부 PASS**

## PR #23 Kyu 설치 명령 확인

```bash
cd ~/projects/curiocity-relay
git fetch origin
git checkout main && git pull --ff-only
bash scripts/hub-runner-install.sh
```

그대로 유지됨. ✓

## 기술 선택 메모 (PR 본문 3줄)

1. blocked sha 를 `selfupdate-blocked.json`(단일 JSON) 으로 관리 — 최신 1개 sha 차단이 목적이므로 리스트 불필요.
2. blocked event 는 rollback 시 1회 기록, `event_written: true` 플래그로 반복 방지 — maybeSelfUpdate 에서는 silent skip.
3. prev 부재 fallback 은 `HERE/hub-runner-v8.0.mjs` 하드코딩 — install.sh `FALLBACK` 기본값과 동일, 추가 config 불필요.
