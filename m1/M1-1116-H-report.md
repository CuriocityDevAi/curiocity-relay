# M1-1116-H report

**PR #296 · `pnpm --filter commerce-core test:integration` · main pos-integration 198 통과 / 3 실패 (orders-list #1/#2/#6)**

---

## REQ 완료 요약

| REQ | 내용 | 상태 |
|---|---|---|
| REQ1 | `pnpm --filter commerce-core test:integration [패턴]` / `scripts/it.sh <패턴>` | **DONE** |
| REQ2 | main pos-integration 전체 실행 결과 | **DONE** |
| REQ3 | `docs/runbooks/local-integration.md` 5줄 + 한 줄 요약 | **DONE** |

---

## REQ1 · 단일 진입점

### `scripts/it.sh`
- `apps/commerce-core/scripts/it.sh` 신설 (100755)
- `bash scripts/it.sh` → pos 14 + loyalty 5 = **19 스펙 전체 실행**
- `bash scripts/it.sh <패턴>` → 파일명 부분 매칭 필터 (예: `bash scripts/it.sh tenders`)
- `pg_isready` 로 Postgres 사전 확인 · 없으면 `docker run` 안내
- CI `pos-integration` 잡 환경변수(`DB_HOST/JWT_SECRET/COOKIE_SECRET/NODE_ENV=test`) 기본값 내장

### `package.json` 스크립트
```json
"test:integration": "bash scripts/it.sh"
```
→ `pnpm --filter commerce-core test:integration` 또는 `pnpm --filter commerce-core test:integration -- tenders`

---

## REQ2 · main pos-integration 결과 (2026-11-16 로컬 실측)

**브랜치**: `feat/m1-1116-h-integration-runner` (origin/main 기반 · 추가 src 없음)
**Postgres**: 로컬 (pg_isready OK)
**선행**: `pnpm --filter commerce-core build` (medusaIntegrationTestRunner compiled admin 필요)

### 스펙별 결과

| 스펙 | 결과 | 테스트 수 |
|---|---|---|
| pos/open-order-reservations | ✅ PASS | 5 |
| pos/orders-list | ❌ FAIL | 3 passed / 3 failed |
| pos/p6-e2e | ✅ PASS | 10 |
| pos/partial-refund-anytime | ✅ PASS | 3 |
| pos/pos-qris-simulate | ✅ PASS | 12 |
| pos/pos-tax-lines | ✅ PASS | 9 |
| pos/refund-decision-bc | ✅ PASS | 3 |
| pos/refund-ghost-reservation | ✅ PASS | 5 |
| pos/refund-receipt-kind | ✅ PASS | 4 |
| pos/refund-retry-qris | ✅ PASS | 7 |
| pos/split-pending-draft-orders | ✅ PASS | 6 |
| pos/stock-cleanup | ✅ PASS | 1 |
| pos/tenders | ✅ PASS | 96 |
| pos/void-refund-restock | ✅ PASS | 6 |
| loyalty/customer-display-link-phone | ✅ PASS | 5 |
| loyalty/customer-link | ✅ PASS | 12 |
| loyalty/expiry | ✅ PASS | 2 |
| loyalty/link-earn | ✅ PASS | 7 |
| loyalty/store-credit-smoke | ✅ PASS | 2 |

**총계: 198 통과 / 3 실패 / 201 테스트 · 19 스펙 중 18 통과**

### orders-list 실패 상세

- `#1 전화번호 가림 형식`: `customer_phone_masked` 값 불일치 (`"0813-****-4801"` 기대)
- `#2 전화번호 일부 필터 (q=2480)`: 검색 결과에 주문 미포함
- `#6 loyalty_earn + loyalty_recover → 순적립`: `loyalty_earn` 값 불일치 (2000 기대)

**원인**: M1-1116-B (POS Orders 목록 · 전화번호·적립·번호 검색) 기능이 main에 merged (#288) 됐으나 테스트 3건 실패 중. 본 태스크 범위 밖 — 별도 추적 필요.

---

## REQ3 · `docs/runbooks/local-integration.md`

```markdown
# 로컬 통합 테스트 (pos-integration CI 재현)

**한 명령**: `pnpm --filter commerce-core test:integration` — 로컬 Postgres + pos & loyalty 전체 실행.
**패턴 필터**: `pnpm --filter commerce-core test:integration -- tenders` (bash scripts/it.sh tenders 호출).
**사전 조건**: `pg_isready -h localhost -p 5432` 통과 · 없으면 `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine`.
**첫 실행**: `pnpm --filter commerce-core build` 선행 필요 (medusaIntegrationTestRunner 가 compiled admin 필요).
**CI 대응**: `.github/workflows/ci.yml` `pos-integration` 잡 환경변수(`DB_HOST/JWT_SECRET/COOKIE_SECRET`) = scripts/it.sh 기본값과 동일.

> 한 줄 요약: `pnpm --filter commerce-core test:integration` — 로컬 Postgres 있으면 CI pos-integration 전체를 한 명령으로 재현.
```

---

## 이연

- **orders-list 3 실패**: M1-1116-B `customer_phone_masked` 형식·전화번호 검색·loyalty_earn 순적립 — main 버그. 별도 M1 태스크로 추적.
