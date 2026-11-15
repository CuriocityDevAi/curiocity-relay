# M0-1105-CF — #261 R7 리뷰 수정 리포트

**결과: PR #261 Ready-for-review · CI 전 job pass · now 운영 차단 + Postgres advisory lock 로 동시 실행 이중 차감 봉인.**

---

## 1. REQ 처리 매트릭스

| # | 요구 | 상태 | 근거 |
|---|------|------|------|
| 1 | `POST /admin/pos/loyalty/expire` 의 `now` 운영 차단 · 테스트 1건 | ✅ | `apps/commerce-core/src/api/admin/pos/loyalty/expire/route.ts:14-18` (production 분기 400) · `__tests__/route.unit.spec.ts` 3건 (prod 400 · dev 통과 · prod 미제공 정상) |
| 2 | 플러그인 reference_id unique 확인 → 없음 → advisory lock · 테스트 (동시 2회 → debit 1회) | ✅ | **결과 1줄**: `store_credit_account_transaction` 테이블은 pkey(id)만 unique · reference_id unique 제약 **없음** (plugin migration `Migration20250130220640.js:7` sql 직접 확인). → runner 전 과정을 `pg_try_advisory_lock(hashtext('loyalty-expiry')::bigint)` session lock 으로 직렬화 (`expiry-runner.ts:61-80` lock 획득 · `finally` 로 unlock). 미획득 시 `skipped_reason="locked"` · debit 미호출. 테스트: `__tests__/expiry-runner.unit.spec.ts` 4건 (lock 미획득 skip · **동시 2회 Promise.all → debit 1회** · 성공 시 unlock · 가드 선행 시 lock 미호출). |
| 3 | PR 본문에 "다중 인스턴스 cron 중복 실행 방지 방식" 1절 · draft 해제 | ✅ | 본문 §"다중 인스턴스 cron 중복 실행 방지 방식" 추가 (플러그인 unique 부재 설명 + advisory lock 메커니즘 + 멱등 가드와의 보완 관계). `gh pr ready 261` → "ready for review". |
| 4 | `gh pr checks 261` job 이름별 결과 | ✅ | §3 아래. |

---

## 2. 변경 Diff 요약

**Commit** `13c5003` on `feat/m0-1105-cd-loyalty-expiry` (origin/main 최신 `febd998` 위에 rebase 완료)

```
 apps/commerce-core/src/api/admin/pos/loyalty/expire/__tests__/route.unit.spec.ts         | +96   (new)
 apps/commerce-core/src/api/admin/pos/loyalty/expire/route.ts                             |  +9 -1
 apps/commerce-core/src/lib/loyalty/__tests__/expiry-runner.unit.spec.ts                  | +134  (new)
 apps/commerce-core/src/lib/loyalty/expiry-runner.ts                                      | +112 -37
 docs/feature-map.yaml                                                                    |  +1 -2
```

- **route.ts**: `body.now` 처리 앞에 `if (NODE_ENV === "production") 400` 가드.
- **expiry-runner.ts**: `ExpiryRunResult.skipped_reason` 유니온에 `"locked"` 추가 · `tryAcquireAdvisoryLock` / `releaseAdvisoryLock` 헬퍼 + `resolvePgConnection` 추가 · settings 가드 선행 · 본체 `try/finally`.
- **feature-map.yaml**: `loyalty-expiry-r7.files` 를 `src/lib/loyalty/expiry.ts` + `expiry-runner.ts` 두 줄 → `src/lib/loyalty/**` 글롭으로 압축 (신규 `__tests__/expiry-runner.unit.spec.ts` 커버).

---

## 3. CI 결과 (gh pr checks 261 · run 43672673017)

| job | 결과 | 시간 |
|-----|------|------|
| changes-filter | **pass** | 6s |
| check | **pass** | 13s |
| markers-and-forbidden | **pass** | 6s |
| unit-commerce-core | **pass** | 1m 6s |
| pos-integration | **pass** | 6m 3s |
| docker-smoke-anchor | skipping | — (changes filter) |
| docker-smoke-commerce-core | skipping | — |
| docker-smoke-wing | skipping | — |
| wrangler-check-care-agent | skipping | — |

→ **전 non-skipping job pass**.

로컬 추가 확증:
- `npx tsc --noEmit` (`apps/commerce-core`) → 에러 0.
- `npx jest route.unit.spec.ts expiry-runner.unit.spec.ts expiry.unit.spec.ts` → **19 passed · 3 suites**.

---

## 4. 동시 실행 이중 차감 봉인 메커니즘

1. **플러그인 DB 제약**: `store_credit_account_transaction` pkey=id, `reference_id` unique **없음** (`.medusa/server/src/modules/store-credit/migrations/Migration20250130220640.js:7` `addSql` SQL 직접 확인). 동일 `reference_id="expiry:<credit_tx_id>"` 를 두 인스턴스가 동시에 insert 해도 DB 가 거부하지 않음 — 이중 debit 가능.
2. **방어선**: `runLoyaltyExpiry` 의 계좌 리스트 → tx 조회 → debit 전 과정을 Postgres session-level advisory lock 으로 감싼다.
   ```sql
   select pg_try_advisory_lock(hashtext('loyalty-expiry')::bigint)
   ```
   - 비차단 획득 시도. 이미 잡고 있는 세션이 있으면 false 반환 → `skipped_reason="locked"` 리턴, debit 미호출.
   - `try/finally` 로 `pg_advisory_unlock` 호출. 커넥션 반납되면 session lock 은 자동 해제되므로 unlock 실패는 무시.
3. **멱등 가드와의 관계**: 기존 `expiry:<credit_tx_id>` reference_id 가드(순차 재실행 창)와 advisory lock(동시 실행 창)이 보완 관계. 가드(enabled=false · expiry_days=0)는 lock 획득 **전** 에 선행 skip (lock 선점 금지).

---

## 5. 네이밍·범위 준수 / 금지 조항

- `grep -rE "\bmeros\b" apps/ packages/` → 0 (route.ts + runner + tests 모두 "loyalty" · "expiry" 만).
- POS 결제 라우트 수정 없음 (loyalty 전용 route + runner + 테스트 + feature-map만).
- Admin UI 수정 없음.
- PR 머지 미수행 (ready-for-review 로 올려만 둠).
- 운영 SSH·railway CLI·운영 DB·키체인 접근 없음.
- 20분 내 종료 (30분 상한 준수).

---

## 6. 후속 (리뷰어 안건)

- `R0-1105-ER §3-4 ⚠️` 두 항목 모두 봉인 완료 — R0 재점검 요청 가능 상태.
- advisory lock 의 integration 레벨 검증은 CI pg 레인을 늘려야 (현재 unit mock) · 필요시 별도 티켓.
