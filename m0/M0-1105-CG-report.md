# M0-1105-CG — #262 CI · #261 CI 전원 통과

## 한 줄
#262 CI green (unit-commerce-core · pos-integration · check · markers · changes-filter 전부 pass) · #261 CI green (동일 5 job pass) · 두 PR 작은 수정 각각 1 commit 추가.

## PR #262 — maskPhoneE164 phone-id 재사용 · CI 빨강 해소

### 조치
- 대상 파일: `apps/commerce-core/src/types/customer-display.ts`
- 자체 구현 `maskPhoneE164` 제거 → #258 머지된 `apps/commerce-core/src/lib/phone-id.ts` 의 `maskE164` / `normalizePhone` 재사용.
  - `+62` 접두: `maskE164` 호출 → `0812-****-6789` 형식.
  - 유효 로컬 포맷: `normalizePhone(ok).masked` → 동일 형식.
  - 폴백 (짧거나 부정형): `"*".repeat(len)` 유지 (기존 짧은번호 테스트 호환).
- 단위 테스트 2건 기대값을 `0812-****-6789` 로 갱신 (계약 §1 `phone_masked` 와 포맷 통일):
  - `maskPhoneE164("+628123456789")` → `"0812-****-6789"`
  - `serializeSnapshot(... customer_phone: "+628123456789" ...).receipt.phone_masked` → `"0812-****-6789"`
- main rebase 후 force-with-lease push.

### 로컬 검증
`apps/commerce-core`:
- order-snapshot.unit.spec.ts — 20/20 pass
- 전체 unit — 233/233 pass · 16 suites

### CI (run 43677663660 · HEAD bebf6e1)
| Job                        | Result    | Time  |
| -------------------------- | --------- | ----- |
| changes-filter             | pass      | 5s    |
| check                      | pass      | 13s   |
| markers-and-forbidden      | pass      | 7s    |
| unit-commerce-core         | pass      | 57s   |
| pos-integration            | pass      | 6m27s |
| docker-smoke-anchor        | skipping  | 0     |
| docker-smoke-commerce-core | skipping  | 0     |
| docker-smoke-wing          | skipping  | 0     |
| wrangler-check-care-agent  | skipping  | 0     |

### 커밋
`bebf6e1 fix(customer-display): M0-1105-CG · #262 — maskPhoneE164 phone-id 재사용 (0812-****-7890 통일)`

## PR #261 — advisory lock 커넥션 풀 안전성 (오케 지적)

### 지적의 근거
`expiry-runner.ts` 의 기존 패턴:
```ts
await pg.raw("select pg_try_advisory_lock(hashtext(?)::bigint)", [KEY]);  // 커넥션 A
// ... 작업 ...
await pg.raw("select pg_advisory_unlock(hashtext(?)::bigint)", [KEY]);    // 커넥션 B 가능
```
knex pool 에서는 두 `.raw()` 호출이 서로 다른 커넥션으로 디스패치될 수 있음.
→ 해제가 다른 커넥션에서 실행되면 `pg_advisory_unlock` 은 조용히 false 반환 (경고/오류 없음, 로그에만 fallthrough), lock 은 A 커넥션 수명 동안 남는다. 이후 cron 실행이 전부 `skipped_reason="locked"` 로 건너뛰는 숨은 장애.

### 조치 — 같은 커넥션 보장 (권장안: xact lock in tx)
```ts
await pg.transaction(async (trx) => {
  const r = await trx.raw(
    "select pg_try_advisory_xact_lock(hashtext(?)::bigint) as acquired", [KEY]
  );
  if (!acquired) return { acquired: false };
  const result = await fn();
  return { acquired: true, result };
  // 트랜잭션 종료 시 xact lock 자동 해제 — 같은 커넥션 보장.
});
```
- `pg_try_advisory_xact_lock` 은 트랜잭션이 끝나는 시점에 **같은 커넥션에서 자동 해제**됨 (Postgres 문서).
- 명시적 `pg_advisory_unlock` SQL 호출이 **사라졌음** → 누수 경로 자체가 제거됨.

### 추가 운영 가드 — 연속 locked 경고
모듈-level 카운터 `consecutiveLockedCount` 추가:
- `locked` 반환마다 `+1`, 임계값 `3` 도달 시 `logger.warn(...)` 1회.
  - 메시지: `"[loyalty-expiry] advisory lock skipped 3 runs in a row — check for stuck lock or long-running sibling instance."`
- lock 획득 성공 / `disabled` / `no_expiry` / pg 미존재(테스트 환경) 시 카운터 리셋.

### 테스트 보강
`apps/commerce-core/src/lib/loyalty/__tests__/expiry-runner.unit.spec.ts` — 기존 4 → 7 tests (모두 pass):

1. `lock 획득 실패 시 skipped_reason='locked' · debit 호출 없음` (갱신 · xact lock api 반영)
2. `동시 2회 실행 — lock 소유자만 debit (총 debit 1회)`
3. `lock 획득 성공 → 정상 debit · xact lock 은 트랜잭션이 끝나며 자동 해제 (명시 unlock SQL 없음)` — `pg_advisory_unlock` 호출 0 임을 assert
4. **`lock 획득/해제가 같은 트랜잭션(=같은 커넥션) 안에서 일어난다`** — `pg.transaction` 콜백 1회 호출 · trx.raw 로 lock SQL 1회 · pg.raw(외부 커넥션) 로 lock SQL 0회 assert
5. `settings 가드(enabled=false)에서는 트랜잭션·lock 미호출`
6. **`'locked' 가 연속 3회면 운영 경고 로그 1건`** — 1·2회차 warn 없음, 3회차에 warn 1회
7. `'locked' 카운터는 lock 획득 성공 시 초기화` — locked, locked, acquired(reset), locked, locked → warn 없음

### 로컬 검증
- expiry-runner.unit.spec.ts — 7/7 pass
- 전체 unit — 235/235 pass · 18 suites

### CI (run 43677896883 · HEAD b00fc82)
| Job                        | Result    | Time  |
| -------------------------- | --------- | ----- |
| changes-filter             | pass      | 6s    |
| check                      | pass      | 13s   |
| markers-and-forbidden      | pass      | 8s    |
| unit-commerce-core         | pass      | 59s   |
| pos-integration            | pass      | 5m12s |
| docker-smoke-*             | skipping  | 0     |
| wrangler-check-care-agent  | skipping  | 0     |

### 커밋
`b00fc82 fix(loyalty): M0-1105-CG · #261 — advisory lock 커넥션 풀 안전성 (xact lock in tx)`

## 머지 대기
두 PR 모두 CI green · 머지는 사용자/T0 소관 (상시 금지 '** PR 머지 금지**' 준수).
