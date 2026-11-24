PASS · POS 다중 매장 R1 서버 · PR #418 · 2026-11-24

# M0-1124-E 리포트

- **지시**: `queue/m0/M0-1124-E.md`
- **원장**: `ledger/decision-multi-store-20261124.md` (Kyu 11-24 15:52·15:57·16:07)
- **진단**: `m2/M2-1124-O-report.md`
- **PR**: https://github.com/CuriocityDevAi/storeport/pull/418
- **브랜치**: `feat/M0-1124-E-pos-settings-location` (base `main@1fee00f`)
- **커밋**: `efd6325` (feat/M0-1124-E-pos-settings-location → origin)
- **워크트리**: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1124-E-wt`

## 요약

Kyu 결정 = 매장별로 다른 값은 **주소 + PB1 적용 여부 두 개뿐**. 나머지 (Xendit·SC·로고·DP%·로열티) 는 브랜드(store scope) 공통 유지. 코드 접근 = 기존 `pos_settings` location scope 경로 (`getForLocation` · `patchLocationSettings`) 를 API 로 노출하고, 매장 override whitelist 를 `store_address`·`pb1_pct` **두 개만** 으로 제한.

## 변경 범위 (서버만 · 지시대로)

| 파일 | 변경 | 라인 |
|------|------|------|
| `apps/commerce-core/src/api/admin/pos/settings/route.ts` | `?location_id=` 지원 (GET/PUT) · 매장 override whitelist (store_address·pb1_pct) · 하위 호환 | +87 / −27 |
| `apps/commerce-core/src/modules/pos_settings/service.ts` | `DEFAULT_POS_SETTINGS.store_address` 신설 (기본 "") | +3 |
| `apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts` | `snapshot.store.address` pass-through | +7 / −1 |
| `apps/commerce-core/src/api/admin/pos/orders-list/route.ts` | `?stock_location_id=` 필터 | +24 |
| `apps/commerce-core/src/scripts/setup-multi-store.ts` | **신규** · PIM rename + PS 생성 + SC link + inventory levels + location 주소 저장 · dry-run 기본, `--apply` 로 실행 | +236 |
| `__tests__/*.unit.spec.ts` | 신규 4건 (settings route · orders-list · mint-sale-receipt PB1 · setup-multi-store arg parser) | +511 |

**금지 지역 미건드림** (지시 §BUILD):
- `src/admin/**` = 0 수정 (PR #417 리뷰 중).
- migration 신규 0 (기존 `pos_settings.settings` jsonb 안에 `store_address` 키만 추가).
- `~/projects/curiocity-relay` 브랜치·커밋 이번 PR 바깥 (status 꼬임 X).

## 테스트 로컬 실행 로그

```
$ pnpm -C apps/commerce-core typecheck
> commerce-core@0.0.1 typecheck
> tsc --noEmit
(에러 0)

$ pnpm -C apps/commerce-core test
Test Suites: 52 passed, 52 total
Tests:       588 passed, 588 total
Snapshots:   18 passed, 18 total
Time:        21.553 s
```

**신규 테스트 (4건 · 모두 PASS)**:
- `src/api/admin/pos/settings/__tests__/route.unit.spec.ts` — location override fallback · 매장 전용 whitelist · 금지 키 400 · store_address 길이 검증 · pb1_pct 범위 검증.
- `src/api/admin/pos/orders-list/__tests__/route.unit.spec.ts` — stock_location_id 필터 (혼재 / PIM / PS / 매칭 없음 · 레거시 drop).
- `src/workflows/pos-fulfill/__tests__/mint-sale-receipt-pb1.unit.spec.ts` — PB1 미적용 매장 snapshot `pb1_pct=null` · PB1 적용 매장 snapshot `pb1_pct=10` · store_address pass-through.
- `src/scripts/__tests__/setup-multi-store.unit.spec.ts` — defaults · `--apply` · 전체 override · 알 수 없는 플래그 무시.

```
$ pnpm -C apps/commerce-core lint
✖ 9 problems (0 errors, 9 warnings)  (기존 unused eslint-disable · 신규 0)

$ bash scripts/naming-check.sh
✓ naming-check PASS (meros 매치 = 0 · 모듈명·라우트·마이그레이션 규격 정합)
```

**미실행**:
- 통합 테스트 (`pnpm test:integration:pos`) = 실 DB 가 필요한 테스트 → 로컬 실행 생략. unit 테스트 범위에서 라우트·workflow·필터·script arg 검증 완료.
- 실제 Admin/POS dev 서버 띄워서 매장 생성 · 영수증 발행 실기 = Kyu 실기 항목 (아래).

## Kyu 실기 체크리스트

1. Admin API `GET /admin/pos/settings?location_id=<sloc>` 가 매장별 주소·PB1 값 반환.
2. `PUT /admin/pos/settings?location_id=<PS> { "pb1_pct": 0 }` 저장 성공.
3. PS 매장 결제 완료 → **영수증에 PB1 라인 없음** 확인.
4. `GET /admin/pos/orders-list?stock_location_id=<PIM>` → PIM 주문만.
5. `setup-multi-store.ts` dry-run 로그 리뷰 → `--apply` 로 운영 반영.

## 기술 선택지 (PR 본문 3줄 로그)

1. 매장별 "PB1 on/off" = 별도 플래그 X, `pb1_pct` 값 (0/10) 으로 표현 — 기존 renderer 로직 재활용 · migration 불필요.
2. `store_address` = jsonb 안 신규 키로 저장 (전용 컬럼 승격 X) — `getForLocation` merge 가 그대로 override 처리.
3. 매장 필터 = route 레벨 in-memory filter — `query.graph` JSON metadata 필터 안정성 미확인, 소량 (수백~수천) 안전. 성능 이슈 시 metadata.stock_location_id 전용 컬럼 승격은 Phase Next.

## 범위 밖 (다음 라운드)

- Admin UI 매장 선택 드롭다운 = PR #417 리뷰 완료 후 별도 라운드.
- POS 앱 `?location_id=` 호출 전환 = M3 라운드.
- `pos-refund/mint-receipt.ts` · `pos-return/mint-receipt.ts` 의 `store.address` pass-through = 후속 PR (PB1 미적용 매장은 이미 자동 동작).
- Xendit·로열티·admin 계정 매장별 = Phase Next (Kyu 결정).
