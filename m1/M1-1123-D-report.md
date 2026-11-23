러너: fork(curiocity-mac-fork) online·idle | storeport(curiocity-mac·curiocity-mac-light) offline — launchd 세션 만료 후 미재시작

## 1. 러너 상태

| 러너 | 레포 | 상태 | 비고 |
|------|------|------|------|
| curiocity-mac-fork | agilo-medusa-pos-fork | online · idle | 취소 처리 후 정상 복귀 |
| curiocity-mac-light | storeport | **offline** | 2026-11-21T23:45Z 세션 만료 후 중단 |
| Youngkyus-MacBook-Pro-M1 | storeport | **offline** | 동일 원인 |

## 2. 원인 추정

`~/actions-runner-light/_diag/Runner_20261120-150548-utc.log` 마지막 항목(2026-11-21T23:45Z):

```
TaskAgentSessionExpiredException: Runner session is invalid
Get next message failed with non-retryable error.
```

launchd plist(`~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.*.plist`)에
`KeepAlive` 키 없음 → 프로세스가 exit code 0으로 종료되면 자동 재시작 안 됨.

## 3. 취소한 runs

**agilo-medusa-pos-fork** (1건)
- 45139183727 — PR #228 head 2699044, playwright job Mac에서 멈춤

**storeport** (21건)
- 45140435524 — PR #413 head f1a87e2, in_progress
- 45140488421, 45140432444, 45140431351, 45140241960, 45139839552, 45139815506
- 45139696240, 45139697494, 45139313145, 45139266424, 45139261808, 45139221000
- 45139218926, 45135739042, 45135727398, 45129713262, 45129006211, 45127363976
- 45085997277, 45084495821 — queued 대기열(main head 2b5dffd · 54279de)

## 4. 클라우드 재실행

`workflow_dispatch force_cloud=true` 로 각 PR head 브랜치에 재트리거:

| PR | Run ID | URL | 상태 (작성 시점) |
|----|--------|-----|----------------|
| fork #228 (head 2699044) | 45142225782 | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45142225782 | in_progress (all jobs on GitHub Actions) |
| storeport #413 (head f1a87e2) | 45142230221 | https://github.com/CuriocityDevAi/storeport/actions/runs/45142230221 | in_progress (all jobs on GitHub Actions) |

## 5. Kyu Mac 터미널 재시작 명령

storeport Mac 러너 2대를 재시작:

```bash
launchctl kickstart gui/$(id -u)/actions.runner.CuriocityDevAi-storeport.curiocity-mac-light
launchctl kickstart gui/$(id -u)/actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1
```

재시작 후 온라인 확인:

```bash
gh api repos/CuriocityDevAi/storeport/actions/runners --jq '.runners[] | {name, status, busy}'
```

재발 방지(선택): 각 plist에 `<key>KeepAlive</key><true/>` 추가 후 `launchctl unload`/`launchctl load` 재등록.
