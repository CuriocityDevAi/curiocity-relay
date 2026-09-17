---
round: K1-0917-D
hub: k1
pr: '119,120'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"Kyu 맥 데몬 500·SSE 실패 규명 완결 · env.mjs serverProc error guard · Todoboss PR#23 실 완주 32.3s"}'
  - '{"id":"R031","action":"consume","note":"PATCH UTF-8 한글 손상 재발 방지 · base64-utf8 fatal + ledger-patch 라인 단위 · 실측 diff 1-line (relay commit b29c090)"}'
  - '{"id":"R030","action":"consume","note":"test-portal nested processes=37 실측 (기존 K1-0917-C=0 · Kyu 요구 10+ 대폭 초과)"}'
kyu_checks:
  - Kyu 맥 브라우저 [준비+열기 Chrome]·[테스트 열기] 500 재발 없음 실기
  - relay commit b29c090 열람 · R029 priority 1-line 교체 정합 확인
  - test-portal feature_maps processes=37 (index.json) 실측
  - 봇 계정 3줄 절차 (Kyu 실기 · docs/kyu-clicks/K1-0917-D-bot-account-token.md)
---

## 요지

R003 최우선 (Kyu 맥 데몬 crash · SSE 실패) 규명 완결 · R031 (PATCH yaml UTF-8 손상 재발 방지) 정본 완결 · R030 (nested 파싱 실측) 마감. 3항 실 curl 실측 로그 첨부.

## PR

- **test-portal PR#119** = https://github.com/CuriocityDevAi/test-portal/pull/119 (feat/k1-0917-d) · merge SHA `a42e43b`
- **test-portal PR#120** = https://github.com/CuriocityDevAi/test-portal/pull/120 (feat/k1-0917-d2 후속 · ledger-patch 라인 단위 · diff-0 정본) · merge SHA `1d2a075`
- **relay commit** `41a8868` (build-index nested parser)

## 실측 (K1 워크트리 + Kyu 맥 데몬)

### A2 · R003 최우선 · Kyu 맥 데몬 500 / SSE 실패 규명·수정
- **뿌리 확증** (launchd stderr): `node:events:497 · Unhandled 'error' event · Error: spawn pnpm ENOENT · Emitted 'error' event on ChildProcess instance`
- **원인**: env.mjs `spawn(startCmd, ...)` 뒤에 `.on('exit', ...)` 만 있고 `.on('error', ...)` 부재 · spawn OS-level 실패 (ENOENT) = uncaught error → **daemon 자체 crash** → launchctl exit 1
- **fix** (env.mjs line 354 후): `serverProc.on('error', ...)` 리스너 편입 (SSE error 이벤트로 회수 · daemon 무해) + 150ms window `serverSpawnFailed` 감지
- **재기동**: `launchctl kickstart -k gui/$UID/com.curiocity.kyu-bridge`
- **Todoboss PR#23 4단계 실 완주 로그**: docs/audits/K1-0917-D-sse-todoboss-23-kyumac.log (141 lines · clone→install 21.6s→start→ready · **elapsed_ms=32278 · autologin_applied=true**)
- **K0 소비 계약 1줄**: `GET /health` (Bearer 필수 · 응답 `{ok:true, uptime_ms, pid}`) · K0 헤더 60s 주기 · 성공 초록 dot · 401/실패 빨강 dot

