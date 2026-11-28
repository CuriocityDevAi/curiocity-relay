# M1-1128-D 리포트

**PASS** — heartbeat clone 충돌(diverged + staged) → 웹 전용 read-only clone 분리로 해결. PR #78 · #79 · #80.

## 원인 실측 (iMac SSH)

| 항목 | 확인 내용 |
|---|---|
| `curiocity-relay-heartbeat` 마지막 커밋 | `44d731a4 · 2026-11-28 08:11 WIB` (remote HEAD `536eb707` 보다 뒤처짐) |
| `git status` | `A scripts/ci-watch-web/*` staged · `M scripts/ci-watch.mjs` modified |
| err.log 핵심 오류 | `fatal: Not possible to fast-forward, aborting.` — `git pull --ff-only` 실패 |
| 웹 데이터 동결 시각 | 08:05 WIB (pull 실패 직전 마지막 성공) |
| heartbeat clone = 웹 clone? | YES — plist `WorkingDirectory` + `CI_WATCH_RELAY_DIR` 모두 `curiocity-relay-heartbeat` |

staged changes가 `git pull --ff-only` 를 막아 08:05 이후 데이터가 갱신되지 않았음.

## 수정

**PR #78** `fix(ci-watch-web): M1-1128-D — 웹 전용 read-only clone 분리 · 스피너 CSS 애니메이션`

- `server.mjs`: `CI_WATCH_WEB_DIR` 환경변수 사용. `gitRefresh` = `git fetch origin main` + `git reset --hard origin/main` (커밋·push 금지)
- `com.curiocity.ci-watch-web.plist`: 플레이스홀더 `HEARTBEAT_DIR` → `RELAY_WEB_DIR`, env 키 `CI_WATCH_RELAY_DIR` → `CI_WATCH_WEB_DIR`
- `install.sh`: `~/projects/curiocity-relay-web` 없으면 자동 clone
- `index.html`: ⟳ CSS `@keyframes spin 1s linear infinite` (5초 갱신 무관 항상 회전) · "마지막 갱신 N초 전" 1초 setInterval · 30초 초과 시 머리줄 노랑 `⚠ 데이터 지연`

**PR #79** plist 플레이스홀더 `WEB_DIR` → `RELAY_WEB_DIR` (키 이름 치환 충돌 수정)

**PR #80** plist 키 이름 `CI_WATCH_RELAY_WEB_DIR` → `CI_WATCH_WEB_DIR` 복원

## 아이맥 재설치

```
git clone https://github.com/CuriocityDevAi/curiocity-relay.git ~/projects/curiocity-relay-web
bash ~/projects/curiocity-relay-web/scripts/ci-watch-web/install.sh
```

## 검증 결과

| 항목 | 결과 |
|---|---|
| `/api/state` 진행 중 | 7건 (기존 0건 → 복구) |
| relay claims M1-1128-D | `state: started` → 허브 큐 m1에 "M1-1128-D 작업 중 (16분)" 표시 ✓ |
| iMac heartbeat 경고 | `runnerAlerts: []` — 경고 없음 ✓ |
| m3 데이터 | M3-1128-F 정상 표시 (기존 "—") ✓ |
| Playwright snap1 → snap2 (3초 간격) | 09:54:33 → 09:54:39 · "마지막 갱신 2초 전" → "0초 전" · ⟳ 스피너 표시 ✓ |
| 데이터 지연 경고 | 30초 초과 시 노랑 "⚠ 데이터 지연" 배지 구현됨 |

## Kyu 재실기 정상 확인 기준

http://100.82.115.70:7700 열었을 때:
- 오른쪽 상단 ⟳ 회전 중 + "마지막 갱신 N초 전" 표시
- 허브 큐 m1 줄에 현재 작업 ID 표시
- 진행 중 섹션에 프롬프트 목록이 비어있지 않음
- iMac 주의 경고 없음

---
ⓒ M1-1128-D · 2026-11-28 · claude-sonnet-4-6
