# PASS (dev-실기 유보)

M0-1124-G — POS Settings 에 매장 선택 드롭다운 추가, Store address · PB1 스위치
2 항목만 location override, 그 외 Brand 설정은 read-only. Order Numbers 탭 매장
행 강조. `/admin/pos/orders-list?q=` 가 `custom_display_id` 매칭도 포함. 환불/
반품 영수증 mint-receipt 에 `store.address` pass-through.

- **리포**: `CuriocityDevAi/storeport`
- **브랜치**: `feat/M0-1124-G-pos-settings-location-picker`
- **베이스**: `main` (분기점 = `feat/M0-1124-E-pos-settings-location` #418 head · 이후 `origin/main` 병합해 #417 탭 흡수)
- **PR**: https://github.com/CuriocityDevAi/storeport/pull/420
- **PR 베이스**: `main`
- **커밋**: `130f8fa feat(commerce-core): M0-1124-G — POS Settings 매장 선택 + custom_display_id 검색 + refund/return 영수증 주소`
- **푸시 완료 시각 (UTC)**: 2026-11-24 07:49 전후 (러너 로컬 시계 기준)
- **워크트리**: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1124-G-wt`
- **머지 순서**: #418 (API override) → 이 PR. #417(탭 구조)·#418 이 main 에 들어가면 이 PR diff 는 UI/검색 변경만 남아 자동 정리.

## 변경 범위 (7 files, +624 / −196)

| 파일 | 변화 |
| --- | --- |
| `apps/commerce-core/src/admin/lib/pos-settings-api.ts` | `fetchPosSettings` / `updatePosSettings` 에 `locationId?: string \| null` 옵션. `PosSettings` 에 `store_address?: string \| null` 추가. 응답 타입에 `location_id`. 서버 whitelist `{store_address, pb1_pct}` 기반. |
| `apps/commerce-core/src/admin/routes/pos-settings/page.tsx` | 맨 위 Store `<select>` (옵션: "Brand (all stores)" + `GET /admin/stock-locations?limit=100` 응답). Brand 뱃지 ↔ Per-store override 뱃지 전환. Brand 모드는 기존 동작 100% 보존 (+ Store address 편집). Location 모드는 Store address Textarea + PB1 Switch 2 항목만 편집, 다른 필드 (receipt_header · logo_url · show_tax_label · service_charge_pct · dp_percent) 는 Textarea/Input `disabled readOnly` + "Brand setting — same for all stores" 힌트. Payments 탭은 Location 모드에서 Brand 안내로 교체. Save 버튼 가시성/활성 조건이 모드별로 분리. PB1 스위치 옆 안내: "Takes effect after the POS app update (store-aware · M3) is deployed." |
| `apps/commerce-core/src/admin/routes/pos-settings/sections/OrderNumbersSection.tsx` | `highlightedLocationId?: string \| null` prop. 매칭되는 매장 행에 `bg-ui-bg-highlight ring-1 ring-ui-border-interactive` 적용 (색 하드코딩 0). `data-highlighted` 속성 노출. |
| `apps/commerce-core/src/api/admin/pos/orders-list/route.ts` | `q` 검색이 `custom_display_id` contains 매칭을 **OR 결합** (대소문자 무관). phone 정규화/숫자 분기 둘 다 이 매칭을 포함. |
| `apps/commerce-core/src/api/admin/pos/orders-list/__tests__/route.unit.spec.ts` | 신규 describe 블록 5건: 정확 매칭 · 대소문자 무관 · 부분 매칭 · 미매칭 · null custom_display_id skip. |
| `apps/commerce-core/src/workflows/pos-refund/steps/mint-receipt.ts` | `store.address = settings.store_address ?? ""` pass-through. |
| `apps/commerce-core/src/workflows/pos-return/steps/mint-receipt.ts` | 동일. |

- 신규 파일 0. `docs/feature-map.yaml` 수정 불필요 (기존 패턴에 모두 커버).

## 검증 (hub-m0 세션에서 실측)

- `pnpm --filter commerce-core typecheck` → **PASS** · 오류 0.
- `pnpm --filter commerce-core test` → **52 suites · 593 tests · 모두 PASS** · 신규 `custom_display_id` 5건 포함.
- `pnpm --filter commerce-core lint` → **0 errors · 9 warnings** (모두 `Unused eslint-disable directive` · 변경 파일 무관 · 기존).
- `node scripts/feature-map-check.mjs origin/main HEAD` → **1267 files scanned · matched=1267 · unmatched=0**.
- `bash scripts/naming-check.sh` (pre-commit) → **PASS** (`meros` 매치 0 · Medusa 모듈 규격 · [...x] 라우트 없음 · 동명 migration 없음).

## 결정 (ticket 수용)

1. Store 선택 UI = `<select>` + Tailwind `border-ui-border-base / bg-ui-bg-field / focus:ring-ui-border-interactive` 토큰 (precedent: `apps/commerce-core/src/admin/routes/stock-cleanup/page.tsx` 와 동형). `@medusajs/ui` Select 미사용 — admin dashboard 패턴 정합 우선.
2. PB1 "적용 여부" 의미해석 = Switch. On = location `pb1_pct` = brand `pb1_pct` (merged view 로부터 Current Brand 값 읽어 저장). Off = 0 (receipt 렌더가 PB1 줄 skip · 서버 M0-1124-E 로직 재사용).
3. Order Numbers 선택-매장 강조 = row 전체 wrapper `bg-ui-bg-highlight ring-ui-border-interactive`. OrderNumbersSection 내 highlight row 는 자기 자신 index/key 비교 (brand 모드 null 일 때 모든 행 평범).
4. Pre-order DP% 는 location override 범위 밖. Location 모드에서 Pre-order 탭 Save 비활성 + "Brand setting" 힌트. Payments 탭도 동일 (Brand 모드 전환 안내).

## Kyu 실기 (hub-m0 세션에서 **미실행 · 미검증**)

사유: hub-m0 러너에 postgres/redis + admin build 구동 포트 slot 미할당 (`scripts/port-map.txt` 에 등록 없음). 실기는 사용자 QC 슬롯 (3000/3002 · storeport-main) 에서 수행 필요.

PR 본문 테스트 체크리스트 (미완료):

- [ ] POS Settings 열기 → Store 드롭다운에 "Brand (all stores)" + stock location 목록 노출 확인.
- [ ] 매장 선택: Brand 뱃지가 Per-store override 뱃지로 전환 · General 탭의 Receipt header / Logo URL / Customer Display 섹션 disabled + Brand 힌트.
- [ ] General 탭 Store address 입력 → Save → 새로고침 후 값 유지 (`GET /admin/pos/settings?location_id=<id>` merged view 반영).
- [ ] Tax 탭 PB1 스위치 Off → Save → Brand 로 돌려서 Brand `pb1_pct` 값은 그대로인지 확인.
- [ ] Order numbers 탭 → 선택한 매장 행만 하이라이트 확인.
- [ ] Orders 리스트에서 긴 번호 (예: `PIM26B1000` 등 nickname 기반) 로 검색 시 해당 주문 매칭.

## 안전 체크

- 운영 DB · prod SSH · railway CLI 미접근.
- curiocity-relay 어떤 브랜치도 변경/push 하지 않음.
- 리포는 `$REPORT_PATH` = `/Users/kyu.lee/.hub-runner/reports/m0/M0-1124-G/report.md` 에만 기록. git 리포 안 (`storeport`, `curiocity-relay`) 어디에도 기록 없음.
