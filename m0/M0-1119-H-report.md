relay PR #7 · job별 runner O · 기록 jsonl O(7줄) · today 요약 O · 비용 O · 끝남-미착지 감지 O · 테스트 10/10

## 커밋 SHA

114c874abc6cb5817412a7823b0c633bc9c4f810

## `--once` 실행 결과 요약 (2026-11-19T07:11:54Z)

- heavy.in_progress[0].runner = "Youngkyus-MacBook-Pro-M1"
- heavy.queued = 4, queued_prs = [384, 383, 389, 388]
- today.mac-heavy: jobs=3, avg_run_min=2, success_rate=100%
- today.mac-light:  jobs=2, avg_run_min=0.3, success_rate=100%
- today.cloud:      jobs=2 (conclusion=skipped), cloud_cost_usd=0
- jsonl_added = 7
- alerts = [queue_wait: oldest heavy queued 47m (#388)]

## jsonl 샘플 (status/ci/2026-11-19.jsonl)

{"id":135385513443,"repo":"CuriocityDevAi/storeport","pr":392,"workflow":"ci","job":"markers-and-forbidden","runner_kind":"mac-light","runner_name":"curiocity-mac-light","queued_at":"2026-11-19T06:29:45Z","started_at":"2026-11-19T06:31:48Z","completed_at":"2026-11-19T06:32:08Z","wait_min":2,"run_min":0.3,"conclusion":"success"}
{"id":135385513648,"repo":"CuriocityDevAi/storeport","pr":392,"workflow":"ci","job":"changes-filter","runner_kind":"mac-light","runner_name":"curiocity-mac-light","queued_at":"2026-11-19T06:29:45Z","started_at":"2026-11-19T06:32:11Z","completed_at":"2026-11-19T06:32:27Z","wait_min":2,"run_min":0.3,"conclusion":"success"}
{"id":135386302325,"repo":"CuriocityDevAi/storeport","pr":392,"workflow":"ci","job":"build-commerce-core","runner_kind":"mac-heavy","runner_name":"Youngkyus-MacBook-Pro-M1","queued_at":"2026-11-19T06:29:45Z","started_at":"2026-11-19T06:36:25Z","completed_at":"2026-11-19T06:38:19Z","wait_min":7,"run_min":1.9,"conclusion":"success"}

## PR 링크

https://github.com/CuriocityDevAi/curiocity-relay/pull/7

## Kyu 몫 명령 (러너 재설치)

launchctl unload ~/Library/LaunchAgents/com.curiocity.hub-runner.plist && launchctl load ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
