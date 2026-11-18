main d019912 pos-integration SKIPPED · #296 FAIL(infra) · #353 FAIL(infra, rebased) · #356 FAIL(infra)

# M1-1118-C — CI 통합 테스트 결과 (GitHub Actions)

작성: 2026-11-18 · 저장소: CuriocityDevAi/storeport

---

## 1. main 브랜치 CI

### 커밋 d019912 (PR #355 부팅 수정 머지)
run id: 44196875261 · workflow: ci

| job | 결과 |
|-----|------|
| unit-commerce-core | **FAIL** (duration_ms: 0) |
| changes-filter | **FAIL** (duration_ms: 0) |
| markers-and-forbidden | **FAIL** (duration_ms: 0) |
| pos-integration | SKIPPED (changes-filter 의존) |
| e2e-admin-loyalty | SKIPPED |
| customer-display | SKIPPED |
| docker-smoke-* | SKIPPED |

### 커밋 772c2a9 (PR #352 docs 머지, 현재 main HEAD)
run id: 44196888887 · workflow: ci

| job | 결과 |
|-----|------|
| unit-commerce-core | **FAIL** (duration_ms: 0) |
| changes-filter | **FAIL** (duration_ms: 0) |
| markers-and-forbidden | **FAIL** (duration_ms: 0) |
| pos-integration | SKIPPED |
| 나머지 | SKIPPED |

---

## 2. PR별 check 결과

### PR #296 — feat/m1-1116-h-integration-runner (it.sh 진입점)
상태: open (non-draft) · base: main (772c2a9, 최신, **rebase 불필요**)
run id: 44197248097 (attempt 2 — rerun 1회 실행)

| check | 결과 |
|-------|------|
| changes-filter | **fail** |
| check | **fail** |
| markers-and-forbidden | **fail** |
| unit-commerce-core | **fail** |
| pos-integration | skipping |
| 나머지 | skipping |

### PR #353 — test/M1-1117-W-net-refund-it (NET 환불 IT 3건)
상태: open (draft) · **rebase 완료**: b157e88 → a45dbd4 (772c2a9 위)
run id: 44217674698 (rebase + push 후 신규 CI)

| check | 결과 |
|-------|------|
| changes-filter | **fail** |
| markers-and-forbidden | **fail** |
| unit-commerce-core | skipping (draft) |
| pos-integration | skipping |

### PR #356 — refactor/M2-1118-B-list-pos-orders (공용 step 추출)
상태: open (draft) · base: main (772c2a9, 최신, **rebase 불필요**)
run id: 44216025764

| check | 결과 |
|-------|------|
| changes-filter | **fail** |
| markers-and-forbidden | **fail** |
| unit-commerce-core | skipping (draft) |
| pos-integration | skipping |

---

## 3. 실패 로그 및 원인 분류

### 로그 접근 결과
모든 run에 대해 `gh run view <id> --log-failed` → `log not found`
모든 job에 대해 `gh api .../jobs/<id>/logs` → **Azure BlobNotFound (HTTP 404)**

### 핵심 지표

```
timing API → UBUNTU duration_ms: 0 (모든 job)
run_duration_ms: 5000 (5초 완료)
steps: [] (empty — 단계 실행 없음)
```

### 원인 분류: **인프라 (GitHub Actions runner 장애)**

- **판정**: 제품 버그·테스트 실패 아님. GitHub Actions runner 수준 실패.
- **근거 1**: 모든 job `duration_ms: 0` → runner 가 provision 됐으나 단계 실행 전 종료
- **근거 2**: Azure BlobNotFound → 로그 파일 자체가 생성 안 됨 (steps 미실행)
- **근거 3**: 동일 패턴이 `d019912` 이전부터 최소 5커밋 연속 발생 (`25760b7`, `7c28f93` 포함) — PR #355 부팅 수정과 무관
- **근거 4**: rerun 후에도 동일 (`attempt: 2`, 역시 duration_ms: 0)
- **추정 원인**: GitHub Actions 분 쿼터 소진 가능성 높음 (CuriocityDevAi org Free tier 2,000분/월). 쿼터 소진 시 모든 워크플로우가 단계 실행 없이 즉시 failure 처리됨.

### 로컬 unit 테스트 결과 (pre-push hook, #353 rebase 시 실행)
```
apps/commerce-core: 45 suites · 528 tests PASSED ✓
apps/customer-display: 150 tests PASSED ✓
packages/event-contracts: 21 tests PASSED ✓
```
→ 코드 자체는 정상. CI 인프라가 문제.

---

## 4. pos-integration / 로컬 Postgres 의견

**현재 상황**: `pos-integration` 은 `changes-filter` 성공을 `needs:` 로 의존하므로, CI 인프라 장애가 계속되는 한 GitHub CI 에서 실행 불가.

**로컬 Postgres 설치 시**:
- M1-1118-A/B 측정 결과 기준 `orders-list` spec 단일 실행 ~수분 예상
- `bash scripts/it.sh [pattern]` 으로 즉시 실행 가능 (#296 it.sh 기준)
- CI 쿼터 소진에 무관하게 통합 테스트 결과 즉시 확인 가능
- **설치 여부는 Kyu 결정** (Homebrew: `brew install postgresql@16`, 또는 Docker Compose)

**단기 대안**: GitHub Actions 쿼터 복구 대기 (월초 갱신) 또는 Kyu 가 GitHub Actions 사용량/결제 설정 확인.

---

## 5. 수행 내역 요약

| 항목 | 결과 |
|------|------|
| main d019912 CI jobs 확인 | 완료 |
| main 772c2a9 CI jobs 확인 | 완료 |
| PR #296 checks 확인 | 완료 (rerun 1회) |
| PR #353 rebase 필요 여부 | **필요** → rebase + push 완료 (a45dbd4) |
| PR #353 새 CI 결과 | 완료 (동일 인프라 장애) |
| PR #356 checks 확인 | 완료 |
| 실패 로그 추출 | **불가** (Azure BlobNotFound, duration_ms: 0) |
| 원인 분류 | **인프라** (GitHub Actions runner / 쿼터 소진 추정) |