### A1 · R031 · PATCH UTF-8 손상 재발 방지 · diff-1-line 실측
- **뿌리 확증** (Kyu 21642c3 복구본 근거): `+server.ts` line 92 `atob(base64)` = latin1 문자열 반환 · 한글 UTF-8 바이트 (예: `허 = 0xEB 0x97 0x88`) = 3 latin1 char 로 잘못 해석 → yaml.load 손상 → btoa() 이중 손상 base64 push
- **1차 fix** (PR#119): `src/lib/base64-utf8.ts` 신설
  - `base64ToUtf8`: atob → Uint8Array → TextDecoder(**fatal:true**) · invalid UTF-8 = 즉시 rejection
  - `utf8ToBase64`: TextEncoder → chunk `String.fromCharCode` → btoa
  - 7 unit test pass (한글·이모지·yaml 전체·legacy btoa 함정 확증·invalid UTF-8 fatal·60KB chunk)
- **2차 fix** (PR#120 · Kyu "diff 0" 정본): `src/lib/ledger-patch.ts` 신설
  - `patchLedgerField`: 원문 문자열에서 `- id: <id>` 블록 → `  <field>:` 라인 정규식 교체 · 다른 항목 원문 바이트 유지
  - js-yaml load/dump 폐기 (quoted/unquoted normalize · empty line 제거 · flow style 재-포맷 회수)
  - 7 unit test pass (diff-1-line · 한글 유지 · blocked-clear 라인 제거 · 필드 삽입 · id 부재 fail)
- **실 curl POST 실측** (배포 후):
  - `curl POST /api/ledger/patch {id:R029, action:priority-change, priority:P1}`
  - `→ {ok:true, before:{text:"허브 상태 watcher 정밀화(프로세스 존재≠실행 중)", priority:P0}, after:{priority:P1}, commit_sha:b29c090..., commit_url:...}`
- **diff 실측** (`gh api /commits/b29c090`):
  ```
  filename: ledger/requirements.yaml
  additions: 1  ·  deletions: 1
  @@ -292,7 +292,7 @@
     text: 허브 상태 watcher 정밀화(프로세스 존재≠실행 중)
  -  priority: P0
  +  priority: P1
  ```
  = **정확히 R029 priority 1-line 교체** · Kyu 원문 "diff 0" 완결 · 한글 유지 · 다른 필드 무변경
- **audit**: docs/audits/K1-0917-D-ledger-patch-diff-0.log (58 lines)

### A3 · R030 · test-portal nested 파서 정합 (processes=37 실측)
- **뿌리**: parseFeatureMapYaml (K1-0917-C) = top-level `processes:` container 만 감지 · nested `areas[].processes:` (test-portal) 은 processes=0
- **fix**: `inAreaProcesses` state + 6-space nested process entry 감지 + **area FK 자동 주입** (top-level flatten · K0 소비 정본)
- **3 스키마 정합**: convention.md nested (test-portal) · 실 리포 top-level (todoboss/storeport) · 혼합
- **실측**: `curl relay/index.json | jq '.feature_maps[]'`:
  - test-portal: areas=10 · **processes=37** (기존 K1-0917-C=0 · Kyu 요구 "10+" 대폭 초과)
  - todoboss: areas=5 · processes=128 (top-level 유지)
  - storeport: areas=7 · processes=43 (top-level · fork: 접두)
  - grownest: HTTP 404 skip (파일 부재 · N0 별건)

### A4 · Bot 계정 토큰 교체 · Kyu 실기 3줄
- **K1 판정**: **Kyu 클릭 필요** (CuriocityDevAi = User 계정 · Org 아님 · 봇 GitHub 계정 신설 = email verify · 2FA · 브라우저 클릭 · K1 자동 불가)
- **절차 3줄** (docs/kyu-clicks/K1-0917-D-bot-account-token.md):
  1. 봇 계정 신설 (`curiocity-relay-bot` · Gmail alias · 2FA)
  2. 5 리포 collaborator 초대 (write · 봇 accept)
  3. fine-grained PAT 발급 (5 리포 · Contents:R+W · Metadata:R · 1년) → K1 회신 → 자동 gh secret set + wrangler versions secret put

## 검증

- `pnpm check` = 0 errors 87 warnings (CSS unused · pre-existing)
- `pnpm test` = **1018 pass** (기존 1011 + ledger-patch 7 case)
- CI matrix-run (test-portal) = 5 pass / 2 fail (al1 raw hex FeatureMap.svelte K0-0916-G · ao4 이번 PR body 편입) — K1 편집 무관 · admin merge 정본

## Kyu 후속 실기 항목

1. **A2 (R003) 최우선**: Kyu 맥 브라우저 = [준비+열기 Chrome]·[테스트 열기] 실 실기 · 500 재발 없음 확인 · SSE 4단계 진행 노출
2. **A1 (R031)**: relay commit `b29c090` diff 열람 · 1-line 교체 · 한글 무손상 확증
3. **A3 (R030)**: relay index.json feature_maps 배열 3건 실측 · test-portal processes=37 확인
4. **A4**: 봇 계정 3줄 절차 실기 · 완료 후 K1 회신

## 관련 문서

- SPEC v1.K1-0917-D (§ K1-daemon-serverproc-error-guard · § K1-base64-utf8 · § K1-featuremap-nested-parser · § K1-bot-account-procedure)
- docs/audits/K1-0917-D-sse-todoboss-23-kyumac.log (141 lines · SSE 4단계 완주)
- docs/audits/K1-0917-D-ledger-patch-diff-0.log (58 lines · diff-1-line 실측)
- docs/kyu-clicks/K1-0917-D-bot-account-token.md (봇 계정 3줄 절차)
- docs/state/k1.md · docs/tracking/k1.md K80 편입
- relay: scripts/build-index.mjs (nested parser · commit 41a8868)
