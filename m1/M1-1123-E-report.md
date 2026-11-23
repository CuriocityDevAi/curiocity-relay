# M1-1123-E 리포트

판정: ✅ DONE

커밋: scripts/hub-runner-v7.7.mjs · scripts/watch/runner-panel.mjs 추가

---

## 작업 요약

### REQ1: 허브 러너 데이터 relay 공개

`scripts/hub-runner-v7.7.mjs` (v7.6 기반) 에 3개 필드 추가:

| 필드 | 내용 |
|---|---|
| `err_tail` | `~/.hub-runner/launchd.err.log` 마지막 20줄 (토큰·이메일 마스킹) |
| `git_state` | relay git 상태 — ahead/behind · rebase/merge 진행 여부 · 충돌 파일 목록 · needs_human |
| `ci_runners` | `gh api` 로 조회한 self-hosted 러너 3대 name/status/busy (5분 갱신) |

### REQ2: relay git 충돌 자동 해소

`safePull` 에 `tryAutoMergeConflicts()` 추가:
- rebase 충돌 시 `--abort` 후 `git merge --no-commit --no-ff origin/main` 으로 전환
- 충돌 파일이 `status/**` · `hubs.json` · `index*` 뿐이면 `--ours` 채택 후 merge 커밋+push
- `m*/` · `r0/` · `queue/` 가 충돌에 끼면 `git merge --abort` + `git_state.needs_human=true`

### REQ3: 러너 칸 모듈

`scripts/watch/runner-panel.mjs` 생성:
- `export function renderRunnerPanel(data)` — all.json 객체 → 줄 배열
- 허브 5개(m0~m3·r0): 현재 프롬프트 ID·경과 분 · 마지막 활동 몇 분 전 (10분+ 빨강)
- relay git 상태 · CI 러너 3대 online/offline
- 오류 로그 마지막 8줄
- `node scripts/watch/runner-panel.mjs` 단독 실행 시 30초 갱신 화면

---

## all.json 새 필드 샘플 (dry-run 결과)

```json
"err_tail": "[hub-runner-v7.6:git 2026-11-23T09:13:01.483Z] blocked: runner-folder change pending Kyu install · files=m2/M2-1123-C-report.md,...\n...(20줄)",
"git_state": {
  "ahead": 0,
  "behind": 0,
  "rebase_in_progress": false,
  "merge_in_progress": false,
  "conflicted": [],
  "needs_human": false
},
"ci_runners": [
  { "name": "curiocity-mac-light", "status": "online", "busy": false },
  { "name": "Youngkyus-MacBook-Pro-M1", "status": "online", "busy": false },
  { "name": "curiocity-mac-fork", "status": "online", "busy": false }
]
```

---

## 러너 칸 실제 출력 캡처

```
=== 러너 칸 ===  heartbeat 0분 전  runner=v7.6  pid=61245
  m0  idle  마지막활동=33분 전
  m1  M1-1123-E (7분 경과)  마지막활동=17분 전
  m2  idle  마지막활동=34분 전
  m3  M3-1123-E (12분 경과)  마지막활동=43분 전
  r0  idle  마지막활동=51분 전

  git: ahead=0 behind=0

  CI 러너:
    ●OK  curiocity-mac-light
    ●OK  Youngkyus-MacBook-Pro-M1
    ●OK  curiocity-mac-fork

  오류 로그 (마지막 8줄):
    [hub-runner-v7.6:git 2026-11-23T09:13:01.483Z] blocked: runner-folder change pending Kyu install
    ...
```

---

## Kyu 설치 명령

**조건: 허브가 전부 idle 일 때 설치.**

idle 확인:
```
grep '"current"' /Users/kyu.lee/projects/curiocity-relay/status/runners/all.json
```
모든 `"current"` 값이 `null` 이면 설치 가능.

설치:
```
sed -i '' 's/hub-runner-v7.6.mjs/hub-runner-v7.7.mjs/' ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
launchctl unload ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
launchctl load ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
```

설치 확인 (약 30초 후):
```
grep '"runner"' /Users/kyu.lee/projects/curiocity-relay/status/runners/all.json
```
`"runner": "v7.7"` 이면 성공.

러너 패널 단독 실행:
```
node /Users/kyu.lee/projects/curiocity-relay/scripts/watch/runner-panel.mjs
```
