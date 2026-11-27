PASS · PR #63 · head 6da910584 · node --test scripts/test/ci-watch-w121.test.mjs: pass 5 / fail 0

## 작업 요약

- **원인**: `hbAgeMin >= 3` threshold 가 iMac heartbeat 주기(~5분)보다 짧아 거짓 경보 발생
- **수정**: `HB_STALE_MIN = 12` (주기 2배) · origin/main ts 보정(pull 지연 대응) · 경보에 `마지막 HH:MM WIB` 추가
- **함수**: `computeImacHbAlerts(imacJson, nowMs, { thresholdMin, bestTsIso })` pure 함수 export
- **버전**: CI_WATCH_VERSION 1.20 → 1.21
- **테스트**: `scripts/test/ci-watch-w121.test.mjs` 신규 (5건 all pass)
  - F121-no-alert-4min: 4분 전 → 경보 없음 ✓
  - F121-alert-13min: 13분 전 → imac_heartbeat_stale ✓
  - F121-alert-wib: 경보 msg `HH:MM WIB` 포함 ✓
  - F121-missing: 파일 없음 → imac_heartbeat_missing 유지 ✓
  - F121-verify-3min: threshold=3분 → 4분 케이스 경보 발생 (검증의 검증) ✓
- **스펙**: `specs/screens/ci-watch.md` CW-ALERT 문턱 12분 반영 · CW-VERSION 1.21 갱신

## 변경 파일

- `scripts/ci-watch.mjs` — HB_STALE_MIN·computeImacHbAlerts·readImacOriginTs 추가, tick() 블록 교체, v1.21
- `scripts/test/ci-watch-w121.test.mjs` — 신규 (5건)
- `specs/screens/ci-watch.md` — CW-ALERT·CW-VERSION 갱신

## PR

https://github.com/CuriocityDevAi/curiocity-relay/pull/63
