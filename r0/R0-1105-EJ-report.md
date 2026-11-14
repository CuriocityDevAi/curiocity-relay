# R0-1105-EJ — storeport #257 리뷰 결과

**판정: CHANGES** — `settings_hash` 가 UNGATED 키를 포함해 해시함 (계약 위반)

---

## REQ 1 · 계약 5 API 준수표

| Endpoint | 경로 파일 | 요청·응답 | 에러 코드 | 판정 |
|---|---|---|---|---|
| GET /admin/pos/loyalty/settings | `settings/route.ts` GET | `{current, pending, timezone:"Asia/Jakarta"}` ✓ | — | ✓ |
| POST /admin/pos/loyalty/settings/simulate | `settings/simulate/route.ts` | `{simulation_id, settings_hash, expires_at, scenarios[6], impact_30d}` ✓ | — | ✓ |
| POST /admin/pos/loyalty/settings | `settings/route.ts` POST | GATED→409 `simulation_required`, pending→409 `pending_exists`, 과거날짜→400 ✓ | 409/400 ✓ | ✓ |
| POST /admin/pos/loyalty/settings/pending/:id/cancel | `pending/[id]/cancel/route.ts` | `{id, status:"cancelled"}` · reason 5자+ 검증 ✓ | 404 not_found ✓ | ✓ |
| GET /admin/pos/loyalty/settings/audit | `settings/audit/route.ts` | `{items:AuditEntry[], count}` · limit≤200/offset · actor·diff·simulation_snapshot 모두 포함 ✓ | — | ✓ |

AuditEntry 필드 전체(id, created_at, actor:{id,email}, before, after, diff, reason, apply_mode, effective_at, status, applied_at, cancelled_at, cancel_reason, simulation_snapshot) 완비 ✓

---

## REQ 2 · 시뮬 게이트 우회 불가

### ❌ CHANGES — settings_hash 가 GATED 키만 해시하지 않음

**계약**: "settings_hash 계산이 GATED 키 전체"  
**구현**: `service.ts` `hashSettings(settings)` = `sha256(JSON.stringify(sortKeys(settings)))` → settings 에 UNGATED 키(enabled, earn_on_balance_tender_only) 포함됨

**재현 시나리오:**
1. Admin UI가 `{earn_rate_pct:2}` 만 보내 simulate → `after = {...before, earn_rate_pct:2}` → hash H1 (enabled=false 포함)
2. 같은 세션에서 `enabled=true` UNGATED 단독 저장 (simulation 불필요, 저장 성공)
3. `{earn_rate_pct:2, simulation_id:...}` 로 save → `after = {...current_before(enabled=true), earn_rate_pct:2}` → hash H2 ≠ H1 → 409 "settings_hash mismatch"
4. GATED 키는 동일한데 UNGATED 변경으로 시뮬 무효화 → 불필요한 재시뮬 강제

**수정 위치**: `service.ts` `hashSettings` 함수

```typescript
// 현재 (버그)
export function hashSettings(settings: unknown): string {
  return crypto.createHash("sha256")
    .update(JSON.stringify(sortKeys(settings)))
    .digest("hex");
}

// 수정안 — GATED 키만 해시
export function hashSettings(settings: Record<string, unknown>): string {
  const gatedOnly: Record<string, unknown> = {};
  for (const k of GATED_KEYS) gatedOnly[k] = settings[k];
  return crypto.createHash("sha256")
    .update(JSON.stringify(sortKeys(gatedOnly)))
    .digest("hex");
}
```

`simulate/route.ts` 의 `createSimulation(after)` 호출과 `settings/route.ts` 의 `hashSettings(after)` 비교 모두 위 함수를 거치므로 한 곳만 수정하면 됨.

---

30분 만료: `new Date(Date.now() + 30 * 60 * 1000)` ✓  
UNGATED 단독 변경 → `hasGatedChange()` false → 게이트 미발동 ✓  
GATED 9개 키 모두 `GATED_KEYS` 배열에 포함 ✓

---

## REQ 3 · 계산 순수 함수 (Q4 · 6시나리오 · 2건 손계산)

**전제 설정**: enabled=true, earn_rate_pct=1%, round_mode=floor, min_use_amount=10,000, max_use_pct=100, tax_mode=payment, pb1=10%, sc=0

### 케이스 A — normal (subtotal=100,000, credit=0)

| 단계 | 계산 | 결과 |
|---|---|---|
| taxableBase (payment) | 100,000 | 100,000 |
| pb1 | floor(100,000 × 10%) | 10,000 |
| total | 100,000 + 10,000 | **110,000** |
| paid_other | 110,000 − 0 | **110,000** |
| earnBase (paid_non_credit) | paidOther = 110,000 | — |
| credit_earned | floor(110,000 × 1%) | **1,100** |

코드 `previewReceipt` 추적: `taxableBase=subtotalAfterDiscount=100,000`, `pb1=floor(100,000×10/100)=10,000`, `total=110,000`, `paidOtherFull=110,000-0=110,000`, earnBase=paidOtherAfterRefund=110,000, creditEarned=floor(1,100)=1,100 ✓

### 케이스 B — credit_partial (subtotal=100,000, credit_req=30,000, bal=50,000)

