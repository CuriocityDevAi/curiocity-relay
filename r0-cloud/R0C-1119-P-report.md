relay #7 CHANGES · 러너 멈춤 문제는 해결됐지만, CI 조회가 30초마다 돌아 GitHub API 를 시간당 약 4,000회 써서 허브들의 gh 가 막힐 수 있음

# R0C-1119-P · relay PR #7 재리뷰 (M0-1119-I · hub-runner v7.5)

- 리뷰 대상: PR #7 HEAD `808a8cce` · 2026-11-19 · R0 클라우드 · 이전 리뷰 R0C-1119-O (CHANGES)
- 판정: **CHANGES** (머지 금지 권고 · 코드 수정은 안 함 · 고칠 양은 작음)

## 이전 차단 4건 → 결과

| # | 이전 문제 | 지금 |
|---|---|---|
| ① | 옛 `-p` 러너를 고침 | ✅ 해결. v7.4 와 v7.5 diff = 추가만 (머리글·import·상수·스코프 1줄·heartbeat 의 hubs/ci·`git add status/ci`·`fireCi()` 1줄). cmux-split·복구·착지 감지·폴더 가드 코드 변경 없음. `hub-runner.mjs` 변경도 되돌림 |
| ② | `status/ci/` 스코프 밖 → pull 멈춤 | ✅ 해결. **실제 git 으로 실행해 봄** (아래) |
| ③ | suspect_done 자동 입력·busy 조작 | ✅ 해결. 기록만 (창 입력·busy·blocked 없음). 단 경로 문제 1건 (아래 3번) |
| ④ | heartbeat 안 gh 직렬 호출 | ✅ tick 은 기다리지 않음 (`fireCi()` 는 await 없음 · gh 는 비동기 `execFile`). 하지만 **새 문제** 생김 (아래 1·2번) |

## 꼭 고칠 것

1. **CI 조회가 30초마다 돎 → API 를 너무 많이 씀.** `fireCi()` 가 tick(30초)마다 불리고, 간격 제한이 없음. 한 번 조회 = (최근 30분 안에 끝난 run 수) 만큼 jobs 호출 + 목록 3회 + 러너 1회. 지금 storeport 실측: 최근 30분 완료 run **29개** → 한 번에 약 34회 → **시간당 약 4,000회**. GitHub 한도 5,000/h 를 Kyu 계정의 모든 허브 gh 와 같이 씀 → 바쁠 때 한도 초과로 허브들의 `gh pr`·CI 확인이 실패할 수 있음. 같은 run 의 jobs 를 30분 동안 60번 다시 읽음.
   → 조회 간격 최소 5분 + 이미 기록한 run id 는 다시 안 읽기 (메모리 캐시).
2. **30초 마감이 실제로 멈추지 않음.** `withDeadline` 은 기다리기만 그만두고 `inFlight=false` 로 풀어 줌. 진짜 gh 호출들은 계속 돎 → 다음 tick 에 새 조회가 또 시작 → 겹쳐 쌓임 (gh 프로세스·API 2배). 29개 jobs 를 하나씩 부르면 30초에 가까워서 실제로 생길 수 있음.
   → 진짜 작업이 끝날 때까지 `inFlight` 유지 (또는 AbortController 로 gh 중단).
3. **suspect_done 이 Mac 에서 안 잡힐 수 있음.** 규칙은 `/tmp/<ID>-report.md` 인데 코드는 `os.tmpdir()` 사용. macOS 는 `TMPDIR` 이 있으면 `/var/folders/…/T/` 를 줌. → `'/tmp'` 로 고정. (위험은 없음 · 기능이 안 될 뿐)

## 정확성 (작음 · 같이 고치면 좋음)

- 기록 범위: `created>=30분 전` 으로 조회 → 대기+실행이 30분 넘은 run (= 정작 보고 싶은 "오래 걸린" run) 은 기록 안 됨. 주석은 "updated" 라 써 있지만 코드는 `created`.
- queued run 은 전부 heavy 로 셈 → light 대기·`light_wait` 경보는 항상 0, heavy 대기는 부풀려짐 (queue_wait·runner_idle 오경보 가능).
- fork 대상 `KyuuuLee/storeport` 는 추측값으로 보임 (이 세션에선 접근 불가로 확인 못 함). 의도한 fork 가 `agilo-medusa-pos-fork` 인지 확인 필요. 없는 repo 면 매번 실패 호출만 함.
- PR 에 들어 있는 `status/ci/2026-11-19.jsonl`(35줄) 은 옛 형식 (`queued_at`, `labels`/`created_at` 없음) → 새 형식과 섞임. 빼는 것 권장.
- 비용: `cloud_cost_est_usd` + note "estimate" 로 "추정" 표기 OK. 단가 $0.008 은 2026 인하가(약 $0.006, 확인 필요) 와 다를 수 있음.
- WIB: 날짜 = job 완료 시각 WIB · `getWibDayBoundary` 계산 맞음 ✅. `--paginate` 제거 ✅. job `labels`/`runner_name` 분류 ✅. wait = job created_at→started_at ✅.

## 직접 실행한 것

- `node --test scripts/test/*.test.mjs` (Node 22) → **143 pass / 0 fail**.
- **safePull 재현 (실제 git · 임시 origin+clone)**: v7.5 의 `outOfScopeChanges`·`autoRecoverDivergence` 원문을 뽑아 실행.
  - v7.5: jsonl 새 파일/staged/수정 모두 스코프 밖 = `[]` · 분기 복구 = `recovered` · pull 후 새 큐 파일 받음 ✅
  - v7.4 (대조): `["status/ci/…"]` 스코프 밖 · 복구 = `manual` (= 이전에 말한 멈춤 재현)
  - 참고: PR 의 I-7 테스트는 글자만 확인함 (실제 git 동작 아님).
- install.sh: TARGET v7.4→v7.5, FALLBACK v7.3→v7.4 두 줄만 ✅ (FALLBACK 도 바뀜 — 의도면 OK).

## 주의 (되돌릴 때)

- v7.4 로 되돌리면 v7.4 는 `status/ci/` 를 스코프 밖으로 봄 → 커밋 안 된 jsonl 이 남아 있으면 다시 pull 이 멈춤. 되돌리기 전 `status/ci` 를 커밋/정리해야 함.
- 분기 복구(`reset --hard`) 시 아직 push 안 된 jsonl 줄은 사라짐 (30분 안 것만 다시 채워짐). 작은 기록 손실.

## 이번 세션 한계

- `KyuuuLee/storeport` 는 이 세션 GitHub 범위 밖이라 존재 여부 확인 못 함.
