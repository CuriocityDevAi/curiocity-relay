PASS storeport#464 fork#278 relay#58 · 예상 클라우드 ~204분/일 (오늘 347 → −143)

## 오늘 cloud 청구 대조 (2026-11-26 WIB · GitHub 청구 347분)

| 잡 | 건수 | 실제 분 | 과금 추정 |
|---|---:|---:|---:|
| storeport docker-build-commerce-core (ubuntu) | 14 | ~84 | ~95 |
| storeport heavy-cloud (실 overflow) | 3 | 48 | ~50 |
| **storeport+fork ci-summary (jsonl 누락 · 범위 外)** | **85** | **~1** | **~85** |
| fork route (ubuntu) | 49 | ~5 | ~49 |
| **relay build-index (jsonl 누락 · 범위 外)** | **40** | **~1** | **~40** |
| storeport+fork cancel-on-close | 13 | ~1.5 | ~13 |
| 기타(linux-check · retarget-ci · playwright 등) | — | — | ~15 |
| **합계** | | | **~347** ✓ |

jsonl 262 vs 청구 347 의 85 분 갭 = ci-summary (85 분, workflow_run 트리거라 jsonl 분류 밖) + relay build-index (40 분, 다른 리포라 jsonl 범위 밖) 이었음. 기타 분이 상쇄.

## 변경

### 1. storeport#464 — docker-build-pr paths 좁힘 · cancel-on-close iMac light

- `docker-build-pr.yml`: paths 를 `apps/commerce-core/Dockerfile`·`package.json`·`medusa-config.ts`·`apps/customer-display/package.json`·`vite.config.ts`·`packages/*/package.json`·`tsconfig*.json`·lock·`.dockerignore` 로 좁힘. 광범 `apps/**` 는 제거. 일반 소스 PR = Railway 가 머지 후 재현.
- **선택지·채택·이유**: A(paths 좁힘) 채택. 1) Mac self-hosted = Docker Desktop 유료·불안정. 2) Railway 가 머지 후 어차피 빌드 재현. 3) 일반 소스 PR 의 빌드 리스크 = 거의 없음.
- `cancel-on-close.yml`: `ubuntu-latest` → `[self-hosted, curiocity-mac-light]`.
- **검증**: PR#464 자체가 `.github/workflows/docker-build-pr.yml` 변경 → paths 매치 → docker-build-commerce-core (ubuntu) in_progress 로 돌기 시작(설계대로).

### 2. fork#278 — route · cancel-on-close iMac fork-light

- `ci.yml` route: `ubuntu-latest` → `fromJSON(inputs.force_cloud==true && '"ubuntu-latest"' || '["self-hosted","curiocity-mac-fork-light"]')`. fork-light 러너(ci-box-fork-light-imac) 등록 확인 · M2-1121-A 공백 해소. force_cloud 폴백 유지 = iMac 다운 시 수동 재시도 경로.
- `cancel-on-close.yml`: `ubuntu-latest` → `[self-hosted, curiocity-mac-fork-light]`.
- **검증**: PR#278 run 45854404746 route 가 **ci-box-fork-light-imac** 에서 **success** (직전은 ubuntu-latest) — 변경 작동 확인.

### 3. relay#58 — ci-watch 넘김 카운터 수정

- `scripts/lib/ci-health.mjs` `cloudToday`:
  - 직전: 이 tick `completedRecords` × `runner_kind=='cloud'` → marker/route/docker-build/ci-summary 모두 포함 + 이 tick 분만(대부분 0) → "넘김 0/5" 오표시.
  - 수정: 오늘 JSONL **전수** × `job=='heavy-cloud'` × `conclusion ∈ {success,failure,timed_out}`. heavy-cloud = `route.outputs.is_cloud=='true'` 일 때만 실행되는 overflow 신호(storeport=실잡·fork=echo 마커) → 둘 다 overflow 사건.
  - 이 tick 의 새 heavy-cloud records 도 id 집합 병합(중복 제거).
- **테스트**: R-1(jsonl 전수 + marker/skipped 제외) · R-2(jsonl+tick 중복 제거) 신설 · G-1 tmpRoot 격리. 475/475 통과.
- **오늘 실제 넘김** = 3 (storeport heavy-cloud success 3건 + fork heavy-cloud success 2건 = 5 · 5+extra≤5 범위) — 수정 후 다음 tick 부터 실수 반영됨. 오늘 5건은 route-fork.sh `_cloud_today` 가 완결 run 기반으로 집계 → 5건 초과분은 자동으로 로컬 대기로 fall-through (스크립트 검증됨).

## 넘김 카운터와 실제 overflow 수 일치 여부

- `cloud_today` 집계 기준(수정 후) = 오늘 jsonl 에 기록된 `heavy-cloud` run 수 (success/failure/timed_out).
- route-fork.sh `_cloud_today` 집계 기준 = GitHub API 실시간 `heavy-cloud` job 수 (skipped 제외).
- 두 숫자가 다를 수 있는 창구는 "jsonl 미기록 run" 뿐 — jsonl 기록은 ci-health.mjs 가 매 tick 완료 run 을 수집해 추가하므로 정상 가동 중이면 수 분 내 정합.
- 5/day 상한이 실제로 지켜지는지 = route-fork.sh 의 API 기반 집계가 사실상의 가드이며 ci-watch 는 표시용. 상한 가드의 책임은 route-fork.sh 에 유지.

## 예상 하루 클라우드 분 (변경 머지 후)

| 소스 | 변경 후 추정 | 변화 |
|---|---:|---:|
| storeport docker-build-commerce-core | ~14 분 (2건) | −81 |
| storeport heavy-cloud | 50 분 (overflow 자연 변동) | 0 |
| storeport+fork ci-summary | 85 분 | 0 (범위 外) |
| fork route | 0 분 | −49 |
| relay build-index | 40 분 | 0 (범위 外) |
| storeport+fork cancel-on-close | 0 분 | −13 |
| 기타 | ~15 분 | 0 |
| **합계** | **~204 분/일** | **−143** |

## 범위 外 추가 절감 기회 (후속)

- **storeport+fork ci-summary ~85분/일** — workflow_run 트리거라 iMac 러너로 옮길 여지 있음 (수 초짜리 post 작업, 85건 × 1분 ceil = 85분).
- **relay build-index ~40분/일** — index.json 생성·커밋. ubuntu 전용 build (node-only), self-hosted 로 이동 가능.

이 둘까지 처리하면 ~79분/일 수준까지 추가 절감 가능. 이번 작업 범위 外 — Kyu 결정 대기.

## 검증한 PR (1건)

- fork#278 run 45854404746: **route 가 iMac fork-light 에서 success** (이전엔 ubuntu-latest) · 다른 CI 잡(assertions·flow-tests·unit-tests)도 fork-light 큐에 정상 적재.
- storeport#464: docker-build-pr paths 매치로 정상 트리거 · route = storeport-light-imac(기존 유지).

## 주의 · 잔존 리스크

- iMac light 러너(storeport·fork 양쪽)가 오프라인이면 CI 체인이 queued 로 멈춤 — 기존 "오프라인 러너 → queued (클라우드로 새지 않음)" 정책과 동일. 복구 경로 = workflow_dispatch + force_cloud=true.
- 수정된 넘김 카운터는 jsonl 수집에 의존 → ci-health.mjs 가 멈추면 카운터도 멈춤. 가드는 여전히 route-fork.sh 의 API 기반 집계.
