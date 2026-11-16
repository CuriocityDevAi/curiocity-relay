PR #297(storeport) · PR #151(agilo-medusa-pos-fork) 2개 · 상위 소비 job: agilo CI(1,325min/주) · 예상 절감 ~28%

## 현황 측정 (최근 7일 · gh run list --limit 200)

| 저장소 | workflow | runs | avg | 총(min) |
|---|---|---|---|---|
| storeport | ci | 80 | 4.8m | 385 |
| storeport | feature-map-check | 57 | 0.3m | 15 |
| storeport | ci-summary | 62 | 0.1m | 8 |
| agilo-pos-fork | CI | 104 | 12.7m | 1,325 |
| agilo-pos-fork | Lint | 94 | 1.1m | 99 |
| **합계** | | | | **1,832** |

> wall-time 기준 (GitHub billing은 job 합산이므로 실제 청구 분은 더 높음)

## 적용된 절감 설정

### storeport PR #297
| 항목 | 변경 | 근거 |
|---|---|---|
| concurrency group | `ci-$ref` → `$workflow-$ref` | 표준 포맷 · 기존 cancel-in-progress 유지 |
| pull_request trigger | `ready_for_review` 타입 추가 | draft→ready 전환 시 재실행 보장 |
| `pos-integration` | 모든 PR 실행 → **commerce_core 경로 변경 시만** + draft skip | 태스크 명시 요구사항 · PR의 ~65% 절약 추정 |
| `customer-display` | draft skip + timeout 20m | 개발 중 불필요 E2E 방지 |
| `e2e-admin-loyalty` | draft skip + timeout 15m | 동일 |
| `unit-commerce-core` | draft skip + timeout 10m | 동일 |
| `markers-and-forbidden` | timeout 5m | 상한 보호 |
| `changes-filter` | timeout 5m | 상한 보호 |
| `wrangler-check-care-agent` | timeout 10m | 상한 보호 |
| feature-map-check | concurrency + ready_for_review | 중복 체크 취소 |

### agilo-medusa-pos-fork PR #151
| 항목 | 변경 | 근거 |
|---|---|---|
| ci.yml pull_request | `ready_for_review` + `paths-ignore: [md, docs/**]` | docs-only PR 완전 skip |
| `assertions` (20min) | `if: !draft` | 가장 무거운 job |
| `flow-tests` (5min) | `if: !draft` | draft 중 불필요 |
| `playwright` (25min) | `if: !draft` | 가장 무거운 job |
| lint.yml | **concurrency 신규** + timeout 10m + draft skip + paths-ignore | Lint는 concurrency 미적용 상태였음 |

## 절감 예상치

| 절감 항목 | 추정 절약(min/주) | 근거 |
|---|---|---|
| pos-integration path-only | ~300-400 | PR의 ~65%가 commerce-core 미변경 추정 |
| agilo CI draft skip (~25% 비율) | ~330 | 104runs × 12.7m × 25% |
| agilo Lint concurrency | ~15 | 연속 push 취소 |
| agilo docs paths-ignore | ~40 | md/docs-only PR 10% 추정 |
| storeport draft skip | ~50 | 80runs × 4.8m × 15% |
| **합계** | **~735-800min/주** | |
| **절감율** | **~28-35%** | 측정 기준 1,832min/주 대비 |

> 추정치 — draft PR 비율·경로 변경 분포는 실 데이터 없음.

## 검증 (actionlint)

```bash
# storeport
actionlint -ignore SC2015 -ignore SC2317 -ignore SC2129 \
  .github/workflows/ci.yml .github/workflows/feature-map-check.yml
# → 에러 0 ✅  (SC2015/SC2317/SC2129는 기존 스크립트 pre-existing info)

# agilo-medusa-pos-fork
actionlint .github/workflows/ci.yml .github/workflows/lint.yml
# → 에러 0 ✅
```

> billing 한도로 실제 CI 실행 불가 · actionlint YAML 문법 검증으로 대체
