# M0-1105-AP Report

## REQ 1 · rebase 결과

- 브랜치 `test/m0-1105-ao-p6-e2e-admin-pin` → `origin/main` (1f391e6) 위로 rebase 완료.
- `646e1b9` (fix: storeId → #216 에 squash-merge 된 커밋) skip → 충돌 없이 제거됨.
- rebase 후 origin/main..HEAD = 2개 커밋:
  - `75ef74d` test(pos): P6 flow E2E (M0-1105-AO)
  - `e6849a5` fix(test): 더블-부트 fix (M0-1105-AP)
- PR #217 본문 "#216 머지 뒤 머지" → "#216 머지됨" 갱신 완료.

## REQ 2 · 로컬 2회

환경: `DB_HOST=localhost DB_USERNAME=kyu.lee DB_PASSWORD="" JWT_SECRET=test_jwt_secret_ci ...`

**1회차**: 8/8 PASS (25.35s)
**2회차**: 8/8 PASS (21.68s)

```
✓ (a) 현금 결제 → Void(PIN) 성공
✓ (b) 결제 → fulfill(hand_over) → Void 성공
✓ (c-i) 오답 4회 → 정답 성공 (counter 리셋)
✓ (c-ii) 오답 5회 → 정답 시도 → 423 locked
✓ (d) 현금 결제 → 품목 1개 반품(PIN)
✓ (e) 다른 교대에서 Refund(PIN)
✓ (f) 나눠 결제 Cash 40k + Card 60k → 전체 반품 → CASH-first
✓ (g) CARD 실패 주입 → partial → retry → completed · 2번 retry = 이중 환불 없음
```

## REQ 3 · CI 더블-부트 fix

**원인**: `tenders.spec.ts`와 `p6-e2e.spec.ts` 가 각각 `medusaIntegrationTestRunner`를 호출해
동일 Node.js 프로세스(`--runInBand`)에서 Medusa를 두 번 부트 →
두 번째 부트 시 첫 번째 부트가 populate한 모듈 Map에 대해 두 번째 VM realm의
`Map.prototype.set` 호출 → `Method Map.prototype.set called on incompatible receiver #<Map>`.

**원인 file:line**:
`node_modules/@medusajs/test-utils/dist/medusa-test-runner.js`
`setupApplication()` 함수 내 `container.resolve()` 호출 (두 번째 MedusaTestRunner 인스턴스).

**fix**: `apps/commerce-core/package.json` `test:integration:pos` 스크립트를
두 개의 분리된 Jest 프로세스로 나눔 (M0-1105-AI/AJ 패턴 — 각 프로세스 독립 모듈 캐시):
```
tenders.spec 전용 프로세스 → p6-e2e.spec 전용 프로세스
```

## REQ 4 · CI 결과

PR #217 최신 CI run `43051096526`:
- ✅ changes-filter (5s)
- ✅ unit-commerce-core (54s)
- ✅ markers-and-forbidden (6s)
- ✅ pos-integration (2m34s)

**전 잡 초록**.
