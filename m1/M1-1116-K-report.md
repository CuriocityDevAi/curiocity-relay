# M1-1116-K 리포트

PR별 rebase·CI·머지 표 · 남은 문제

| PR | 브랜치 | rebase | 로컬통합 | push | CI (docker-smoke 제외) | 머지 |
|----|--------|--------|---------|------|----------------------|------|
| #298 | m0/M0-1116-G-event-message-overrides | ✓ `--onto origin/main 8145605` (3커밋) | 8/8 + 5/5 ✓ | ✓ force-with-lease | ✓ 전항목 pass/skip | 미머지 (12분 초과) |
| #295 | m2/M2-1116-G-live-connect | ✓ `--onto origin/main 80f9ee3` (3커밋) | 5/5 ✓ | ✓ force-with-lease | ✓ pos-integration success | 미머지 (#298 대기) |
| #289 | feat/m0-1116-b-loyalty-card-timeline | ✓ `git rebase origin/main` (2커밋) | 5/5 ✓ | ✓ force-with-lease | ✓ pos-integration success | 미머지 (#295·#298 대기) |

## CI 상세

### #298 (run 43800738316)
- changes-filter: success, check: success, markers-and-forbidden: success
- pos-integration: skipped (변경 없음 — customer-display-settings 한정)
- docker-smoke-commerce-core: in_progress (기존 불량 M0-1116-H · 판정 제외)

### #295 (run 43800857710)
- unit-commerce-core: success, markers: success, filter: success
- e2e-admin-loyalty: success, customer-display: success, pos-integration: success
- docker-smoke-commerce-core: in_progress (기존 불량 · 판정 제외)

### #289 (run 43800948233)
- unit-commerce-core: success, markers: success, filter: success
- e2e-admin-loyalty: success, customer-display: success, pos-integration: success
- docker-smoke-commerce-core: in_progress (기존 불량 · 판정 제외)

## 로컬 통합 테스트

- **#298** (--onto rebase, 고유 커밋 3개):
  - customer-display-event-message-overrides.spec.ts: **8/8** ✓
  - customer-display-settings-draft-apply.spec.ts: **5/5** ✓
  - (두 스펙 동시 실행 시 cross-realm Map 충돌 — 각 스펙 별도 프로세스로 통과)
- **#295** (--onto rebase, 고유 커밋 3개):
  - customer-display-link-phone.spec.ts: **5/5** ✓
- **#289** (rebase, 고유 커밋 2개):
  - refund-recover.spec.ts: **5/5** ✓

## typecheck

전체 레포 기존 불량 (`@types/react@19.3.0` bigint 타입 충돌 — PR 고유 아님, main 동일). 판정 제외.

## 남은 문제

- #298 MERGEABLE(UNSTABLE) — docker-smoke 35min+ 실행 중(기존 불량). 오케가 무시하고 머지해야 함.
- #295·#289: CI 녹색 완료, #298 → #295 → #289 순서로 오케 머지 대기 중.
