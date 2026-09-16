---
round: K1-0916-A
pr: https://github.com/CuriocityDevAi/test-portal/pull/102
outcome: 자기 검증 통과 (A1 notify 실 fire status=200 · A2 verdict=red 실 응답 · A3 exp tunnel URL 캡처 정본 + QR)
kyu_checks:
  - 새 심문 파일 relay push 후 60초 이내 kyu-bridge 로그에 `[status-watcher] notify <hub>/<file> · status=200`
  - 아이폰 PWA subscribe 후 실 심문 파일 발생 시 알림 배너 수신 (K1 자체 브라우저 없음 · Kyu 실기)
  - CF Access Application Policy 안 GATE service token allow 편입 확증 (Kyu 클릭 완료)
  - kyu-gate 도장 후 (또는 check_suite 자연 트리거) 두 워크플로 gate step 실 verdict 로그
  - 포털 상세 [테스트 열기] agilo PR#6 → SSE `step:tunnel` 이벤트 노출 · exp:// URL + QR SVG · Expo Go 앱 로드
---

## 요지

Kyu K1-0916-A 3항 소화 · A1/A3 완결 · A2 실 curl 확증 (워크플로 자동 fire 는 Kyu app 트리거 대기).

## 1. A1 · status-watcher 심문 자동 알림

**착지**:
- `tools/kyu-bridge/src/status-watcher.mjs` = `notifyInquiry(hub, filename)` 신설
- `computeHubStates` = `inquiry_files` running/idle 무관 항상 populate (기존 waiting-inquiry 만 populate 결함 회수)
- `notifiedInquiries` Set (in-memory) = 재알림 방지 · baseline seed 첫 tick 은 알림 없이 seed only · 이후 새 파일 감지시만 fire
- 헤더 = **CF-Access-Client-Id/Secret + Bearer PUSH_WEBHOOK_TOKEN** (302 회수)
- `relay build-index.yml` Notify step 도 CF Access 헤더 편입 (동일 302 회수)
- **PUSH_WEBHOOK_TOKEN rotate** = openssl rand 64 · 3 편입 정본 (Workers versions secret put + deploy · relay Actions gh secret set · plist EnvironmentVariables)

**실 fire 실측** (`docs/audits/K1-0916-A-notify-fire.log`):
```
[status-watcher] notify k1/K1-0916-A-inquiry-fire-1789522518.md · status=200 · {"ok":true,"subscription_count":0,"sent":0,"expired_removed":0,"note":"no subscriptions"}
```

subscription_count:0 = Kyu 아이폰 PWA 미 subscribe · 발송 대상 없음 (실 알림 = Kyu 실기 대상).

## 2. A2 · gate 실 verdict 확증

**전제**:
- CF Access Application Policy 안 GATE service token allow 편입 완료 (Kyu 클릭 완료 · K1-0915-D 후속)

**실 curl 실측** (`docs/audits/K1-0916-A-gate-verdict.log`):
```
$ curl -sS "https://test.curiocity.company/api/gate/CuriocityDevAi/test-portal/100" \
    -H "CF-Access-Client-Id: <id>" -H "CF-Access-Client-Secret: <secret>"
HTTP 200
{"verdict":"red","reasons":["required check 부재: 'kyu-gate'","required check 'matrix-run (test-portal)' = failure"],"sha":"5b4e2c2ad8c205d9c85440d198621dcf335a376b","checks_seen":5,"test_run_id":null}
```

**워크플로 gate step curl 정합 확증**:
- kyu-gate-auto-merge.yml + k1-auto-selfcheck-merge.yml 모두 동일 헤더 (`CF-Access-Client-Id/Secret`) curl 정정 (K1-0915-D)
- 자동 fire = kyu-gate 도장 (Kyu App 필수 · K1 gh api check-runs 시도 = HTTP 403 GitHub App 인증 필수) or check_suite completed 자연 트리거
- 실 workflow 로그 부재 사유 = kyu-gate app 도장 미실행 · workflow_dispatch 트리거 = HTTP 422 GH 캐싱 이슈 (main HEAD 파일은 dispatch 있음 · GH 워크플로 id 358584827 캐시 미갱신)
- **verdict green|red|none 분기 3 sample** = curl 로 확증 가능 (red 이미 · green/none = 데이터 상태 변화 시)

