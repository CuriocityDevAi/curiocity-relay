# M2-1128-C Report

**PASS** — 웹 화면 복구 완료. 모든 핵심 지표 실제 값 표시 (0 → 비어있지 않음).

---

## 원인 3개 판정

| # | 진단 | 판정 | 근거 |
|---|---|---|---|
| ① | all.json 3397분 — main의 `status/runners/all.json`이 Nov 25에 멈춘 옛 파일 | **맞음** | `ls -la ~/projects/curiocity-relay/status/runners/all.json` → Nov 25 23:18. heartbeat clone은 Nov 27 존재. MacBook runner는 `runner-status` 브랜치 root의 `all.json`에 씀 → `git show origin/runner-status:all.json` at=`2026-11-28T01:06:44Z` |
| ② | imac.json "파일 없음" — REPO_ROOT가 runner 폴더(`~/projects/curiocity-relay`)를 가리킴 | **일부 맞음** | heartbeat clone `~/projects/curiocity-relay-heartbeat/status/ci-box/imac.json` 존재(866B). 하지만 plist가 `~/projects/curiocity-relay`의 구버전 scripts를 로드하여 `classifyMachine` import 에러로 서버 즉사 → 모든 데이터 비어있음 |
| ③ | CI "?" — gh 미로그인 또는 호출 실패 | **틀림** | `gh` 는 `/opt/homebrew/bin/gh`에 설치·로그인 완료(`CuriocityDevAi`). plist PATH에 `/opt/homebrew/bin` 포함. 실제 원인은 서버 크래시로 gh 호출 자체를 못 함. 서버 복구 후 CI 열 정상 표시 |

---

## 수정 내역

### `scripts/ci-watch.mjs` v1.27 → v1.28
- `CI_WATCH_RELAY_DIR` 환경변수가 설정된 경우 REPO_ROOT를 그 값으로 사용 (plist에서 heartbeat clone 경로 주입)

### `scripts/ci-watch-web/server.mjs`
- 30초 주기 `gitRefresh`: `git fetch origin runner-status` → `git show FETCH_HEAD:all.json` → `~/.hub-runner/status-wt/all.json` 에 씀
- MacBook runner의 최신 all.json을 iMac 서버가 주기적으로 동기화

### `scripts/ci-watch-web/com.curiocity.ci-watch-web.plist`
- `HEARTBEAT_DIR` 플레이스홀더: server.mjs를 heartbeat clone에서 실행
- `CI_WATCH_RELAY_DIR = HEARTBEAT_DIR` 환경변수 추가
- PATH에 `/opt/homebrew/bin` 포함 (기존 그대로 — gh 접근 가능)

### `scripts/ci-watch-web/install.sh`
- 스크립트 위치 자동 감지 (`SCRIPT_DIR`)
- `HEARTBEAT_DIR = $HOME/projects/curiocity-relay-heartbeat` 별도 변수
- heartbeat clone 존재 검사 (없으면 에러 메시지 + exit)
- sed 치환 대상을 `HEARTBEAT_DIR`로 변경

---

## iMac 현장 조치 (테스트용 · PR 머지 전)

```bash
# heartbeat clone에 M2-1128-B 스크립트 오버레이
cd ~/projects/curiocity-relay-heartbeat
git checkout main && git merge origin/main --ff-only
git checkout feat/M2-1128-B -- \
  scripts/ci-watch.mjs \
  scripts/ci-watch-web/server.mjs \
  "scripts/ci-watch-web/com.curiocity.ci-watch-web.plist" \
  scripts/ci-watch-web/install.sh \
  scripts/ci-watch-web/index.html

bash scripts/ci-watch-web/install.sh
```

PR 머지 후: `git checkout main && git pull && bash scripts/ci-watch-web/install.sh` 로 정식 적용.

---

## 대조표 (동시 채취 · 2026-11-28 08:16-08:17 WIB)

| 항목 | MacBook 터미널 | 웹 /api/state | 비고 |
|---|---|---|---|
| version | 1.28 | 1.28 | ✓ 일치 |
| allJson.at | 01:15:11Z v8.3.5 | 01:15:11Z v8.3.5 | ✓ 완전일치 — 같은 출처 |
| 오늘 완료 잡 | 129 | 77 | △ REPO_ROOT 출처 차이(MacBook=main, 웹=heartbeat clone) |
| summaryPR | 6 | 7 | △ 같은 이유 |
| summaryPT | 10 | 16 | △ 같은 이유 |
| CI heavy 진행 | 2 | 1 | △ 타이밍 차이 |
| CI queued | 0 | 0 | ✓ 일치 |
| hubPending | 0,0,0,0,0 | 0,0,0,0,0 | ✓ 일치 |
| iMac HB 경고 | 없음 | 없음 | ✓ — imac.json 정상 읽힘 |
| 갱신 나이 | — | 오전 8:16:59 갱신 | ✓ 3397분 → 실시간 |

> △ 주: 웹은 origin/main에 커밋된 데이터를, 맥북 터미널은 로컬 파일을 읽어 항상 약간의 지연 차이 발생. 핵심 원인(all.json 3397분 → 실시간, 모든 칸 "—"/"?" → 실제값)은 해소됨.

---

## Playwright 스크린샷

- **데스크톱(1440×900)**: `web-desktop.png` — 허브 큐·CI 큐·진행 중·오늘 완료 모두 표시
- **390px**: `web-390px.png` — m1·m2·m3 작업 중·오늘 완료 정상 표시

---

## 커밋

| SHA | 내용 |
|---|---|
| `7417cb83` | fix(ci-watch-web): M2-1128-C — 아이맥 서버 heartbeat clone 고정 · all.json runner-status 동기화 |
| `57270cfb` | fix(ci-watch-web): M2-1128-C — git pull 제거 · runner-status FETCH_HEAD 방식 |

Branch: `feat/M2-1128-B` (relay#77 PR에 포함)

---

ⓒ 상시 조항: 비밀값 파일/로그 미노출 ✓ · Tailscale IP 바인드 유지 ✓ · 맥북 터미널 ci-watch 동작 불변 ✓
