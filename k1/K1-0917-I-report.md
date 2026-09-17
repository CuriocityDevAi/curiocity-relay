---
round: K1-0917-I
hub: k1
pr: '131'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"Chrome 환영 화면 억제 (3 플래그 + First Run 마커) · progress label 13종 · 실 SSE progress label 5종 노출 확증"}'
kyu_checks:
  - Kyu 맥 브라우저 [테스트 열기] · 환영 화면 0 · localhost:4321 바로 열림 스샷
  - K0 UI 진행 로그 = 사람 문장 노출 확증 (설치 중 · 서버 시작 중 등)
---

## 요지

R003 완결. Kyu 09-17 실기 = "새 Chrome 이 환영 화면에서 멈춤 · URL 삼킴 · 진행 로그 [] 절반" 뿌리 완결. Chrome 3 플래그 + First Run 마커 (이중 억제) + progress label 13종 매핑 + 실 SSE 확증.

## PR

- **test-portal PR#131** = https://github.com/CuriocityDevAi/test-portal/pull/131 (feat/k1-0917-i) · merge SHA `1158439`

## 실측

### A1 · Chrome 환영 화면 억제 (R003)
- **뿌리** (Kyu 09-17 실기): 새 Chrome 이 환영 화면에서 멈춤 · URL 이 first-run flow (welcome · sign-in · sync · 기본 브라우저) 뒤로 삼켜짐
- **fix (2 지점)**:
  - `openChromeCleanProfile` 명령 = `--no-first-run` + `--no-default-browser-check` + `--disable-sync` 편입 (welcome · 기본 브라우저 팝업 · 계정 로그인 유도 억제)
  - `createTempProfile` = `<profileDir>/First Run` 마커 파일 사전 생성 (Chrome 이 "이전 실행 있음" 으로 인식 · welcome UI skip · 이중 보험)
- **Safari** = 무변경 (`open -a Safari <url>` · 원 UI 필요 없음)

### A3 · progress label (R003)
- **뿌리** (Kyu 원문): "SSE 진행 이벤트 payload에 사람 문장 label 필드 · 포털 진행 로그 [] 원인 절반"
- **fix**: `env.mjs sseProgress` 헬퍼 + `labelForStep` 매핑 신설
- **labelForStep 13종 정본**:
  - `start` → "시작" · `skip-build` → "배포된 웹 열기"
  - `clone` → "체크아웃 중" · `install` → "설치 중" (Kyu 원문)
  - `migrate` → "마이그레이션 중" (Kyu 원문) · `seed` → "시드 데이터 넣는 중" (Kyu 원문)
  - `server` → "서버 시작 중" (Kyu 원문) · `health` → "서버 응답 확인 중"
  - `tunnel` → "터널 URL 잡는 중" · `browser` → "브라우저 여는 중"
  - `validate` → "입력 확인 중" · `whitelist` → "주소 화이트리스트 확인"
  - `ready` → "준비됨" (Kyu 원문)
- **12 progress 지점 refactor** · env.mjs handler 안 원시 `sseSend(res, 'progress', ...)` = 0 (helper 정의 안 1 · 정본)

### Contract test (12 pass · 2 신규)
- `sseProgress` helper 강제 (원시 호출 = 1 · install/migrate/seed/server/ready 5 label 매핑)
- Chrome 3 플래그 + First Run 마커 grep 강제

### A2 · daemon 재기동 + 실 SSE progress label 실측
- `launchctl kickstart -k gui/$UID` → autoFetchReset (1158439 반영) → env.mjs + env-browser.mjs 새 코드 로드
- 실 SSE:
  ```
  event: progress · {"step":"start", ..., "label":"시작"}
  event: progress · {"step":"clone", ..., "label":"체크아웃 중"}
  event: progress · {"step":"install", ..., "label":"설치 중"}
  event: progress · {"step":"server", ..., "label":"서버 시작 중"}
  event: progress · {"step":"browser", ..., "label":"브라우저 여는 중"}
  ```
- audit: docs/audits/K1-0917-I-chrome-progress.log (74 lines · 계약 + 실 payload)

## 검증

- `pnpm check` = 0 errors 89 warnings (CSS unused · pre-existing)
- `pnpm test` = **1054 pass** (1052 기존 + contract-portal 2 신규 · 총 12 case)
- 실 SSE progress label 5종 확증 · Chrome 3 플래그 + 마커 daemon 반영

## Kyu 후속 실기

1. **R003 스샷**: Kyu 맥 `test.curiocity.company/pr/CuriocityDevAi/todoboss/23` · [테스트 열기] · **환영 화면 0** · 새 Chrome 이 `localhost:4321/?test=1&autologin=admin` 로 바로 열림 스샷
2. K0 UI 진행 로그 = 사람 문장 노출 확증 ("설치 중" · "서버 시작 중" 등) · 나머지 절반 (K0 UI 파싱) = 별건 K0 라운드

## 관련 문서

- SPEC v1.K1-0917-I (§ K1-chrome-suppress-welcome · § K1-progress-label)
- docs/audits/K1-0917-I-chrome-progress.log (74 lines · 계약 + 실 label 5종)
- tools/kyu-bridge/src/env-browser.mjs (openChromeCleanProfile 3 플래그 + createTempProfile 마커)
- tools/kyu-bridge/src/env.mjs (sseProgress helper + labelForStep 13종 + 12 지점 refactor)
- tools/kyu-bridge/test/contract-portal.test.mjs (12 pass · 2 신 case)
- docs/state/k1.md · docs/tracking/k1.md K85 편입