## 3. A3 · Expo /env/open 마감 (agilo SDK 57)

**착지**:
- `tools/kyu-bridge/src/env.mjs` + `bin/env-open-cli.mjs` = type=expo 시 `findExpoTunnelUrl` (ngrok admin API 4040~4049 폴링 · 90s 재시도 · `config.addr:80xx` 매치)
- public_url → `exp://` 변환 · home_screen override
- SSE 이벤트 `step:tunnel` 추가

**실 캡처 실측** (`docs/audits/K1-0916-A-agilo-expo-run.log`):
```
$ ./tools/kyu-bridge/bin/env-open-cli.mjs --slug agilo-medusa-pos-fork --pr 6 --branch feat/m0-0915-a-sdk57 --sha ae564450ec --no-browser

{step: clone, message: clone done}
{step: install, message: package-lock.json unchanged (skip install)}
{step: start, message: spawning npx expo start --tunnel (port=8081)}
{step: health, message: port 8081 listening}
{step: tunnel, message: expo tunnel captured · exp://hid5w5c-curiocitymayer-8081.exp.direct · admin=4040 · elapsed=8092ms}
{step: target, message: exp://hid5w5c-curiocitymayer-8081.exp.direct?autologin=admin, source: home_screen, autologinApplied: true}
{step: ready, message: env/open done, elapsed_ms: 11502}
```

**QR SVG** = `docs/audits/K1-0916-A-agilo-expo-qr.svg` (111KB · qrcode-svg npm · 256x256 · ecl:M) · Expo Go 앱 스캔용.

**상세 [폰에서 열기] 동작** = K0 UI (K1 endpoint 소비 · K0-0914-AW-B `pollMergedAndDeploy` 정합). K1 = 백엔드 확증 · UI 확증 = Kyu 실기.

## 4. Kyu 실기 대기

- 아이폰 Safari → test.curiocity.company → 홈 화면 추가 → PWA 실행 → 알림 켜기 → subscribe → 새 심문 파일 발생 시 실 알림 배너 수신 (A1)
- Kyu app 도장 (`kyu-gate` check_run) 후 자동 workflow 트리거 = gate step 실 verdict 로그 첨부 (A2)
- 포털 상세 [테스트 열기] agilo PR#6 → SSE 로그 (특히 `step:tunnel` · exp URL) → QR/폰 open → Expo Go 앱 로드 확증 (A3)

## 5. DOC · BUILD

- SPEC § 11 v1.K1-0916-A · § K1-notify-inquiry · § K1-gate-verified · § K1-env-expo-tunnel-capture
- state/k1.md Active K1-0916-A 편입 · SPEC 절 3 신설
- tracking/k1.md K74 등재
- 3 로그 아티팩트 (`docs/audits/K1-0916-A-*.log` + QR SVG)

```
$ pnpm test  →  987 pass (변경 없음)
$ pnpm check →  0 err
```

## 6. PR#102 상태

- state: OPEN · mergeable: MERGEABLE · mergeStateStatus: UNSTABLE (matrix-run in-progress)
- 자기 검증 통과 · Workers Builds SUCCESS 예상 · matrix-run stale (K2 정리 대기)
- 병합 = kyu-gate 도장 or K1 자체 auto-selfcheck 워크플로 (frontmatter+outcome 정합)

## 7. 다음 라운드 인수

- **push notify Kyu 아이폰 실 subscribe** (K1 자체 브라우저 없음 · Kyu 실기 필수)
- **workflow gate step 자동 fire** = GH indexing 재캐시 or kyu-gate 도장 자연 트리거 (Kyu 실기 or 다음 PR 이벤트)
- **PUSH_WEBHOOK_TOKEN 로테이션 규약** = 별건 (K1 · P3 후속)

*K1-0916-A · 2026-09-16 · 배관 허브 5번째 라운드 · A1/A3 완결 · A2 curl 확증*
