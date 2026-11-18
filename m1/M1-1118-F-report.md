# M1-1118-F 리포트
#296 it.sh 로컬 O · #353 3건 0 pass · CI 진행 중(pending)

---

## #296 — it.sh (feat/m1-1116-h-integration-runner)

### 작업
- `git rebase origin/main` → push (force-with-lease)
- `apps/commerce-core/scripts/it.sh` 에 `DB_DATABASE=storeport_ci_<id>` 패턴 추가
  - `_RUN_ID=$(date +%s%N | cut -c5-13)`
  - `export DB_DATABASE="storeport_ci_${_RUN_ID}"` / `DATABASE_URL`
  - 실행 전 `CREATE DATABASE`, 종료 시 `trap _cleanup_db EXIT` → `DROP DATABASE`
  - CI (#360) 방식과 동일, 허브 간 충돌 방지

### 로컬 실행 로그
```
bash apps/commerce-core/scripts/it.sh orders-list
▶ DB: storeport_ci_981882312
▶ 실행할 spec (1개): integration-tests/pos/orders-list.spec.ts

PASS integration-tests/pos/orders-list.spec.ts (23.45 s)
  M1-1116-B · GET /admin/pos/orders-list
    ✓ #1 전화번호 가림 형식 (2960 ms)
    ✓ #2 전화번호 일부 필터 (1845 ms)
    ✓ #3 주문번호 필터 (690 ms)
    ✓ #4 loyalty_earn 없는 주문 (759 ms)
    ✓ #5 loyalty_earn applied=false (766 ms)
    ✓ #6 loyalty_earn + loyalty_recover (758 ms)
    ✓ q=081…/6281…/+6281… 3모양 반환 (1612 ms)
    ✓ 마스킹 0813-****-2480 통일 (2578 ms)
    ✓ display_id 검색 회귀 없음 (1169 ms)

Tests: 9 passed, 9 total
==============================
 pos-integration 결과
 통과: 1 / 1
==============================
```

**결과: O (통과)**

### CI (#296)
- run: 44248635962
- markers-and-forbidden: **pass**
- changes-filter: **pass**
- build-commerce-core / unit-commerce-core / customer-display / e2e-admin-loyalty: **pending** (실행 중)

---

## #353 — net-refund-preview-small (test/M1-1117-W-net-refund-it)

### 작업
- `git rebase origin/main` → push (force-with-lease)
- draft → ready (`gh pr ready 353`)

### 로컬 실행 로그
```
▶ DB: storeport_ci_982103243

FAIL integration-tests/pos/net-refund-preview-small.spec.ts (12.78 s)
  ● #W-1 preview→confirmed 성공 · net=99200 → AxiosError: 500
  ● #W-2 잔액 변경 → 409 preview_stale → AxiosError: 500
  ● #W-3 confirmed + 필드 누락 → 400 → AxiosError: 500

Tests: 3 failed, 3 total
```

### 실패 원인 분류: **제품 설정 버그** (테스트 코드 정상)

서버 로그: `Cannot find module '../../../../../../lib/loyalty/preview-recover.js'`

- `src/api/admin/pos/orders/[id]/refund/route.ts` 에서 `await import("…/preview-recover.js")` (ESM style 동적 import)
- `preview-recover.ts` 소스는 존재하나 jest v29 가 `.js` → `.ts` 로 resolve 못함 (`moduleNameMapper` 미설정)
- CI 에서는 `pnpm build` 후 `.medusa/server/.../preview-recover.js` 가 생성되어 패스 예상
- 로컬 it.sh (build 없이) 에서는 재현되는 known issue
- 테스트 스펙 자체 로직 문제 없음

### CI (#353)
- run: 44248668210 (신규, 진행 중)
  - check: **pass**
  - markers-and-forbidden: **pending**
  - changes-filter: **pending**
- run: 44248642350 (구, rebase 전 → 모두 cancelled로 "fail" 표시)

---

## 요약
| PR | rebase | push | 로컬 | CI |
|----|--------|------|------|----|
| #296 it.sh | ✅ | ✅ | **O** (9/9) | pending |
| #353 net-refund-small | ✅ | ✅ ready | **X** (0/3) · 제품설정버그 | pending |
