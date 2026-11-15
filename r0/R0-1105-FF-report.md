#277 APPROVE

## 실행 명령·로그

```
gh pr checks 277
  pos-integration   pass 8m35s  run 43705615290
  e2e-admin-loyalty pass 1m27s
  unit-commerce-core pass 1m16s
  markers-and-forbidden pass
  customer-display  pass
  changes-filter    pass

git show origin/feat/m0-1105-cn-loyalty-ci -- (4파일 diff 직독)
git show origin/feat/m0-1105-cn-loyalty-ci:apps/commerce-core/jest.config.js
git show origin/feat/m0-1105-cn-loyalty-ci:scripts/naming-check.sh
git show origin/feat/m0-1105-cn-loyalty-ci:docs/runbooks/prod-migration-check.md
```

---

## REQ 1 — 레이스 수정 4곳

### 메시지 매칭 범위 (`msg.includes("already exists")`)

4곳 모두 동일 패턴:
```typescript
const code = err?.code ?? err?.cause?.code;
const msg = String(err?.message ?? "");
if (code === "23505" || msg.includes("already exists")) { ... }
```

- `"already exists"` 는 Medusa `dbErrorMapper` 가 unique 23505을 `"<Entity>, already exists."` 형식으로 wrap할 때 나오는 고유 메시지.  
- catch 블록이 오직 단일 `createX` 직후에만 적용 → 같은 catch 범위에서 "already exists"를 메시지에 포함하는 다른 에러 종류(비-unique 에러) 가 나올 경우는 없음.  
- `String(err?.message ?? "")` → null-safe. **범위 과도하지 않음.** ✅

### 재조회 빈 결과 처리

| 위치 | 코드 |
|------|------|
| `pos_settings` | `if (retried[0]) { ... } else { throw err; }` ✅ |
| `loyalty_settings` | 동일 ✅ |
| `store_credit_account` | `if (retried.length > 0) { ... } else { throw err; }` ✅ |
| `findOrCreate` (customer) | `if (retried.length > 0) return ...; /* fall-through */ throw err;` ✅ |

4곳 모두 재조회 빈 결과 → 원본 에러 re-throw. 소실 없음. ✅

### 트랜잭션 안 23505 → abort → 재조회 실패 패턴

**`earn.ts`**: `loadSettings()` (→ `getOrCreateStoreSettings()`) 가 `withOrderEarnLock` **앞**에서 호출됨 (line 136 vs 148).

```typescript
const { loyalty, pos } = await loadSettings(container);  // ← 락 밖
// ...
return await withOrderEarnLock(container, input.order_id, async () => {  // ← 여기서 knex trx
```

`pg_advisory_xact_lock` knex 트랜잭션과 무관. ✅

**`link-customer-order.ts`**: `upsertCustomerAndAccount` 는 외부 명시적 트랜잭션 없이 직접 호출. MedusaService `createX` 는 자체 implicit ORM transaction을 사용하고, catch의 `listX` 호출은 새로운 implicit transaction → abort 연쇄 없음. ✅

---

## REQ 2 — jest.config testMatch · naming-check 검사 4 · 런북

### jest.config testMatch

`integration:pos` 에 `loyalty/**` 추가. 다른 TEST_TYPE 영향:

| TEST_TYPE | testMatch | 영향 |
|-----------|-----------|------|
| `integration:http` | `http/**` | 없음 ✅ |
| `integration:modules` | `src/modules/*/__tests__/**` | 없음 ✅ |
| `integration:loyalty` | `loyalty/**` | 여전히 존재 · loyalty spec이 integration:pos·loyalty 양쪽에서 돌아 중복이지만 기능상 문제 없음 ✅ |
| `unit` | `src/**/__tests__/**/*.unit.spec.ts` | 없음 ✅ |

### naming-check 검사 4

`find ... -name 'Migration*.ts' | xargs -n1 basename | sort | uniq -d` → 중복 basename 감지 · 발견 시 경로 포함 출력. CO 리포트에서 로컬 PASS + 양성 샘플 확인 완료. ✅

### 런북 내용 — 경미한 오류 1건

체크 2에 `GET /admin/loyalty/settings` 가 **200** 응답이라 명시되어 있으나, 실제 Medusa admin 라우트 경로는 `src/api/admin/pos/loyalty/settings/route.ts` → **`GET /admin/pos/loyalty/settings`** 가 맞음.

docs-only이고 CI·제품 동작에는 무관하므로 블록 사유는 아님. 다음 편집 시 `admin/loyalty/settings` → `admin/pos/loyalty/settings` 로 정정 권고.

---

## REQ 3 — CI

run 43705615290 전체 통과 (`0da8ff7` 기준).

```
pos-integration   pass 8m35s   ← loyalty 4 spec 포함 · 레이스 케이스 ✅
e2e-admin-loyalty pass 1m27s
unit-commerce-core pass 1m16s
markers-and-forbidden pass
customer-display  pass
changes-filter    pass
```

---

## 판정

APPROVE. 레이스 수정 4곳 모두 올바름(에러 삼킴 없음 · 빈 재조회 re-throw · 트랜잭션 abort 패턴 없음). testMatch 변경 타 TEST_TYPE 영향 없음. CI 전체 통과. 런북 API 경로 경미한 오류 있으나 블록 사유 아님.