| 단계 | 계산 | 결과 |
|---|---|---|
| cap | floor(100,000 × 100%) = 100,000, bal=50,000 → min=30,000 | creditUsed = **30,000** |
| taxableBase (payment) | 100,000 (credit는 tender) | 100,000 |
| pb1 | floor(100,000 × 10%) | 10,000 |
| total | 100,000 + 10,000 | **110,000** |
| paid_other | 110,000 − 30,000 | **80,000** |
| earnBase | paidOther = 80,000 | — |
| credit_earned | floor(80,000 × 1%) | **800** |
| balance_after | 50,000 − 30,000 + 800 | **20,800** |

테스트 "tax_mode=payment: PB1 on original subtotal": pb1=10,000, total=110,000, paid_other=80,000 ✓  
테스트 "tax_mode=discount: PB1 on AFTER credit": pb1=7,000(=floor(70,000×10%)), total=77,000, paid_other=77,000 ✓

순수 함수 확인: `receipt-preview.ts` `previewReceipt` import 없음·side-effect 없음·동일 input → 동일 output ✓  
6시나리오 fixture: SCENARIO_KEYS `["normal","credit_partial","credit_full","credit_plus_qris","partial_refund","preorder_dp"]` 완비 ✓

---

## REQ 4 · 감사 테이블 append-only · actor · job · timezone · 대기 1개 · 취소

| 항목 | 구현 위치 | 확인 |
|---|---|---|
| append-only (수정·삭제 경로 없음) | `audit/route.ts` GET만 존재; `/audit` 하위 DELETE·PUT·PATCH 라우트 없음 | ✓ |
| actor 기록 | `actorFromReq()` → `actor_id`, `actor_email` from `auth_context` → `writeAudit` | ✓ |
| 예약 job 멱등 | `applyScheduledNow()`: scheduled 행만 처리 → applied 전환 → 재실행 시 scheduled 행 없어 0 반환 | ✓ |
| 매장 timezone 00:00 | `Date.UTC(y, m-1, d, -7, 0, 0, 0)` = UTC 이전날 17:00 = WIB 00:00 (UTC+7, no DST) | ✓ |
| 대기 1개 | DB `UNIQUE WHERE status='scheduled' AND deleted_at IS NULL` + POST에서 `getPending()` 체크 → 409 `pending_exists` | ✓ |
| 취소 | `cancelPending(id, reason)`: status≠scheduled → null(→ 404), scheduled → `status:"cancelled"`, `cancelled_at`, `cancel_reason` 갱신 | ✓ |

`audit/route.ts` 에 `cancelPending` 경로 없음 — `/settings/pending/:id/cancel` 별도 라우트에서만 호출 ✓  
content (before/after/diff/reason/simulation_snapshot) 는 갱신 없음; 상태 전환만 시스템이 기록 ✓

---

## REQ 5 · impact_30d 읽기 전용 · 상한 · 성능

- **읽기 전용**: `computeImpact30d` 는 `listOrders` + `previewReceipt`(순수 함수) 만 호출. DB write 없음 ✓
- **상한**: `take: 2000`; `orders.length >= 2000` → `sampled: true` 플래그 ✓
- **쿼리 수 (simulate endpoint 전체)**:
  1. `getOrCreateStoreSettings()` — 1 query
  2. `posSvc.getOrCreateStoreSettings()` — 1 query
  3. `orderSvc.listOrders(...)` — 1 query
  4. `createLoyaltySimulations(...)` — 1 query
  - 합계 ~4 쿼리. orders 에 대한 추가 쿼리 없음 (previewReceipt 는 in-memory) ✓

`outstanding_liability = Σ(credit_earned − credit_used)` over window: 30일 순 부채 발생분 계산. 절대 잔액이 아닌 delta 임을 감안하면 contract 의 `{before, after}` 표현에 부합 ✓

---

## REQ 6 · Migration 운영 영향 · CI

**Migration:**
- 신규 테이블 3개만 (`loyalty_settings`, `loyalty_audit`, `loyalty_simulation`) — 기존 테이블 변경 없음 ✓
- 모든 `CREATE TABLE/INDEX` 에 `IF NOT EXISTS` 가드 ✓
- `down()` = `DROP TABLE ... CASCADE` (3개 모두) ✓

**CI:**
- GitHub Actions check runs: integration 토큰 접근 불가 (403). 직접 조회 불가.
- PR 본문 자기 보고: typecheck ✓, unit tests 188개 (신규 28개 포함) ✓
- 봇 코멘트 1건: feature-map `planned→live` 승격 제안 (cosmetic, non-blocking)
- CI 결과 직접 확인 필요 (push 직후 자기 검증 미완료로 PR 체크박스 미완료 상태)

---

## 판정 요약

| REQ | 항목 | 결과 |
|---|---|---|
| 1 | 계약 5 API 경로·요청·응답·에러 코드 | ✓ |
| 2 | 시뮬 게이트 — settings_hash | ❌ GATED 키만 해시해야 함 |
| 2 | 30분 만료 · UNGATED 단독 생략 | ✓ |
| 3 | 순수 함수 · 2건 손계산 대조 | ✓ |
| 4 | append-only · actor · 멱등 · timezone · 1개 제한 · 취소 | ✓ |
| 5 | impact_30d 읽기 전용 · 상한 · 쿼리 수 | ✓ |
| 6 | migration 신규 테이블만 | ✓ |
| 6 | CI jobs 결과 | 직접 확인 불가 (PR 자기보고만) |

**필수 수정 1건**: `service.ts` `hashSettings` — GATED 키만 해시하도록 수정.
