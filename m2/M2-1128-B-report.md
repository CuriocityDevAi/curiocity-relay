# M2-1128-B 리포트

PASS · PR #77 · http://100.82.115.70:7700

---

## 검증 결과

### REQ 1 — collectData() 추출 (터미널 화면 무변경)
- `scripts/ci-watch.mjs` 의 `tick()` 에서 데이터 수집 로직 전체를 `export async function collectData()` 로 분리
- `tick()` 는 `collectData()` 호출 후 render 전담
- `skipNotify: true` 파라미터로 웹 서버 호출 시 macOS 알림 차단
- CI_WATCH_VERSION: 1.26 → 1.27

### REQ 2 — 웹 서버 (Tailscale 전용)
- `scripts/ci-watch-web/server.mjs` — Node.js built-in `http` 모듈만 사용
- 바인딩: `100.82.115.70:7700` (0.0.0.0 금지 준수)
- 4초 서버사이드 캐시 · `~/.ci-watch-web/state.json` 상태 저장
- launchd 서비스 등록: `com.curiocity.ci-watch-web` (RunAtLoad · KeepAlive)
- install.sh: nvm 경로 자동 탐색 (`~/.nvm/versions/node/*/bin/node`)

### REQ 3 — curl 검증 (맥북 → 아이맥 Tailscale)
```
curl -sv http://100.82.115.70:7700/api/state → HTTP/1.1 200 OK
응답: {"allJson":{"at":"2026-11-25T16:18:29.408Z",...}, "_fetchedAt":"2026-11-28T00:07:05.792Z", ...}
```

### 숫자 대조표 (2026-11-28 07:07 KST 기준)

| 항목 | 웹 대시보드 | 터미널 |
|------|-----------|--------|
| 진행 중 (pipelinePrompts) | 0 | 0 |
| 허브 큐 (hubPending 합계) | 0 | 0 |
| CI 큐 heavy queued | 1 | 1 |
| CI 큐 heavy inProgress | 0 | 0 |
| CI 큐 light queued | 0 | 0 |
| summaryPR | 0 | 0 |
| summaryJobs | 0 | 0 |

**판정: 일치**

### REQ 4 — Tailscale 밖 접근 차단 (아이맥 LAN IP)
```
curl -sv http://192.168.68.133:7700/
→ connect to 192.168.68.133 port 7700 failed: Connection refused
```
**판정: LAN IP 접근 차단 확인**

### 스크린샷
- 데스크톱 (1280px): `~/projects/curiocity-relay-wts/M2-1128-B/screenshots/desktop.png`
- 모바일 (390px): `~/projects/curiocity-relay-wts/M2-1128-B/screenshots/mobile-390.png`

---

## PR 체크리스트

- [x] PR #77 오픈: `feat/M2-1128-B` → `main`
- [x] 커밋 1: `feat(ci-watch-web): M2-1128-B` — 웹 서버 · HTML · plist · install.sh · spec
- [x] 커밋 2: `fix(ci-watch-web): M2-1128-B` — install.sh nvm 경로 탐색 fix
- [x] `scripts/ci-watch.mjs` CI_WATCH_VERSION 1.27 · collectData() export
- [x] `scripts/ci-watch-web/server.mjs` 생성
- [x] `scripts/ci-watch-web/index.html` 생성
- [x] `scripts/ci-watch-web/com.curiocity.ci-watch-web.plist` 생성
- [x] `scripts/ci-watch-web/install.sh` 생성
- [x] `specs/screens/ci-watch.md` 웹 화면 섹션 추가

---

## 아이맥 배포 현황

서비스 상태: `launchctl list com.curiocity.ci-watch-web` → 실행 중
- Node 경로: `/Users/kyu.lee/.nvm/versions/node/v20.19.6/bin/node`
- 로그: `~/.hub-runner/ci-watch-web.log`
- 오류 로그: `~/.hub-runner/ci-watch-web.err.log`

## 설치 / 제거

```bash
# 설치 (아이맥에서)
bash ~/projects/curiocity-relay/scripts/ci-watch-web/install.sh

# 제거
bash ~/projects/curiocity-relay/scripts/ci-watch-web/install.sh --uninstall
```
