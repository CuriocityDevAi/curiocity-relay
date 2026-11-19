relay #7 CHANGES · 엉뚱한 러너 파일(옛 -p 러너)에 붙였고, 새 jsonl 파일 때문에 러너가 pull 을 멈춰 모든 허브가 멈출 수 있음

# R0C-1119-O · relay PR #7 리뷰 (M0-1119-G/H · hub-runner v7.6)

- 리뷰 대상: `pr7` HEAD `114c874a` · 2026-11-19 · R0 클라우드
- 판정: **CHANGES** (머지 금지 권고 · 코드 수정은 안 함)

## 꼭 고칠 것 (러너가 멈추는 문제)

1. **기준 파일이 틀림.** 실제 Mac 에서 도는 러너는 `hub-runner-v7.4.mjs` (3808줄 · cmux-split · 복구/착지감지/폴더가드 · `hub-runner-install.sh` TARGET=v7.4). 그런데 이 PR 은 옛 `-p` 단순 러너인 `scripts/hub-runner.mjs`(437줄)를 고쳐서 v7.5(457줄)·v7.6 으로 이름 붙임. v7.5 머리글은 "v7.4 패치"라고 쓰여 있지만 cmux 코드가 하나도 없음. 이걸 설치하면 v7.x 기능이 전부 사라짐.
2. **러너 pull 이 영원히 멈춤.** `status/ci/<날짜>.jsonl` 을 새로 쓰는데 heartbeat 는 `all.json` 만 `git add`. 그런데 `RUNNER_SCOPE_PREFIXES` 에 `status/ci/` 가 없음 → `outOfScopeChanges()` 가 이 파일을 "스코프 밖 변경"으로 보고 `safePull()` 을 건너뜀 → 새 큐를 못 받음 + heartbeat push 는 non-fast-forward 로 계속 실패. **모든 허브가 멈춤.** (`status/ci/` 를 스코프에 넣고 heartbeat 커밋에 같이 add 해야 함.)
3. **suspect_done 이 진행 중인 작업을 망칠 수 있음.**
   - 이 러너는 `claude -p` 를 백그라운드로 띄움 → 입력받을 창이 없음. `tmux` 로 창을 찾는데 실제는 cmux. 대부분 그냥 안 됨.
   - 그런데 blocked 승격 시 `busy.delete(hub)` → 기존 claude 가 아직 돌고 있는데 같은 폴더에 새 claude 를 또 띄움. 나중에 옛 child 가 끝나면 또 `busy.delete` 해서 새 작업의 busy 까지 지움 (연쇄).
   - "5분 계속 대기" 가 아니라 "처음 한 번 프롬프트로 보인 뒤 5분" 이면 입력 보냄 (`promptSince` 리셋 없음).
   - 셸 프롬프트 판별 `/\$\s*$|%\s*$|>\s*$/` 는 `50%` 출력·heredoc `> ` 에도 걸림 → 실행 중 명령에 글자를 넣을 수 있음.
   - 보고서가 있어도 허브가 Kyu 승인 질문 중일 수 있음 → 자동 "착지" 는 storeport §11.4 착지 게이트(UX 변경은 Kyu 실기 승인 후 착지) 위반 가능.
4. **tick 이 느려질 수 있음.** `await writeHeartbeat()` 안에서 gh 호출을 순서대로 (2 + 진행중 run 수 + 1) 번, 각 20초 타임아웃. 락을 잡은 채 수 분 멈출 수 있음. 전체 마감시간(예: 30초)과 "백그라운드 1개만" 플래그 필요. 자식 IIFE 의 heartbeat 와 동시에 돌면 gh 조회·커밋이 2번 됨.

## 정확성 문제

- `runner_labels` 는 workflow run API 에 없는 필드 → heavy/light 분류가 항상 "전부 heavy" 로 떨어짐. light 대기·`light_wait` 경보·`cloud_today` 는 항상 0. (storeport 에는 실제로 `curiocity-mac-light`·`ubuntu-latest(linux-check)` job 이 있음.) job API 의 `labels` 를 써야 함.
- 이력 누락: "아직 진행 중인 run" 안의 끝난 job 만 기록. run 이 5분 사이에 다 끝나면 기록 안 됨 (1-job workflow · 마지막 단계 job 대부분 누락). 성공률·평균이 치우침.
- `wait_min` 이 run 생성 시각 기준 → `needs:` 뒤 job 은 대기가 부풀려짐. job 의 `created_at` 사용 권장.
- 날짜: `getWibDateStr` 는 맞음. 그러나 jsonl 파일 날짜를 "기록 시각" 으로 정해서 자정 전후 job 이 다음날로 감. `getTodayWibBoundary` 는 Mac 이 WIB 시간대면 7시간 어긋남.
- 비용: `$0.008/분` — GitHub 가 2026-01 부터 Linux 2-core 를 약 $0.006 으로 내린 것으로 알고 있음(확인 필요). 무료 포함 분수도 반영 안 됨 → "추정치" 로 표기 권장.
- `gh api --paginate` 를 객체 응답에 쓰면 2페이지 이상일 때 JSON 이 붙어 나와 파싱 실패 → 전체 ci 블록 error. `--paginate` 빼거나 `--slurp`.
- 요청한 "storeport·fork" 중 fork 는 조회 안 함.

## 괜찮은 점

- `fetchCiHealth` 는 전체 try/catch 로 reject 안 함 · `summarizeToday` 도 try → 미처리 reject 로 죽지는 않음.
- API 횟수: 5분마다 약 3+N 회 → 시간당 수십~200회, GitHub 한도(5000/h) 대비 여유.
- jsonl 중복 방지(job id) 동작함.

## 테스트

- `node --test scripts/test/` → Node 22 에서는 폴더 지정이 안 돼 실패 (MODULE_NOT_FOUND). 
- `node --test scripts/test/*.test.mjs` → **132 pass / 0 fail**. 단 테스트가 위 1~3번 (스코프·busy·실제 러너) 을 다루지 않음.

## 권고 순서

1. v7.4 위에 다시 패치 (`ci-health`/`ci-history` lib 는 재사용 가능).
2. `status/ci/` 스코프 추가 + heartbeat 커밋에 함께 add.
3. suspect_done 은 우선 "기록·경보만", 자동 입력은 cmux 창 기준·연속 대기 확인·Kyu 승인 후.
4. gh 조회 전체 마감시간 + 비동기 단일 실행.
