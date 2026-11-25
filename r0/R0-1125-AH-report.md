# R0-1125-AH 리포트

## #437 — APPROVE (자체 PR · COMMENT 제출)
## #445 — CHANGES (Blocker 3건)

---

## #437 · M2-1125-V `38f36242` — R0-1125-AF 블로커 3건 해소 확인

| 블로커 | 해소 방법 | 결과 |
|---|---|---|
| Blocker 1 · customer-display typecheck | `order-snapshot.ts`: `export type {…} from "…"` → `import type` + `export type` 분리 → TS2304 해소 | ✅ |
| Blocker 2 · feature-map unmatched | `docs/feature-map.yaml`: `customer-display-types.unit.spec.ts` 등록 | ✅ |
| Blocker 3 · standalone 설치 | main rebase(`#442 hotfix`)로 `@storeport/receipt-view-model` 의존성 제거 — `apps/commerce-core/package.json` 직접 확인 (잔존 없음) | ✅ |
| docker-build | `ci-cloud-quota-exceeded` 라벨로 CI 직접 확인 불가. 코드 레벨 Dockerfile 변경 없고 의존성 문제 해소됨 | ⚠️ 미확인 |

**판정: APPROVE** (GitHub 자체 PR 승인 불가 → COMMENT로 제출)

---

## #445 · M0-1125-R `d2df753` — 계약서 대조표

### §1 상태 필드

| 계약 필드 | 구현 | 판정 |
|---|---|---|
| `PaymentPhase` 5종 | `derivePaymentPhase()` — snapshot_state + pos_screen | ✅ |
| `CustomerFlowState` 7종 | `transitions.ts` + `model.ts` enum | ✅ |
| `customer_flow.state` | `customer_flow_state` 컬럼 우선 + 기존 폴백 | ✅ |
| `customer_flow.phone` — entering/first_visit/confirming 만 전체 | state 무관 전체 번호 반환 | ❌ Blocker 1 |
| `customer_flow.phone_masked` | `maskPhoneE164(phone)` | ✅ |
| `customer_flow.is_first_visit` | `customer_flow_first_visit` 컬럼 | ✅ |
| `customer_flow.points_balance` | `snapshot.loyalty.balance` | ✅ |
| `customer_flow.points_to_earn` | `snapshot.loyalty.earn_preview` | ✅ |
| `customer_flow.points_earned` (적립 완료 시에만) | `confirmed+paid` 시 `receipt.earned ?? 0` — null 시 0 반환 | ⚠️ non-blocking |
| `customer_flow.source: 'cd' \| 'pos'` (null 없음) | `\| null` 허용 · 초기 none 상태에서 null 직렬화 | ❌ Blocker 2 |
| `customer_flow.updated_at` | `confirmed_at ?? skipped_at ?? updated_at` | ✅ |
| `CdSnapshot.tender` | `deriveTender()` — grand_total − receipt.tenders | ✅ |
| `CdSnapshot.receipt` | 기존 그대로 | ✅ |

### §2 응답 형식

| 항목 | 판정 |
|---|---|
| `200 { ok: true, customer_flow }` (추가 필드 `snapshot`, `earn_triggered` 허용) | ✅ |
| `200 { ok: false, reason: 'invalid_transition', customer_flow }` | ✅ |
| 상태 코드 분기 없음 (invalid_transition → 200) | ✅ |

### §2 전이 표

| 전이 | 판정 |
|---|---|
| none/skipped → start_entry → entering | ✅ |
| entering → submit_phone → first_visit/confirming | ✅ |
| first_visit → continue_first_visit → confirming | ✅ |
| first_visit/confirming → change_number → entering | ✅ |
| confirming → confirm → confirmed | ✅ |
| **entering → skip → skipped** (계약) / 구현: entering \| none → skipped | ❌ Blocker 3 |
| confirming → confirm_timeout → unconfirmed | ✅ |
| * → link_phone → confirming | ✅ |
| * → reset → none | ✅ |

### §3 적립 규칙

| 항목 | 판정 |
|---|---|
| paid AND confirmed → 1회 적립 | ✅ |
| 멱등 키 = order_id | ✅ pg_advisory_xact_lock + metadata.loyalty_earn |
| 둘 중 나중 이벤트 처리 | ✅ confirm → linkCustomerToOrder · payment.captured → subscriber |
| subscriber 가드 `customer_flow_state='confirmed'` | ✅ `topFlow && topFlow !== "confirmed"` |
| **기존 POS Link customer (customer_flow_state=null) → 적립 계속** | ✅ null이면 가드 미발동 → 하위 호환 (**기존 적립 끊김 없음**) |

### 마이그레이션 안전성

모든 신규 컬럼 nullable + `add column if not exists` → 기존 행 안전 ✅

### PB1 / display-config

`pb1_pct > 0` → `tax_label="PB1"`, `tax_rate=pb1_pct` (금액 계산과 동일 소스) ✅

### 서버 런타임 @storeport/receipt-view-model import

diff 전체 검색 결과: 없음 ✅

### docker-build

`ci-cloud-quota-exceeded` 라벨 — CI 직접 확인 불가 ⚠️

---

## #445 Blocker 목록

**Blocker 1** · `lifecycle.ts` · `customer_flow.phone` 마스킹 미적용  
계약: `entering/first_visit/confirming` 동안만 전체, 그 외 null.  
현재 state 무관 `snapshot.customer_phone` 그대로 반환 → `confirmed/skipped/unconfirmed` 에서 전체 번호 노출.  
수정: `fullPhoneStates = new Set(["entering","first_visit","confirming"])` 조건부 반환.

**Blocker 2** · `customer-display.ts` + `lifecycle.ts` · `source: null` 허용  
계약: `source: 'cd' | 'pos'` (null 없음).  
초기 `none` 상태에서 `source: null` 직렬화. 타입 계약 위반.  
수정: `?? "pos"` fallback 또는 계약 개정.

**Blocker 3** · `transitions.ts` · `skip` 전이에 `none` 허용  
계약: `entering → skipped`.  
구현: `entering | none → skipped`. 계약에 없는 전이.  
수정: `none` 케이스 제거.

**Non-blocking** · `points_earned ?? 0` → confirmed+paid 미적립 시 0 반환. 계약: 완료 시에만 값 (null 이어야 함).

**판정: CHANGES**
