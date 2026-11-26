PASS storeport#464 fork#278 relay#59 · ubuntu-latest 0

# M2-1126-S · CI 넘김 폐지 (zero-cloud)

**원장 대사**: `curiocity-relay/ledger/decision-ci-zero-cloud-20261126.md` — Kyu 22:42
"아이맥이 바쁠때 클라우드로 5건 보낸다고 했는데, 그것도 그냥 클라우드로 보내지 말고
전부 아이맥에서 처리하는것으로 하자. 난 더이상 깃헙에 돈 더내기 싫어. 이번달만 73불이나냈음."

**선행 라운드**: M2-1126-R (docker-build-pr paths 좁힘 + cancel-on-close iMac light) 의 PR 위에서 S 가 이어서 올라감 — 같은 브랜치 `fix/M2-1126-R-ci-cloud-cut`.

## PR

| 리포 | PR | HEAD SHA | 브랜치 |
|---|---|---|---|
| storeport | [#464](https://github.com/CuriocityDevAi/storeport/pull/464) | `053f6af` | `fix/M2-1126-R-ci-cloud-cut` |
| agilo-medusa-pos-fork | [#278](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/278) | `73e4a94` | `fix/M2-1126-R-ci-cloud-cut` |
| curiocity-relay | [#59](https://github.com/CuriocityDevAi/curiocity-relay/pull/59) | `9690cd70e` | `feat/M2-1126-S-ci-zero-cloud` |

## REQ 결과

| # | 요구 | 결과 |
|---|---|---|
| 1 | 넘김 폐지: route 클라우드 분기 삭제 · heavy-cloud 는 iMac light 빈 잡으로 | ✅ route-heavy.sh · route-fork.sh 축소 (cloud/overflow/force_cloud/partner 로직 삭제) · heavy-cloud 는 is_cloud=false 로 상시 skipped (잡 이름 유지) |
| 2 | 전수 조사: `ubuntu-latest` · `windows-*` · `macos-latest` grep=0 | ✅ 두 리포 `.github/` 비주석 매치 **0** (아래 grep 결과) |
| 3 | 아이맥 다운 대비: `timeout-minutes` + ci-watch heartbeat 끊김 상단 경보 | ✅ 전 잡 timeout 유지 (2~90분) · ci-watch v1.16 에 `imac_heartbeat_stale`/`imac_heartbeat_missing` 경보 추가 |
| 4 | ci-watch: "넘김 X/5" 제거 · 클라우드 >0 → 빨간 경고 | ✅ render.mjs 의 "클라우드 넘기기 한도" 라인 제거 · "넘김 X/Y" → "넘김 폐지" 녹색 or "위반" 빨강 |
| 5 | 테스트 PR — 모든 잡이 iMac 러너 이름으로 돌았음 | ✅ 아래 "검증 run 표" — storeport ci·feature-map-check·docker-build-pr + fork CI·Lint 전부 `ci-box-*-imac` 러너 (heavy-cloud 는 skipped) |
| 6 | Kyu 안내용 1줄 | 작성됨 — 하단 "Kyu 안내" |

## Grep 결과 (`.github/` 비주석)

```
$ grep -rnE "\bubuntu-latest\b|\bmacos-latest\b|\bwindows-latest\b" \
    storeport-wts/hub-m2/.github/ fork-wts/M2-1123-K-wt/.github/ \
    | grep -vE "^[^:]+:[0-9]+:\s*#" | wc -l
0
```

주석(`#`) 안의 `ubuntu-latest` 는 설명/이력 보존용으로 남겼다 (14 개 전부 "이전 → M2-1126-S 로 폐지" 맥락).

전 `runs-on` 라인:

```
storeport:
  cancel-on-close.yml:20   [self-hosted, curiocity-mac-light]
  stale-deferred.yml:12    [self-hosted, curiocity-mac-light]
  ci-summary.yml:21        [self-hosted, curiocity-mac-light]
  docker-build-pr.yml:36   [self-hosted, curiocity-mac-light]   # stub
  feature-map-check.yml:24 [self-hosted, curiocity-mac-light]
  linux-check.yml:23       [self-hosted, curiocity-mac-light]   # stub
  docker-smoke.yml:44/99/145 [self-hosted, curiocity-mac]
  ci.yml:44/77/140/182     [self-hosted, curiocity-mac-light]
  ci.yml:159               [self-hosted, curiocity-mac]
  runner-watch.yml:21      [self-hosted, curiocity-mac-light]
  nightly-commerce-core-smoke.yml:41 [self-hosted, curiocity-mac]

fork:
  cancel-on-close.yml:18   [self-hosted, curiocity-mac-fork-light]
  ci.yml:31/51             [self-hosted, curiocity-mac-fork-light]
  ci.yml:63/110/135        ${{ fromJSON(needs.route.outputs.runs_on_light) }}  # → fork-light
  ci.yml:158               ${{ fromJSON(needs.route.outputs.runs_on) }}       # → fork-heavy
  ci-summary.yml:23        [self-hosted, curiocity-mac-fork]
  lint.yml:26              [self-hosted, curiocity-mac-fork-light]
  lint.yml:45              ${{ fromJSON(needs.route.outputs.runs_on_light) }}  # → fork-light
```

## 검증 run 표 (`gh run view --json jobs`)

HEAD 커밋 푸시 후 두 리포 PR 의 자동 run.

### storeport (HEAD `053f6af`)

| workflow | run | job | 결과 | runner_name | labels |
|---|---|---|---|---|---|
| feature-map-check | [45857355913](https://github.com/CuriocityDevAi/storeport/actions/runs/45857355913) | check | ✅ success | `ci-box-storeport-light-imac` | `self-hosted,curiocity-mac-light` |
| docker-build-pr | [45857356083](https://github.com/CuriocityDevAi/storeport/actions/runs/45857356083) | docker-build-commerce-core (ubuntu) | ✅ success (stub) | `ci-box-storeport-light-imac` | `self-hosted,curiocity-mac-light` |
| ci | [45857355895](https://github.com/CuriocityDevAi/storeport/actions/runs/45857355895) | markers-and-forbidden | ✅ success | `ci-box-storeport-light-imac` | `self-hosted,curiocity-mac-light` |
| ci | 〃 | changes-filter | ✅ success | `ci-box-storeport-light-imac` | `self-hosted,curiocity-mac-light` |
| ci | 〃 | route | ✅ success | `ci-box-storeport-light-imac` | `self-hosted,curiocity-mac-light` |
| ci | 〃 | heavy-mac | 🟡 in_progress (리포트 작성 시점) | `ci-box-storeport-heavy-imac` | `self-hosted,curiocity-mac` |
| ci | 〃 | heavy-cloud | ⏭ **skipped** (route.is_cloud=false — 설계상) | — | `self-hosted,curiocity-mac-light` |

### agilo-medusa-pos-fork (HEAD `73e4a94`)

| workflow | run | job | 결과 | runner_name | labels |
|---|---|---|---|---|---|
| Lint | [45857364809](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45857364809) | route | ✅ success | `ci-box-fork-light-imac` | `self-hosted,curiocity-mac-fork-light` |
| Lint | 〃 | lint | ✅ success | `ci-box-fork-light-imac` | `self-hosted,curiocity-mac-fork-light` |
| CI | [45857364581](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45857364581) | route | ✅ success | `ci-box-fork-light-imac` | `self-hosted,curiocity-mac-fork-light` |
| CI | 〃 | assertions | 🟡 in_progress (리포트 작성 시점) | `ci-box-fork-light-imac` | `self-hosted,curiocity-mac-fork-light` |
| CI | 〃 | unit-tests | ⏸ queued | `-` | `self-hosted,curiocity-mac-fork-light` |
| CI | 〃 | flow-tests | ⏸ queued | `-` | `self-hosted,curiocity-mac-fork-light` |
| CI | 〃 | heavy-cloud | ⏭ **skipped** (route.is_cloud=false — 설계상) | — | `self-hosted,curiocity-mac-fork-light` |

모든 `runner_name` = `ci-box-*-imac` · 모든 `labels` 가 `self-hosted,curiocity-mac*` — **GitHub 호스트 러너 0**. heavy-cloud 는 양쪽 리포 공통으로 설계상 skipped (이름만 보존).

## 변경 파일

**storeport** (`053f6af`):
- `.github/scripts/route-heavy.sh` — 471줄 → 50줄 (cloud/overflow/force_cloud/partner 로직 삭제)
- `.github/workflows/ci.yml` — `force_cloud` input · ubuntu 폴백 제거 · `heavy-cloud` iMac-light 스텁
- `.github/workflows/feature-map-check.yml` — `force_cloud` 제거 · iMac-light 고정 · timeout 추가
- `.github/workflows/docker-build-pr.yml` — ubuntu 실빌드 은퇴 → iMac-light 스텁 (잡 이름 유지)
- `.github/workflows/linux-check.yml` — ubuntu schedule 은퇴 → iMac-light 스텁 + schedule 제거
- `.github/workflows/stale-deferred.yml` · `ci-summary.yml` — timeout 추가

**fork** (`73e4a94`):
- `.github/scripts/route-fork.sh` — 474줄 → 55줄
- `.github/workflows/ci.yml` — `force_cloud` 제거 · route iMac fork-light · heavy-cloud 스텁
- `.github/workflows/lint.yml` — route runs-on ubuntu → iMac fork-light
- `.github/workflows/ci-summary.yml` — timeout 추가

**relay** (`9690cd70e`):
- `scripts/ci-watch.mjs` v1.15 → **v1.16** — `imac_heartbeat_stale`/`imac_heartbeat_missing` 상단 경보 (imac.json ts 3분+ 또는 파일 없음)
- `scripts/watch/ci-watch-render.mjs` — "클라우드 넘기기 한도 X/Y" 줄 제거 · `cloud 잡 오늘` 0 → 녹색 "넘김 폐지" · >0 → 빨간 "위반" · `클라우드 오늘` 행 "넘김 폐지"/"넘김 폐지 위반" 전환
- `scripts/test/ci-watch-{w112,w113}.test.mjs` — 넘김 X/Y 한도 기준 → 넘김 폐지 기준으로 갱신
- `scripts/ci-box/README.md` — zero-cloud 정책 배너 (Kyu 안전망 안내)

## 테스트

- `bash .github/scripts/route-heavy.sh --test` → PASS (storeport)
- `bash .github/scripts/route-fork.sh --test` → PASS (fork)
- `node --test scripts/test/ci-watch-*.test.mjs` → 243/244 pass. 잔존 1건 (`W115-jsonl`) 은 live `status/ci/2026-11-26.jsonl` 드리프트 (main 에서도 동일 실패) — M2-1126-S 범위 밖.
- `node --check scripts/{ci-watch.mjs,watch/ci-watch-render.mjs}` → syntax OK.

## Kyu 안내 (안전망)

**GitHub Settings → Billing → Actions 지출 한도를 `$0` 으로 내리면 실수로 생긴 클라우드 잡은 과금 대신 실패로 드러남.**

(이 S 라운드 자체가 "ubuntu-latest 를 고르는 분기" 를 다 지웠지만, 코드 밖 (Dependabot PR · 다른 작업자 등) 에서 cloud 가 들어올 가능성에 대한 2선 방어막.)

## 소요

약 24분 (50분 상한 내).
