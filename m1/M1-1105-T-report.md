---
round: M1-1105-T
pr: null
outcome: 러너 claude_bin / --model 지정 (실전 1호 R0-1105-Z 404 재발 방지) · 재시도 flow (claim issued) · launchd PATH 명시
kyu_checks: 0 (러너 설정 교체만 — Kyu 가 할 일 "없음")
---

# M1-1105-T · claude bin/model 지정 + 재시도 flow 실전 검증

**일자**: 2026-11-07 · **허브**: M1 · **성격**: 방법론 ⑯ 러너 실전 1호 (R0-1105-Z exit 1 · "API Error: 404 model: claude-sonnet-4-20250514") 뿌리 수정.

---

## 0. 원문 (허브-1107-T) 요약

M1-1105-S 설치 직후 R0-1105-Z 가 5 초만에 exit 1 · 404 모델. 원인: launchd PATH 기준으로 claude 바이너리가 구버전 (1.0.108) 해석 + CLI 의 기본 모델이 서버에서 제거된 sonnet-4 리터럴. 수정 ① claude_bin 명시 ② --model 지정 ③ claim `issued` 재시도 flow 확인 ④ docs 3 줄.

---

## 1. 버전 비교 결과 (뿌리 ①)

```
/Applications/cmux.app/Contents/Resources/bin/claude --version
  → 2.1.128 (Claude Code)  (대화형 쉘 기준)
  → 1.0.108 (Claude Code)  (launchd PATH 에서 실행하면 wrapper 가 /opt/homebrew/bin/claude 를 집음)

/opt/homebrew/bin/claude  --version    → 1.0.108 (Claude Code)
/Users/kyu.lee/.local/bin/claude --version → 2.1.128 (Claude Code)   ← **실 바이너리 · latest · 자동 갱신**
/Users/kyu.lee/.nvm/versions/node/v20.19.6/bin/claude --version → 2.1.128
```

### 왜 cmux 경로가 launchd 아래서 1.0.108 을 돌렸나

`/Applications/cmux.app/Contents/Resources/bin/claude` 는 **wrapper 쉘 스크립트**:
```bash
find_real_claude() {
    local IFS=:
    for d in $PATH; do
        [[ "$d" == "$self_dir" ]] && continue
        [[ -x "$d/claude" ]] && printf '%s' "$d/claude" && return 0
    done
}
```
`$PATH` 를 뒤져 **첫 번째로 찾은 실 바이너리** 를 호출. launchd 의 PATH=`/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin` 에서 `/opt/homebrew/bin/claude` (1.0.108) 가 가장 먼저 걸림. 1.0.108 은 서버가 제거한 `claude-sonnet-4-20250514` 모델을 기본값으로 호출 → 404.

### 선택
`/Users/kyu.lee/.local/bin/claude` → `~/.local/share/claude/versions/2.1.128` 심링크. 심링크 덕에 2.2+ 가 오면 자동으로 전환. `runner-config.json.claude_bin` 에 이 경로를 pin.

---

## 2. 변경 요지 (relay 안만)

| 파일 | 변경 |
|------|------|
| `status/runner-config.json` | schema v2 · `claude_bin` (전역) · `model` (기본 `opus`) · 허브별 `claude_bin`/`model` override 가능 · claude 경로 실측 메모 포함 |
| `scripts/hub-runner.mjs` | `loadConfig` 전역 반환 (claude_bin/model/hubs) · `getClaudeVersion(bin)` 캐시 · `spawnClaude(item,cwd,bin,model)` 가 `--model` 전달 + 로그 헤더에 **claude_version·model·process_env_path** 기록 · `CLAUDE_BIN` 환경변수 override 유지 · 사용하지 않는 `findInPath` 제거 |
| `scripts/claim.mjs` | `VALID_STATES` 에 `issued` 추가 — blocked 를 러너가 재집도록 되돌리는 경로 |
| `scripts/hub-runner-install.sh` | plist PATH 라인 정규화: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin` (+ HOME 유지) |
| `docs/hub-runner.md` | "claude 경로·모델 바꾸는 법" 3 줄 블록 추가 |

### 핵심 코드

**spawnClaude 로그 헤더**
```
# hub-runner log · R0-1105-Z
started_at: 2026-11-07T14:05:24.753Z
hub: r0
cwd: /Users/kyu.lee/projects/pos-r0
claude_bin: /Users/kyu.lee/.local/bin/claude
claude_version: 2.1.128 (Claude Code)
model: opus
process_env_path: /opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
log: /Users/kyu.lee/.hub-runner/r0/R0-1105-Z.log
```

**실행 커맨드**
```
claude -p <prompt> --model opus --dangerously-skip-permissions
```

---

## 3. 재시도 flow (뿌리 ③)

`scripts/claim.mjs <ID> issued "<reason>"` → claim.state=`issued` → 러너 `pickNext` 가 `!claim || claim.state === 'issued'` 로 집는다.

**R0-1105-Z 실전 재시도 타임라인**

| 시각 (UTC) | 사건 |
|-----------|------|
| 13:46:52 | 1호 blocked (cmux wrapper + 1.0.108 · 404 sonnet-4) |
| 14:03:16 | `claim issued` (1차 재시도 · post code 교체 전) |
| 14:04:03 | 러너 pick → spawn (아직 수정 전 runtime · cmux wrapper 1.0.108) → exit 1 404 opus-4-1 |
| 14:04:19 | launchd kickstart 후 재기동 (version=2.1.128 · PATH 표시) |
| 14:04:36 | `claim issued` (2차 재시도 · post code 교체 뒤) |
| **14:05:24** | **러너 pick → spawn (bin=~/.local/bin/claude · ver=2.1.128 · model=opus)** |
| 14:06+ | **30 초 이상 claude 가 살아 있음** (claim 여전히 `started`) → 404 재발 없음 |

**pick 로그**
```
[hub-runner 2026-11-07T14:04:19.111Z] 시작 · mode=--all · once=false · poll=60000ms · claude=/Users/kyu.lee/.local/bin/claude · version=2.1.128 (Claude Code) · model=opus · PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
[hub-runner 2026-11-07T14:04:21.174Z] heartbeat pushed
[hub-runner:r0 2026-11-07T14:05:24.752Z] pick · R0-1105-Z
[hub-runner:r0 2026-11-07T14:05:24.753Z] spawn claude -p · ID=R0-1105-Z · cwd=/Users/kyu.lee/projects/pos-r0 · bin=/Users/kyu.lee/.local/bin/claude · ver=2.1.128 (Claude Code) · model=opus
[hub-runner:claim 2026-11-07T14:05:24.755Z] R0-1105-Z → started · runner
```

**현재 claim**
```json
{ "id":"R0-1105-Z", "hub":"r0", "state":"started",
  "at":"2026-11-07T14:05:24.784Z", "note":"runner" }
