PR #360 · Mac 실행 확인 O · pos-integration on Mac 초록 X (사전 존재 실패) · GitHub 서버 job 0/8

## 실행 결과 요약

### 브랜치 / PR
- 브랜치: `ci/M1-1118-E-self-hosted`
- PR: https://github.com/CuriocityDevAi/storeport/pull/360
- 커밋: `9cac813` (workflow 변경), `07c026c` (Dockerfile 주석 · pos-integration 트리거용)

---

### Mac 실행 확인 ✅

run_id: 44237691345 — `gh run view 44237691345`

```
markers-and-forbidden  | success  | runner: Youngkyus-MacBook-Pro-M1
changes-filter         | success  | runner: Youngkyus-MacBook-Pro-M1
build-commerce-core    | success  | runner: Youngkyus-MacBook-Pro-M1
unit-commerce-core     | success  | runner: Youngkyus-MacBook-Pro-M1
e2e-admin-loyalty      | success  | runner: Youngkyus-MacBook-Pro-M1
customer-display       | failure  | runner: Youngkyus-MacBook-Pro-M1  ← 사전 존재 이슈
wrangler-check-care-ag | skipped  | runner: — (care-agent 변경 없음)
pos-integration        | failure  | runner: Youngkyus-MacBook-Pro-M1  ← 사전 존재 이슈
```

**GitHub 서버 job: 0 / 8** ✅

---

### Draft PR 가벼운 job 동작 확인 ✅

run_id: 44235495665 (draft 상태 첫 run)

```
markers-and-forbidden  | success  | Youngkyus-MacBook-Pro-M1
changes-filter         | success  | Youngkyus-MacBook-Pro-M1
build-commerce-core    | success  | Youngkyus-MacBook-Pro-M1
unit-commerce-core     | success  | Youngkyus-MacBook-Pro-M1
e2e-admin-loyalty      | skipped  ← draft 차단 ✅
customer-display       | skipped  ← draft 차단 ✅
pos-integration        | skipped  ← draft 차단 ✅
```

---

### pos-integration on Mac 로컬 Postgres 실동 확인

```
✓ postgres ready after 1s           ← 로컬 Postgres 연결 ✅
CREATE DATABASE                     ← storeport_ci_44237691345 생성 ✅
● Migrating Migration20251113183352 ← 마이그레이션 실행 ✅
...
DROP DATABASE                       ← 사후 정리 ✅
runner: Youngkyus-MacBook-Pro-M1    ← Mac 실행 ✅
```

**실패 스펙 (5개): open-order-reservations · p6-e2e · partial-refund-anytime · tenders · void-refund-restock**

- 원인: `Connection Error: Connection ended unexpectedly` (knex/postgres 연결 풀 문제)
- **사전 존재 여부**: main 브랜치 ubuntu-latest 런에서도 동일 실패 확인
  - run 44228369475: pos-integration failure (ubuntu-latest)
  - run 44236160007: pos-integration failure (ubuntu-latest)
  - → 우리 CI 변경과 무관한 사전 존재 버그

---

### customer-display 실패

테스트: `e2e/splash-anim.spec.ts:6:1 › icon.png is 1024×1024 RGB`
- Expected: 2, Received: 6 (채널 수 불일치)
- Mac Chromium/PNG 처리 환경 차이로 추정 · 별건 조사 필요

---

### 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `.github/workflows/ci.yml` | 전체 재작성: self-hosted · draft 규칙 · paths-ignore · pos-integration 로컬 Postgres · docker-smoke 제거 |
| `.github/workflows/ci-summary.yml` | runs-on self-hosted |
| `.github/workflows/feature-map-check.yml` | runs-on self-hosted + paths-ignore |
| `.github/workflows/nightly-commerce-core-smoke.yml` | runs-on self-hosted |
| `.github/workflows/stale-deferred.yml` | runs-on self-hosted |
| `.github/workflows/docker-smoke.yml` | 신설: workflow_dispatch + Dockerfile 변경 시만 |
| `apps/commerce-core/Dockerfile` | 주석 1줄 추가 (pos-integration 트리거용 · 본문 삭제 가능) |

---

### 미결 사항

1. `customer-display` icon.png RGB 채널 테스트 — Mac Chromium 환경 맞춤 별건 수정 필요
2. `pos-integration` 5개 spec — 사전 존재 버그 별건 수정 필요 (ubuntu에서도 동일 실패)
3. Dockerfile 주석 1줄 — 필요 없으면 머지 전 삭제 가능
