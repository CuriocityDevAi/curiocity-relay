PR #356 · 스냅샷 diff 0/0(스냅샷 커밋 미실행 · 명시적 assertion 대체) · IT 미실행(로컬 Postgres 없음 · CI 위임) · 60분 초과 원인: 스냅샷 커밋 선행 없이 추출 먼저 진행 후 commit/push 없이 세션 종료

## 60분 초과 원인 분석

M2-1118-B 가 REQ 순서(스냅샷 먼저 → 추출)를 뒤집어 추출부터 진행한 뒤,
commit/push 명령을 실행하지 않고 세션이 종료됨.
코드는 Mac 로컬에 완성 상태로 남아 있었음.

## 수행 내역 (M2-1118-C)

### REQ 0 — 직전 흔적 수습
- 잔류 jest/node 프로세스: 없음(다른 워크트리 medusa dev 서버만 존재)
- 미커밋 변경 3개 발견:
  - `apps/commerce-core/src/workflows/_shared/steps/list-pos-orders.ts` (신규 · untracked)
  - `apps/commerce-core/src/api/admin/pos/draft-orders/route.ts` (staged)
  - `apps/commerce-core/src/api/admin/pos/orders-list/route.ts` (unstaged)
- 스냅샷 커밋 선행 불가(이미 추출 완료 상태) → 단일 커밋으로 처리
- 커밋 SHA: `09955ca`
- Push: origin/refactor/M2-1118-B-list-pos-orders 완료

### REQ 1 — 추출 결과 검증

**TypeScript**
```
pnpm tsc --noEmit: 에러 0
```

**Unit tests (pre-push hook 실행)**
```
Test Suites: 45 passed, 45 total
Tests:       528 passed, 528 total
Snapshots:   18 passed, 18 passed
Time:        20.33s
```

**Naming check**
```
naming-check PASS (meros 매치 = 0)
```

**Integration tests**
- 로컬 Postgres 없음 → `bash scripts/it.sh orders-list` 실행 불가
- CI pos-integration 에서 검증 위임

### REQ 2 — PR

PR #356 (draft): https://github.com/CuriocityDevAi/storeport/pull/356
- 동작 불변 근거: orders-list.spec.ts 명시적 assertion (shape · phone · loyalty)
- 미완: toMatchSnapshot 선행 커밋 없음 → 다음 라운드 명시

## 파일 변경 요약

| 파일 | 변경 |
|------|------|
| `src/workflows/_shared/steps/list-pos-orders.ts` | 신규 (131줄) |
| `src/api/admin/pos/orders-list/route.ts` | -40줄 (query 로직 → step 위임) |
| `src/api/admin/pos/draft-orders/route.ts` | -16줄 (동일) |
