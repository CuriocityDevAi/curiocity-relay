PR #352 · diff 파일 1개 · customer-display 제거 방식: 리베이스 소멸(이미 main #351 · SHA 6f7ae27 → 367d02a)

## git diff origin/main --name-only

docs/plans/order-list-standardize.md

## 작업 내용

### REQ 1 — 코드 섞임 제거
- `git rebase origin/main` 수행
- `6f7ae27 fix(customer-display): M2-1117-AA` 커밋이 main의 `367d02a` (#351) 와 동일 변경으로 판정 · skip됨
- `apps/customer-display/**` 별도 브랜치 분리 불필요 (리베이스 소멸)
- 리베이스 후 diff = `docs/plans/order-list-standardize.md` 1개

### REQ 2 — R1·R2 호출 앱 보완
- R1 `/admin/pos/orders-list`: "Commerce Core admin 화면" → "Commerce Core admin 화면 · fork POS (`lib/pos-order-adapter.ts` · M3-1117-B)"
  - `lib/pos-order-adapter.ts` = M3-1117-B 진행 중 (fork-wts 미확인 · 리뷰어 R0-1117-AT 확인 근거)
- R2 `/admin/pos/draft-orders`: "없음 (통합 테스트 전용)" → "fork POS split-tender (`api/hooks/split-pending-orders.ts:40`)"
  - 파일 확인: `/Users/kyu.lee/curiocity-live/fork-wts/M1-1105-CO-wt/api/hooks/split-pending-orders.ts:40`
  - 줄 40: `sdk.client.fetch('/admin/pos/draft-orders${params}')` 호출 확인

### REQ 3 — Wing 픽업 필터 슬롯 추가
- Section 3-A step Input 블록 아래 한 줄 추가: `filters.pickup_at_range`·`filters.pickup_status` application-level 확장 슬롯(metadata.pickup_* 기반 · #354 상태 머신)
- Section 4 Wing 행 현재 상태 컬럼에 동일 내용 추가

### REQ 4 — PR 본문 확인
- 리베이스 후 diff = docs 1개 → "코드 변경 없음" 사실

## 커밋
- `262a50b` (기존 docs 커밋) → rebase 후 `90a96ee` (변경 적용)
- push 완료: `docs/M2-1117-AB-order-list-diag` → origin (force-with-lease)
