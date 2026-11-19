CI 정체 원인 heavy 러너 1대(Youngkyus-MacBook-Pro-M1)가 job 하나에 7~12분씩 직렬로 처리하는데(실제 빌드·테스트는 1분 미만이고, setup-node 의 pnpm 캐시 복원·저장이 ~11분), 처리 중간에 43분·29분 동안 job 을 아예 잡지 않은 공백(Mac 잠자기/오프라인 추정)이 겹쳤고, 그 위로 대기 39개 중 26개가 이미 머지된 PR·main·어제 쌓인 job 이다 · 권장 조치 오래된 run 14개(머지된 PR 6개 · 어제 ci-summary 13개 · main push 1개 · feature-map-check 1개)를 취소하고, Mac 잠자기를 끄고, heavy job 의 `cache: 'pnpm'` 을 제거 — overflow 러너는 그다음 || #391 APPROVE · fork #200 APPROVE · fork #202 CHANGES

# R0C-1119-H 보고 · R0-cloud · 2026-11-19 (조회 기준 04:22–04:32 UTC)

## ① storeport CI 대기열 정체 진단 (읽기만 함 · run 취소 등 변경 없음)

### 실행 중인 run · job
`status=in_progress` 인 run 은 **0건**입니다. 진행 중인 job 은 queued 상태인 run 안에 들어 있는 1건뿐입니다.

| run | 워크플로 | PR | job | 실행기 | 시작 |
|---|---|---|---|---|---|
| 44452239406 | ci | #388 (refactor/M1-1119-B-lib-boundary) | unit-commerce-core → 04:24:43 완료 후 build-commerce-core | Youngkyus-MacBook-Pro-M1 (heavy) | 04:17:20 / 04:25:06 |

light 러너(`curiocity-mac-light`)는 정상입니다. 오늘 ci-summary 27건과 markers · changes-filter job 을 모두 처리했고, 밀린 light job 은 없습니다.

