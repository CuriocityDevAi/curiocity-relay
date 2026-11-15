# R0-1105-FE 리뷰 리포트

#269 APPROVE · CI 실행 중(pos-integration·customer-display·e2e-admin-loyalty pending)

## 돌려본 명령 · 로그

```
# 참조 파일 확인
cat ~/projects/curiocity-relay/r0/R0-1105-FB-report.md   # §#269 CHANGES 3건
cat ~/projects/curiocity-relay/m2/M2-1105-BW-report.md   # BW 작업 내역

# PR 정보
cd ~/projects/storeport
gh pr view 269               → title: feat(customer-display) M2-1105-BQ A0
gh pr diff 269               → 14 files, 495+/4-

# 브랜치 최신화 (BX 반영)
git fetch origin m2/M2-1105-BQ-customer-display-web-serve
→ FETCH_HEAD = dbfe609 (BX: e2e-admin-loyalty 중복 job 제거)

# FB CHANGES 1번: console.log 제거 확인
git show FETCH_HEAD:apps/commerce-core/src/api/middlewares.ts | grep "console.log"
→ no match ✓

# FB CHANGES 3번: pos-integration null.resolve ([...path] 제거 확인)
git show FETCH_HEAD: → middlewares.ts CDW handler 확인 (BS 에서 [...]path 폴더 → middlewares 전환)

# matcher 로컬 curl 5종 (서버: PID 80281 M2-1105-BQ-wt, BW 수정 반영)
grep "console.log" /Users/kyu.lee/curiocity-live/storeport-wts/M2-1105-BQ-wt/apps/commerce-core/src/api/middlewares.ts
→ no match ✓ (BW 수정 worktree 직접 확인)

curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/customer-display-web/
→ index: 200 ✓

curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/customer-display-web/version.json
→ version.json: 200 ✓, Cache-Control: no-cache ✓

curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/customer-display-web/assets/nonexistent.js
→ missing asset: 404 ✓

curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/customer-display-web/some/spa/route
→ SPA route: 200 ✓

curl -s -o /dev/null -w "%{http_code}" "http://localhost:9000/customer-display-web/../../../etc/passwd"
→ traversal: 404 ✓

# ci.yml 중복 job 확인
git show FETCH_HEAD:.github/workflows/ci.yml | grep -c "^  e2e-admin-loyalty:" → 1 ✓
git show FETCH_HEAD:.github/workflows/ci.yml | grep -c "^  customer-display:"  → 1 ✓

# ci.yml 구성 대조 (main loyalty_admin · #272 customer_display)
git show FETCH_HEAD:.github/workflows/ci.yml | grep -n "loyalty_admin\|customer_display"
→ L76: loyalty_admin output ✓
→ L77: customer_display output ✓
→ L104: loyalty_admin paths filter ✓
→ L109-110: customer_display paths filter (apps/customer-display/**) ✓
→ L115: customer-display job ✓
→ L173: e2e-admin-loyalty job (single) ✓

# main ci.yml 대조
git show origin/main:.github/workflows/ci.yml | grep "loyalty_admin\|e2e-admin-loyalty"
→ loyalty_admin output/filter/job 모두 ✓ → PR 과 동일 ✓

# playwright.config DEV_MODE 확인
git show FETCH_HEAD:apps/customer-display/e2e/playwright.config.ts
→ baseURL: http://localhost:${PORT}/customer-display-web (DEV/non-DEV 공통)
→ DEV_MODE webServer url: http://localhost:${PORT} (expo start, prefix 없음)
→ ⚠ expo start dev server 가 experiments.baseUrl 적용 여부 불확실 — advisory

# CI 상태
gh pr checks 269
→ check: PASS ✓
→ markers-and-forbidden: PASS ✓
→ changes-filter: PASS ✓
→ customer-display: pending (실행 중)
→ e2e-admin-loyalty: pending (실행 중)
→ pos-integration: pending (실행 중)
→ unit-commerce-core: pending (실행 중)
(run 43698376167 — BX 커밋이 ci 재트리거)
```

## 판정 세부

| 항목 | 결과 |
|---|---|
| **console.log 운영 노출** | ✓ 제거 완료 |
| **feature-map CI fail** | ✓ 4건 추가 · run 43696973716 PASS |
| **pos-integration null.resolve** | ✓ BS에서 `[...path]` 제거, 재실행 중 |
| matcher 하위경로 curl 5종 | ✓ 모두 통과 |
| ci.yml loyalty_admin 일치 | ✓ main 동일 |
| ci.yml customer_display 추가 | ✓ output·filter·job 모두 |
| e2e-admin-loyalty 중복 | ✓ BX 에서 제거 |
| playwright.config DEV_MODE | ⚠ advisory (머지 블로커 아님) |
| pos-integration CI | 미검증 (실행 중) |
| customer-display CI | 미검증 (실행 중) |
| e2e-admin-loyalty CI | 미검증 (실행 중) |

## 미검증

- pos-integration / customer-display / e2e-admin-loyalty / unit-commerce-core: BX push 로 CI 재트리거 (run 43698376167), 리뷰 시점 pending — 완료 후 확인 필요
- playwright.config DEV_MODE(CD_E2E_DEV=1) 시 `baseURL=/customer-display-web` 와 expo start 서버 경로 일치 여부
