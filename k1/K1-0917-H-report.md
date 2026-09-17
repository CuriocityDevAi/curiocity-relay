---
round: K1-0917-H
hub: k1
pr: '130'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"SSE ready payload · base_url·home·port 3 필드 편입 · K0-K 리포트 회부 · K0 폴백 없이 직접 열림 · 실 SSE ready 실측 완료"}'
kyu_checks:
  - K0 UI [테스트 열기] · base_url·home·port 3 필드 소비 · 폴백 없이 직접 열림 스샷
  - contract-portal.test.mjs CI 필수 · K0/K1 계약 자동 감시
---

## 요지

R003 완결. K0-K 리포트 회부 = /env/open SSE ready payload 안 `base_url` · `home` · `port` 3 필드 편입 · K0 폴백 없이 직접 열림. env.mjs 두 ready 지점 + 계약 상수 + contract test + 문서.

## PR

- **test-portal PR#130** = https://github.com/CuriocityDevAi/test-portal/pull/130 (feat/k1-0917-h) · merge SHA `46f1122`

## 실측

### A1 · ready payload 3 필드 편입
- **env.mjs** 두 ready sseSend 지점:
  - **deployed** (line 246): `base_url: env.deployed_url` · `home: env.home_screen ?? env.deployed_url` · `port: null`
  - **web/expo** (line 438): `base_url: 'http://127.0.0.1:${env.port}'` · `home: effectiveEnv.home_screen or base_url` (expo 는 exp:// tunnel) · `port: env.port`
- **src/lib/kyu-bridge-env-open.ts** = `ENV_OPEN_READY_REQUIRED_FIELDS` 상수 신설 (K0/K1 공유 계약):
  ```
  ['jobId', 'url', 'base_url', 'home', 'port', 'autologin', 'source', 'elapsed_ms']
  ```
- **contract-portal.test.mjs** 2 case 신규 · **10 pass 총**:
  - ENV_OPEN_READY_REQUIRED_FIELDS 상수 검증 (base_url·home·port 포함)
  - **env.mjs 실 소스 grep 강제** = ready sseSend block ≥2 · 각 안 `base_url` · `home` · `\bport\b` 문자열 편입 확증 (K0/K1 계약 자동 감시)

### A2 · 데몬 재기동 + 실 SSE ready 실측
- daemon: `launchctl kickstart -k gui/$UID` → autoFetchReset (46f1122 merge 반영) → env.mjs 새 코드 로드
- `curl -sN "http://localhost:9876/env/open?repo=todoboss&pr_id=23&token=<t>"` 실 SSE ready:
  ```json
  {
    "jobId": "env-CuriocityDevAi_todoboss-pr23-6824ec",
    "url": "http://127.0.0.1:4321/?test=1&autologin=admin",
    "base_url": "http://127.0.0.1:4321",     ← K1-0917-H 편입
    "home": "http://127.0.0.1:4321/",         ← K1-0917-H 편입
    "port": 4321,                              ← K1-0917-H 편입
    "autologin": "url-query",
    "autologin_applied": true,
    "source": "home_screen",
    "workdir": "/Users/.../pr-23",
    "profile": "/var/folders/.../kyu-chrome-...",
    "elapsed_ms": 36210
  }
  ```
- audit: docs/audits/K1-0917-H-ready-payload.log (67 lines · 계약 + 예상 + 실 payload)

### 문서 정정
- **docs/env-recipes.md § 6.1** = ready payload 계약 표 (11 필드 · 타입 · 설명) 신설
- **tools/kyu-bridge/README.md § HTTP API** = EventSource 예시 안 `r.base_url · r.home · r.port` 소비 편입 + 필수 필드 목록

## 검증

- `pnpm check` = 0 errors 89 warnings (CSS unused · pre-existing)
- `pnpm test` = **1052 pass** (기존 1050 + contract-portal 2 신규)
- 실 SSE ready 3 필드 노출 확증 (elapsed=36.2s · fresh install)
- 착지 前 `git fetch && git merge origin/main` 재실행 (K0-0915-A 규정) · Already up to date

## Kyu 후속 실기

1. **R003 R003**: K0 UI [테스트 열기] · SSE ready 페이로드에서 `base_url` · `home` · `port` 3 필드 소비 · 폴백 없이 직접 열림 · 스샷 첨부
2. contract-portal.test.mjs CI 필수 · K0 client 소비 로직 변경 시 자동 fail (grep 강제)

## 관련 문서

- SPEC v1.K1-0917-H (§ K1-ready-base-url)
- docs/audits/K1-0917-H-ready-payload.log (67 lines · 계약 + 실 payload)
- docs/env-recipes.md § 6.1 ready payload 계약 표
- tools/kyu-bridge/README.md § HTTP API (EventSource 예시)
- src/lib/kyu-bridge-env-open.ts (ENV_OPEN_READY_REQUIRED_FIELDS)
- tools/kyu-bridge/test/contract-portal.test.mjs (10 pass · env.mjs grep 강제)
- docs/state/k1.md · docs/tracking/k1.md K84 편입
