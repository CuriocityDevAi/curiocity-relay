PR #344 · fulfill route 890줄→276줄 · step 4 · 남은 범위 3

## 지시 ↔ 실행
- 지시: shared-commerce-audit §4 W4 좁힘 재발부 — 출고 핵심 workflow 추출 1단계.
- 실행: M0-1117-M 워크트리 진행분 재사용 → origin/main 위 `refactor/M0-1117-N-fulfill-workflow` 신설 → 커밋 → 25분 이내 중간 push + draft PR 열기 → ready for review 전환.
- 결과: PR #344 (OPEN · ready) · 1 commit (`084cfc5`).

## 범위
- 수정: `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` 890 → 276줄 (얇은 POS 어댑터).
- 신규: `apps/commerce-core/src/workflows/pos-fulfill/**`
  - `index.ts` · `types.ts` · `utils.ts` · `workflow.ts`
  - `steps/fetch-order.ts` · `steps/execute-fulfillment.ts` · `steps/update-metadata.ts` · `steps/complete-order.ts` (4 step)
  - `__tests__/channel-neutral.unit.spec.ts` (5 case · pass)
- 갱신: `docs/feature-map.yaml` pos-tenders-fulfill files 에 `workflows/pos-fulfill/**` 추가.

## 동작 불변 검증
- POS unit tests: **453 pass / 0 fail / 0 skip** (`pnpm --filter commerce-core test`)
  - 포함: 신규 `pos-fulfill/__tests__/channel-neutral` 5건 (fetch-order handler · stageFromOrderType · isInventoryLinkError · PosFulfillWorkflowInput 타입).
- naming-check: **PASS** (meros 0 · Medusa 모듈명 정합 · 라우트 폴더 정합 · 마이그레이션 중복 없음).
- 타입 에러: **신규 0** · fulfill route·pos-fulfill 범위 clean (admin widget React 19 타입 경고는 origin/main 기존).
- Kyu 실기: 미실행 — 라우트 응답 shape 보존 (`ok · order_id · order_type · stage · method · fulfillment_id · fulfilled · inventory_decremented · reservations_released · completed · inventory_warning? · fulfillment_warning?` + hand_over 재누름 가드 시 `already_fulfilled: true`).

## 남은 W4 범위 (다음 라운드)
1. **영수증 mint** — handed_over 트리거 기반 영수증 발행 로직. 현 `route` 가 workflow 응답을 토대로 외부에서 처리하지 않지만, R-/pos-receipt 연계로 분리 필요.
2. **픽업 인계 세부 metadata (`handed_over_at` 타임스탬프)** — 현 `updateMetadataStep` 이 핸드오버 bundle (method·courier 등) 을 `metadata.fulfillment` 에 저장하나, "실 성공 시에만 `handed_over_at`" 미세 분기는 `complete-order` 결과에 묶어 workflow 2차 라운드에서 분리.
3. **교대 체크 (register_session)** — 현 라우트/워크플로 둘 다 없음. Wing/CareAgent 도입 시 POS-only 가드로 호출자 분리 필요.

## 한계·주의
- 통합 테스트 (`integration-tests/pos/**` · Postgres 필요) 는 로컬 미실행. CI 또는 사용자 실기로 확증 필요.
- 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1117-M-wt` 에서 수행 (브랜치만 N 으로 전환 · 기존 M 브랜치 로컬 삭제됨).
