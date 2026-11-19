# M2-1119-N — CI 확인 보고서
초록: (없음) · 빨강: #384(pos-integration/구 run) · 진행: #389,#392,#383,#384 · update-branch: #389,#392,#383,#384

작성: 2026-11-19 14:12 KST

---

## 초기 상태 (update-branch 전)

| PR | 브랜치 | 구 head SHA | main 대비 | CI 상태 |
|----|--------|------------|-----------|--------|
| #389 | feat/M2-1119-D-cd-skip | 8d4f77cc | behind 3 | pos-integration·customer-display pending |
| #392 | feat/M1-1119-F-cd-responsive | 63c5e96c | behind 3 | pos-integration pending |
| #383 | test/M1-1118-K-store-day-rehearsal | 0b8b7ae8 | behind 3 | pos-integration pending |
| #384 | fix/M2-1118-S-fulfilled-refund | a28b8309 | behind 3 | pos-integration **FAIL** |

→ 4개 모두 behind 3 커밋 → `gh pr update-branch` 전부 실행

---

## update-branch 결과

| PR | 새 head SHA | 조치 |
|----|------------|------|
| #389 | 77693a54abe27163a31b77fa977d55c1d2e04fb6 | ✓ update-branch 성공 |
| #392 | a2c89939abb2059717b7b7b35c982f0b270b4e08 | ✓ update-branch 성공 |
| #383 | 75e46109fd0d82f6fd7a0cbe7fabfba578cee4c3 | ✓ update-branch 성공 |
| #384 | 104d0ec7042af13709755c72c79d5051f8157d05 | ✓ update-branch 성공 |

---

## 새 run CI 현황 (14:12 KST 기준 · 런너 큐 적체로 진행 중)

### #389 — run 44472559951 (HEAD: 77693a54)

| check | 상태 |
|-------|------|
| check | pass ✓ |
| markers-and-forbidden | pass ✓ |
| changes-filter | pass ✓ |
| unit-commerce-core | pass ✓ |
| build-commerce-core | **queued** (런너 대기) |
| customer-display | pending |
| pos-integration | (build 완료 후 트리거 예정) |
| e2e-admin-loyalty | skipping |
| wrangler-check-care-agent | skipping |

### #392 — run 44472565782 (HEAD: a2c89939)

| check | 상태 |
|-------|------|
| check | pass ✓ |
| markers-and-forbidden | pass ✓ |
| changes-filter | pass ✓ |
| build-commerce-core | pass ✓ |
| unit-commerce-core | pass ✓ |
| customer-display | pass ✓ |
| pos-integration | **pending** (실행 중) |
| e2e-admin-loyalty | skipping |
| wrangler-check-care-agent | skipping |

### #383 — run 44472590359 (HEAD: 75e46109)

| check | 상태 |
|-------|------|
| check | pass ✓ |
| markers-and-forbidden | pass ✓ |
| changes-filter | pass ✓ |
| build-commerce-core | pass ✓ |
| unit-commerce-core | pending |
| customer-display | skipping |
| pos-integration | **pending** (실행 중) |
| e2e-admin-loyalty | skipping |
| wrangler-check-care-agent | skipping |

### #384 — run 44472597946 (HEAD: 104d0ec7)

| check | 상태 |
|-------|------|
| check | pass ✓ |
| markers-and-forbidden | pass ✓ |
| changes-filter | pass ✓ |
| unit-commerce-core | pass ✓ |
| build-commerce-core | **queued** (런너 대기) |
| customer-display | skipping |
| pos-integration | (build 완료 후 트리거 예정) |
| e2e-admin-loyalty | skipping |
| wrangler-check-care-agent | skipping |

---

## 구 run #384 실패 분석 (run 44464226871)

- **실패 check**: `pos-integration`
- **실패 spec**: `pin-audit`
- **원인 요약**: DB `Connection ended unexpectedly` (knex/pg 연결 끊김 반복) → `=== [test:integration:pos] FAILED specs (1): pin-audit ===` → exit code 1
- **판정**: transient flaky failure (DB 연결 불안정) — 코드 수정 불필요

---

## Heavy job (ubuntu-latest 오프로드)

- #394 미머지 상태 → ubuntu fallback 없음 → 모든 heavy job(pos-integration 등) 자체 호스트 런너에서 실행
- 런너 큐 적체로 build-commerce-core queued 상태 발생 (정상 범위)

---

## 비고

- 보고 시점(14:12 KST) 기준 #392·#383 pos-integration 진행 중, #389·#384 build-commerce-core queued
- 완료까지 추가 10~20분 예상 (자체 호스트 런너 1대 직렬 소화)
- 머지 대상: #389·#392 (R0C-1119-K/L APPROVE) — CI 초록 확인 후 Kyu 판단
