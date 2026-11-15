# M3-1116-A report

captured 분리(paid_so_far=captured·pending_amount신규) · feature-map PASS · CI 전 job PASS · mergeState=BLOCKED(리뷰 미완료 · CI 전통과)

## 수행 내역

### REQ1 — paid_so_far = captured 전용 · pending_amount 분리

**`route.ts`** (`apps/commerce-core/src/api/admin/pos/draft-orders/route.ts`):
- `paidSoFar` = activeTenders 중 `status === "captured"` (또는 legacy no-status) 합산
- `pendingAmount` = activeTenders 중 `status === "pending"` 합산 (신규 필드)
- `remaining = Math.max(0, grandTotal - paidSoFar)` — captured 기준 유지
- 섹션 노출 조건 `isActiveTender` (captured|pending ≥ 1) 변경 없음
- 응답에 `pending_amount` 필드 추가

**fork #147 타입** (`api/hooks/split-pending-orders.ts`):
- `SplitPendingDraftOrder`에 `pending_amount: number` 추가 — `paid_so_far` 필드명 유지

### REQ2 — pos-integration 테스트: pending 1 + captured 1

`split-pending-draft-orders.spec.ts` 테스트 `#5` 추가:
- captured 80000 + pending 50000 주문 생성
- `paid_so_far === 80000` (captured만)
- `pending_amount === 50000`
- `remaining === 120000` (200000 - 80000)

### REQ3 — feature-map.yaml 등록

`docs/feature-map.yaml`에 프로세스 신설:
```yaml
- id: split-pending-orders
  name: 나눠결제 미완료 주문 목록 (M1-1105-CO)
  status: live
  files:
    - apps/commerce-core/src/api/admin/pos/draft-orders/**
```
→ `check` CI PASS 확인

### REQ4 — main rebase

`origin/main` 2커밋(M0-1105-CP · M3-1105-CS) rebase 완료 — conflict 없음

## CI 결과 (PR #285 · CuriocityDevAi/storeport)

| job | 결과 |
|-----|------|
| check (feature-map) | ✅ PASS (12s) |
| pos-integration | ✅ PASS (9m29s) |
| unit-commerce-core | ✅ PASS (1m11s) |
| customer-display | ✅ PASS (2m37s) |
| e2e-admin-loyalty | ✅ PASS (1m35s) |
| markers-and-forbidden | ✅ PASS (9s) |
| changes-filter | ✅ PASS (11s) |
| docker-smoke-* | SKIPPING (Dockerfile 미변경) |

## mergeState

`BLOCKED` — CI 전통과 · mergeable=MERGEABLE · reviewDecision="" (리뷰 1건 필요)