### queued run 전부 (26건) · 남은 job 은 모두 `[self-hosted, curiocity-mac]` 라벨
| run | 워크플로 | 이벤트 | 브랜치 / PR | PR 상태 | 생성(UTC) | 대기 중인 job |
|---|---|---|---|---|---|---|
| 44457097078 | ci | PR | ci/M2-1119-F-summary-all #391 | open | 11-19 04:15 | build-cc · unit-cc |
| 44454279529 | ci | PR | feat/M2-1119-D-cd-skip #389 | open | 03:51 | build-cc · unit-cc · customer-display |
| 44452239406 | ci | PR | refactor/M1-1119-B-lib-boundary #388 | open | 03:33 | build-cc (실행 중) |
| 44446099298 | ci | PR | refactor/M2-1118-V-rb3 #385 | open | 02:41 | unit-cc |
| 44446088415 | ci | PR | test/M2-1119-B-pin-audit #386 | open | 02:40 | build-cc · unit-cc |
| 44446084600 | ci | PR | test/M1-1118-K-store-day-rehearsal #383 | open | 02:40 | build-cc · unit-cc |
| 44446077513 | ci | PR | fix/M2-1118-S-fulfilled-refund #384 | open | 02:40 | build-cc · unit-cc |
| **44444689248** | ci | **push** | **main** (1963a6c, #387 머지) | — | 02:29 | unit-cc |
| **44440326972** | ci | PR | ci/M2-1119-C-summary | **#387 머지됨** | 01:53 | changes-filter · markers (옛 heavy 라벨) |
| **44343017404** | ci | PR | refactor/M2-1118-R-rb2b | **#382 머지됨** | 11-18 16:04 | build-cc · e2e-admin-loyalty · customer-display |
| **44283247928** | ci | PR | feat/M2-1118-N-pin-audit | **#379 머지됨** | 11-18 10:12 | build-cc · unit-cc · customer-display |
| **44282867637** | ci | PR | fix/M3-1118-E-cd-pairing-persist | **#376 머지됨** | 11-18 10:10 | e2e-admin-loyalty · pos-integration |
| **44258898591** | ci | PR | ci/M2-1118-L-queue | **#369 머지됨** | 11-18 07:26 | build-cc |
| **44343382820** | feature-map-check | PR | feat/M0-1118-K-cd-sync-r3 | **#381 머지됨** | 11-18 16:06 | check (status=pending) |
| **ci-summary × 13** | ci-summary | workflow_run | main | — | 11-18 10:14 ~ 11-19 00:05 | post (light 러너로 분리되기 전의 옛 heavy 라벨) |

ci-summary 13건의 run id: 44426179794 · 44383607205 · 44366762357 · 44348532588 · 44346732580 · 44344293897 · 44343870274 · 44343403374 · 44339397078 · 44337410749 · 44334711995 · 44334338198 · 44283550959

heavy 라벨로 대기 중인 job 은 약 39개입니다.
- 열린 PR 7개(#383 #384 #385 #386 #388 #389 #391): 약 13개
- **이미 끝난 일**: 약 26개
  - 머지된 PR run 6개: 12 job
  - 어제 ci-summary 13개: 13 job
  - main push run 1개: 1 job

### heavy 러너 처리 기록 (오늘 · storeport 만 · 다른 리포는 ubuntu 를 써서 이 러너를 쓰지 않음)
| 시작 | 끝 | job | 소요 |
|---|---|---|---|
| 01:53:59 | 01:55:42 | feature-map-check / check | 2m |
| 02:16:49 | 02:18:19 | ci changes-filter (옛 run) | 1.5m |
| 02:27:32 | 02:29:02 | feature-map-check / check | 1.5m |
| *02:29 → 02:58* | | **공백 29분 (대기 job 있음)** | |
| 02:58:30 | 03:06:17 | main build-cc | 7.8m |
| *03:06 → 03:49* | | **공백 43분 (대기 job 10개 이상)** | |
| 03:49:40 | 04:01:19 | #385 build-cc | 11.6m |
| 04:01:23 | 04:09:19 | #391 옛 SHA build-cc (04:15 run 취소) | 8m |
| *04:09 → 04:17* | | 공백 8분 | |
| 04:17:20 | 04:24:43 | #388 unit-cc | 7.4m |
| 04:25:06 | (실행 중) | #388 build-cc | — |

- **30분 넘게 걸린 job 은 없습니다.** 대신 **러너가 job 을 잡지 않은 공백**이 두 번(29분 · 43분) 있었습니다. 대기열이 쌓여 있는데도 잡지 않았으므로 Mac 잠자기, 러너 서비스 끊김, 네트워크 문제 중 하나로 추정합니다. 러너 상태 API(`/actions/runners`)는 프록시에서 막혀 있어 직접 확인하지 못했습니다.
- **job 당 오버헤드가 큽니다.** #385 build-cc 의 단계별 시간입니다.
  - Setup Node 6m16s (`cache: 'pnpm'` 로 GitHub 캐시를 복원)
  - Install 23s
  - Build 29s
  - main build-cc 의 Post Setup Node(캐시 저장) 5m22s

  self-hosted 러너에는 로컬 pnpm store 가 있고 `--prefer-offline` 도 쓰고 있는데, ci.yml L145 · 177 · 214 · 270 · 321 · 367 의 `cache: 'pnpm'` 이 매번 원격 캐시를 내려받고 올립니다. job 당 약 6~11분이 낭비됩니다.
- **오래된 job 의 상태**: 어제 쌓인 job(이미 18시간 이상 대기)은 GitHub 이 순서대로 배정하지 않아 그동안 실행되지 않았습니다. 하지만 언제든 배정될 수 있는 대기열 오염이고, 24시간이 지나면 자동 취소됩니다. 머지된 PR run 은 같은 ref 에 새 push 가 없으므로 concurrency 로 취소되지도 않습니다.

### 결론
- **정체 원인**: heavy 러너 1대에서 다음 세 가지가 겹쳤습니다.
  - job 당 7~12분 걸리는데, 그중 캐시 단계가 약 11분
  - 러너가 job 을 잡지 않은 공백 29분 · 43분
  - 오늘 PR 6개가 동시에 올라옴(02:40 일괄 "Merge branch main"으로 job 약 12개)

  현재 열린 PR 의 남은 job 13개 × 약 9분 ≈ **약 2시간**이 걸릴 예상입니다.
- **오케가 할 조치 (우선순위 순)**:
  1. 머지된 PR run 6개와 main push run 44444689248 을 취소합니다. 44343382820 · 44440326972 · 44343017404 · 44283247928 · 44282867637 · 44258898591 입니다.
  2. 어제 ci-summary run 13개를 취소합니다(위 id 목록).
  3. Kyu Mac 에서 잠자기를 끄고(`caffeinate` 또는 전원 설정), 러너 서비스가 살아 있는지 확인합니다.
  4. 후속 티켓으로 heavy job 의 `cache: 'pnpm'` 을 제거해 job 당 6~11분을 줄입니다.
  5. 이렇게 해도 줄이 안 줄면 overflow(heavy 러너 2대째 또는 ubuntu fallback)를 검토합니다.

  → 1~2번만 해도 대기열 오염은 사라지고, 3~4번이 실제 처리량을 늘립니다.

## ② 재리뷰 — storeport #391 APPROVE · fork #200 APPROVE (리뷰 COMMENT 게시 · 머지 안 함)
- 지적했던 4건이 모두 해소됐습니다(줄 번호는 b0f8a99 기준).
  - ① L118: 완료되지 않은 run → ⏳, jobs 는 조회하지 않음
  - ② L133–138 · L145–149: success/skipped/neutral 외에는 모두 ❌
  - ③ L63/L70 `set -euo pipefail` · L100–106 runs API 실패 → ⚠ · L125/L128 jobs 실패나 0건 → ⏳ · L166 0행 → ⚠
  - ④ L76–80: head.sha 가 다르면 skip
- **✅ 가 나오는 유일한 경로**는 L182 이고, 조건은 `FAILED=0 && PENDING=0 && 행≥1` 입니다. 미시작 run 이나 job 미생성 상황은 모두 ⏳ 또는 ⚠ 로 가므로 ✅ 가 나오지 않습니다.
- fork #200 의 ci-summary.yml 은 #391 과 다른 곳이 3줄뿐입니다(workflows `["CI","Lint"]` · ubuntu-latest · 설명 문구). 다만 브랜치에 #198 · #199 의 squash 이전 커밋이 섞여 있어 PR "Files changed" 에 32개 파일이 보입니다. merge-tree 로 시뮬레이션하면 실제 순변경은 ci-summary.yml 1개입니다. rebase 를 권장합니다.
- 비차단 메모:
  - L76 조회 실패 시 fail-open + PATCH 직전에 다시 확인하지 않음
  - 같은 SHA 의 cancelled run 이 ❌ 로 고정됨(거짓 빨강)
  - startup_failure 가 ⏳ 로 남음
  - 댓글 조회에 페이지네이션 없음

## ③ fork #202 CHANGES (리뷰 COMMENT 게시 · 머지 안 함)
- 로컬 검증(11b9e05):
  - lint 0 errors / 61 warnings
  - vitest 62 files · 763 pass
  - assertions **47/47 PASS** (`magick` 은 `identify` 로 shim)
  - GitHub CI 의 playwright 실패는 #199 와 같은 기존 실패입니다(ao · d · p 빠른 현금 버튼).
- `expo prebuild` 를 master 와 PR 에 돌려 비교한 결과입니다.
  - **iOS: Info.plist 동일, 변경 없음 ✅**
  - **Android ❌: 위치 권한에 `maxSdkVersion=30` 만 붙고 `BLUETOOTH_SCAN` 에는 `neverForLocation` 플래그가 없습니다.** app.json 의 `android.permissions` 에 BLUETOOTH_SCAN 이 이미 있어서 ble-plx 플러그인이 이 단계를 건너뜁니다(`addScanPermissionToManifest`).
  - 그 결과 Android 12 이상에서는 위치 권한도 neverForLocation 선언도 없는 상태가 되어 BLE 스캔이 막힐 위험이 있습니다. **수정**: permissions 배열에서 BLUETOOTH_SCAN 을 빼면 됩니다.
- runbook 지적사항:
  - **(차단) "Mac 의 Metro 가 켜져 있어야만 앱이 열린다 / 매장 상시 사용은 preview APK" 가 분명히 적혀 있지 않습니다.**
  - "Enter URL manually" 칸에는 `http://<IP>:8081` 을 넣어야 합니다(exp+ 딥링크가 아님).
  - `EXPO_PUBLIC_API_URL` 은 "번들에 포함"되는 값이 아니라 Mac 에서 Metro 를 띄운 환경의 값입니다.
  - 앱 코드에 `PermissionsAndroid` 요청이 없어서, ④ 의 첫 실행 BT 팝업은 보장되지 않습니다.
