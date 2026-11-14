# M0-1105-CB — Loyalty R2 서버 (설정·시뮬·감사) — 구현 완료 · PR #257 draft

## 결과 한 줄
Medusa 범용 audit 없음(R0 확인) → 자체 `loyalty_settings` 모듈 3테이블 + 5개 admin API + receipt-preview 순수함수(6시나리오) + 예약 반영 job(5분 멱등) + 28개 신규 테스트. 계약(ledger/loyalty-r2-contract.md) 전수 준수 · 계약 변경 없음.

## PR
- https://github.com/CuriocityDevAi/storeport/pull/257 (draft · base=main)
- 브랜치: `feat/m0-1105-cb-loyalty-settings-r2`
- HEAD: 4c52bbb
- 17 files · 1,831 insertions
- 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1105-CB-wt`

## R0 — Medusa 범용 audit 유무
`grep -rn "audit" node_modules/@medusajs/ --include="*.d.ts"` = 0 hit (settings/entity 단위 범용 audit 모듈 **없음** · `@medusajs/loyalty-plugin` 포함). 자체 테이블로 구현.

## 계약 준수 표 (ledger/loyalty-r2-contract.md)

| Endpoint | 구현 | 비고 |
|---|---|---|
| GET /admin/pos/loyalty/settings | ✓ | `{ current, pending, timezone: "Asia/Jakarta" }` |
| POST /admin/pos/loyalty/settings/simulate | ✓ | simulation_id · settings_hash(SHA-256) · expires_at(+30분) · scenarios[6] · impact_30d |
| POST /admin/pos/loyalty/settings | ✓ | GATED 변경 시 sim+hash 검증 (실패 → 409 simulation_required) · scheduled 1개 제한 (중복 → 409 pending_exists) · 과거날짜 400 · UNGATED 만 바뀌면 sim 불필요 |
| POST /admin/pos/loyalty/settings/pending/:id/cancel | ✓ | reason 5자+ 필수 |
| GET /admin/pos/loyalty/settings/audit | ✓ | limit/offset · DESC(created_at) · 수정/삭제 route 없음 |

## 핵심 설계 포인트
- **계산 규칙** `src/lib/loyalty/receipt-preview.ts` (순수 함수 · R4~R6 재사용의 단일 원천)
  - Q4 확정: PB1 은 원래 총액 · 적립금=결제수단(tax_mode=payment 기본) · tax_mode=discount 는 세전 공제
  - earn_base 2옵션 (`paid_non_credit` | `paid_non_credit_pre_tax`)
  - round_mode(floor/round/ceil) · max_use_pct_per_order · min_use_amount
- **6시나리오 fixture**: normal · credit_partial · credit_full · credit_plus_qris · partial_refund · preorder_dp. 스냅샷 12개 (라인 + totals) 로 회귀 보호.
- **impact_30d**: `order` 모듈에서 completed 주문 최근 30일 조회 → before/after 설정으로 재계산. `take: 2000` · `sampled` flag. order 모듈 미가용 시 0 (graceful).
- **감사 테이블 append-only**: 
  - DB 레벨 partial unique index `(scope) WHERE status='scheduled' AND deleted_at IS NULL` → 동시 2개 불가
  - Route 레벨 `GET` 만 노출 (DELETE/PUT/PATCH 부재 · route 파일 스캔 테스트로 보증)
  - 역사 content (before/after/diff/reason/simulation_snapshot) 변경 불가 — 시스템 상태 전환(applied_at/cancelled_at/cancel_reason) 만 service 가 기록
- **예약 반영 job** `src/jobs/loyalty-settings-apply.ts`: `*/5 * * * *` · `effective_at ≤ now` 인 scheduled → applied 전환 + settings 업데이트 · 재실행 멱등.

## 기술 선택지 · 채택 · 이유 (PR 본문에도 3줄)
1. **신규 모듈 신설 vs pos_settings 확장** → 신규 모듈. 3테이블 신규 필요 · GATED 게이트 로열티 전용 · receipt-preview 와 응집.
2. **감사 저장** → 1 row + status 전환 (scheduled→applied|cancelled). append-only 의미 = content 불변 + 수정/삭제 API 미노출. 시스템 상태 전환만 service가 기록.
3. **예약 job 주기** → 5분 폴링. `0 17 * * *` (WIB 00:00 단일 실행) 도 가능하지만 5분 폴링이 재시도·멱등에 더 안전.

## 자기 검증 — 로컬
- `pnpm --filter commerce-core run typecheck` → 통과 (TS2769 1건 발견·수정 완료 · 최종 0)
- `pnpm --filter commerce-core test` → **188 passed, 14 suites, 12 snapshots** (기존 160 + 신규 28)
- `bash scripts/naming-check.sh` → PASS (meros 매치 0 · 모듈명 규격 정합)
- `pnpm -r typecheck` → wing 만 사전 실패 (React 19 types · 이번 PR 무관)

## 자기 검증 — CI 최종 (PR #257, HEAD 4c52bbb)
| Job | Result | Duration |
|---|---|---|
| changes-filter | **pass** | 6s |
| markers-and-forbidden | **pass** | 8s |
| check | **pass** | 14s |
| unit-commerce-core | **pass** | 1m 4s |
| pos-integration | **pass** | 4m 54s |
| docker-smoke-{anchor, commerce-core, wing} | skipping | — (해당 변경 없음) |
| wrangler-check-care-agent | skipping | — (해당 변경 없음) |

전 체크 green · PR 머지 준비됨(사용자 승인 대기).

## 범위 외 · 금지 준수
- POS 결제 라우트 (tenders/refund/return/void · xendit webhook) 수정 없음
- Admin UI (`src/admin/**`) 수정 없음 (M2-1105-BM 소관)
- 계약 변경 없음 (R1 #255 와도 독립 · 같은 medusa-config 블록 안 건드림)

## feature-map
`docs/feature-map.yaml` 에 `loyalty-settings-r2` 프로세스 신설 (pos-settings 다음) · 파일 커버리지 포함 → `feature-map-check.yml` CI 통과 전제.

## 커밋
- `4c52bbb feat(loyalty): M0-1105-CB · R2 settings + simulation gate + append-only audit`
- `processes: [commerce-core.loyalty-settings-r2]`

## 변경 파일 트리
```
apps/commerce-core/
├── medusa-config.ts                                                (modified · 1줄)
├── src/
│   ├── api/admin/pos/loyalty/settings/
│   │   ├── route.ts                                                (GET·POST)
│   │   ├── simulate/route.ts                                       (POST)
│   │   ├── pending/[id]/cancel/route.ts                            (POST)
│   │   └── audit/route.ts                                          (GET)
│   ├── jobs/loyalty-settings-apply.ts
│   ├── lib/loyalty/receipt-preview.ts                              (pure · R4~R6 공용)
│   └── modules/loyalty_settings/
│       ├── index.ts · service.ts
│       ├── models/{loyalty-settings,loyalty-audit,loyalty-simulation}.ts
│       ├── migrations/Migration20261115000001.ts
│       └── __tests__/{receipt-preview,service}.unit.spec.ts (+ snapshot)
docs/feature-map.yaml                                                (modified · loyalty-settings-r2 프로세스 추가)
```
