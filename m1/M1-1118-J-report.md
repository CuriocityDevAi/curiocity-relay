#368 rebase O base=main · #353 rebase O(no-op) 3/3 O

## PR #368 — fix/M1-1118-H-dynamic-imports

### Rebase
- Base: origin/main (f854ef8)
- 고유 커밋: 2개 (M1-1118-G 중복, M1-1118-H 유효)
- M1-1118-G (5358d21) → main에 이미 머지(#367) → 자동 skip
- M1-1118-H (8f2ded2) → e4e0a48 로 rebased
- 결과: 1 커밋 ahead of main

### base 변경
```
gh pr edit 368 --repo CuriocityDevAi/storeport --base main → OK
```

### Push
```
+ 8f2ded2...e4e0a48 fix/M1-1118-H-dynamic-imports (forced update)
```

### Unit Tests
관련 테스트 직접 실행 (boot-smoke, pos-void, pos-return, pos-refund):
- 8 suites, 61 tests → ALL PASS

pre-push hook 전체 단위 테스트:
- commerce-core: 46 suites, 531 tests PASS
- customer-display: 9 files, 155 tests PASS
- event-contracts: 2 files, 21 tests PASS

### PR Checks (CI — 취득 시점: pending)
- changes-filter: pending
- check: pending
- markers-and-forbidden: pending

---

## PR #353 — test/M1-1117-W-net-refund-it

### Rebase
- Base: origin/main (f854ef8)
- 고유 커밋: 1개 (M1-1117-W, 4a55715)
- **add/add 충돌**: net-refund-preview-small.spec.ts
  - HEAD(main, M1-1118-G #367)가 이미 동일 파일을 try/catch 패턴으로 추가
  - PR#353 버전은 direct call 패턴 사용 (axios 4xx throw)
  - 해결: HEAD 버전 채택 (try/catch, main과 동일)
  - git rebase --continue → 커밋 완전 skip (내용 동일)
- 결과: 0 커밋 ahead of main (branch = main HEAD)
- **PR #353 → 자동 CLOSED** (GitHub: "no commits on PR")

### Push
```
+ 4a55715...f854ef8 test/M1-1117-W-net-refund-it (forced update)
```

### IT: net-refund-preview-small (3/3)
```
bash apps/commerce-core/scripts/it.sh net-refund-preview-small
```
- ✓ #W-1 preview→confirmed 성공 · net=99200 · preview_ref 일치 (2268ms)
- ✓ #W-2 잔액 변경 후 confirmed → 409 preview_stale · 환불 레코드 0건 (2500ms)
- ✓ #W-3 confirmed + 필드 누락 → 400 (933ms)
- Test Suites: 1 passed · Tests: 3 passed · Time: 17.313s

### PR Checks
- PR #353 CLOSED: "no commit found on the pull request"

---

## 비고
- PR #353의 테스트 파일(net-refund-preview-small.spec.ts)은 M1-1118-G (#367)에서 이미 main에 포함됨
- PR #353의 작업 목적(3/3 IT 통과)은 main에서 달성된 상태
- PR #368 CI checks는 push 직후 pending 상태 — 실제 통과 여부는 CI 완료 후 확인 필요