```

→ 러너가 올바른 바이너리·모델로 **실행 중**. 완료까지는 R0 허브 책임 (task scope "완료까지 기다릴 필요 없음").

---

## 4. launchctl 상태 (뿌리 ⑥)

```
$ launchctl list | grep hub-runner
16881	0	com.curiocity.hub-runner

$ ls ~/Library/LaunchAgents/com.curiocity.hub-runner*.plist
.../com.curiocity.hub-runner.plist   (1 건 · 레거시 없음)
```

**plist 환경변수** (뿌리 ②)
```xml
<key>EnvironmentVariables</key>
<dict>
  <key>PATH</key>
  <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  <key>HOME</key>
  <string>/Users/kyu.lee</string>
</dict>
```
러너 시작 로그 1 줄 (`process.env.PATH` 포함):
```
시작 · mode=--all · once=false · poll=60000ms · claude=/Users/kyu.lee/.local/bin/claude · version=2.1.128 (Claude Code) · model=opus · PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
```

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| curiocity-relay 만 수정 · 제품 리포 0 | ✓ |
| runner-config 전역 `claude_bin` · 실측 후 **최신 경로** 지정 | ✓ (`~/.local/bin/claude` 2.1.128) |
| runner-config 전역 `model` · 기본 `opus` · 허브 override 가능 | ✓ |
| 러너: `claude -p <prompt> --model <model> --dangerously-skip-permissions` | ✓ |
| 스폰 전 `<claude_bin> --version` 로그 헤더에 기록 | ✓ (`claude_version:` 필드) |
| launchd plist PATH (/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin) + HOME 명시 | ✓ |
| 러너 로그 1 줄에 `process.env.PATH` | ✓ (`시작 · … · PATH=…`) |
| `claim issued` 로 blocked 재시도 발사 · 러너 재픽 | ✓ (R0-1105-Z 실증 2 회) |
| R0-1105-Z 실전 재시도 → claude 30 초 이상 생존 · 로그 헤더 버전/모델 | ✓ |
| docs "claude 경로·모델 바꾸는 법" 3 줄 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. Kyu 가 할 일

**없음** — 러너가 올바른 바이너리/모델로 돌고 있고, R0-1105-Z 는 실행 중. 결과는 R0 허브가 책임지는 범위.

(claude-code 새 버전이 더 나오면 `~/.local/share/claude/versions/` 심링크가 자동 갱신되어 러너도 다음 kickstart 뒤 반영 — 수동 개입 불필요.)

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (R0-1105-Z 404 뿌리 — launchd 환경에서 cmux wrapper 가 구버전으로 폴백) |
| 해소 | +1 (재시도 flow 검증 — `claim issued` 가 실사용 가능) |
| 신규 요구 | 0 |
| **총 순증감** | **+2 해소** |

---

## 8. 다음 게이트

1. 24h 러너 돌림. 2.1.128+ 쓰면서 추가 404/모델 이슈 없는지 Kyu 모니터.
2. (선택) runner-config.json 에 `claude_version_min` 체크 추가 — `--version` 이 기대보다 낮으면 러너가 자가 블록.
3. (선택) claim.mjs 에 `--retry-of <prev-blocked>` 메타데이터 — 재시도 사이클 추적.

---

*M1-1105-T · 2026-11-07 · claude_bin pin (~/.local/bin/claude 2.1.128) · --model opus · claim issued 재시도 flow · R0-1105-Z 재시도 30초+ 생존 입증 · 러너 live (pid 16881 · plist 1 개)*
