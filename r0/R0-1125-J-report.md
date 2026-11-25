APPROVE

## R0-1125-J · PR #257 (M3-1125-D) 리뷰

### 검증 결과

| 항목 | 결과 |
|------|------|
| QR 항상 렌더 (§8-① 보장) | ✅ |
| 배너 자동(busy/offline/hidden) + 수동 토글 | ✅ |
| offline 30초 판정 타당성 | ✅ |
| 회귀 없음 (시뮬레이트·폴링·New QR·split) | ✅ |
| 신규 playwright .mjs CI run-all 포함 | ✅ |
| CI 전부 pass | ✅ |

### 세부 확인

**QR 항상 렌더**: `qris-qr-svg`는 `svg !== null` 조건만으로 렌더. `scanHereVisible`/`cdOccupied`/`cdDisconnected` 중 어느 것도 QR을 감싸지 않는다. 테스트 (B)·(C)·(D)에서 busy·offline 상태에서도 QR visible 확인.

**배너 자동+수동 토글**: `scanHereAuto = cdOccupied || cdDisconnected`, `scanHereVisible = scanHereAuto || manualShowHere`. 3 CD 경우(busy/offline/hidden) 자동 ON · 캐셔 수동 `qris-show-here-toggle` 별도 구현. accessibility `role=switch` + `checked` 바인딩 포함.

**offline 30초 판정**: `classifyCustomerDisplay` → `diffSec > 30` (server_now − polled_at). CD 10s 폴링 주기 대비 3회 무응답 기준. 타당.

**회귀 없음**: 소스 어설션 테스트 (E)·playwright (SRC4) 에서 `qris-simulate-btn`·`simulate.mutateAsync`·`setInterval(checkStatus, 10_000)`·`qris-new-qr-btn`·`regenerate.mutateAsync`·`signalSplitQrisFirstDone`·`signalSplitQrisSecondDone` 전부 확인.

**playwright .mjs CI 포함**: `scripts/run-all.mjs` 패턴 `/^[a-z0-9-]+-playwright\.mjs$/` → `m3-1125-d-qris-qr-on-pos-playwright.mjs` 자동 매칭. playwright job에서 실행됨.

**CI**: assertions · flow-tests · heavy-cloud · lint · playwright · route×2 — 7/7 green (모두 pass).

**스레드 resolve**: 기존 리뷰 스레드 없음(count=0). GitHub 셀프 approve 제한으로 COMMENT 형태로 APPROVE 기록 제출.
