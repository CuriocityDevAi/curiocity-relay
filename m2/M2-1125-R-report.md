# M2-1125-R Report

**PASS**

브랜치: `feat/M2-1125-P-cd-image-islamic-readonly`  
커밋: `7769cf6`  
Push: `4f50c8c..7769cf6` → origin (성공)  
PR #440 코멘트: https://github.com/CuriocityDevAi/storeport/pull/440#issuecomment-7157382494

---

## 변경 요약 (R0-1125-AB 3건)

### 1. feature-map CI 블로커 해소
- `docs/feature-map.yaml` → `customer-display-settings.files` 에 `apps/commerce-core/playwright.cd-p.config.ts` 추가
- 로컬 feature-map-check: `unmatched: 0` ✓

### 2. preview route — 매장별 store_name
- `apps/commerce-core/src/api/admin/pos/customer-display/settings/preview/route.ts`
- `location_id` 있으면 `Modules.STOCK_LOCATION.listStockLocations({id})` 로 지점명 반환
- 없으면 `Modules.STORE.listStores({}).[0].name` (브랜드명, 기존 동작 유지)

### 3. _validate.ts URL 완화 제거
- `apps/commerce-core/src/api/admin/pos/customer-display/settings/_validate.ts`
- `store_image_file_id` 동반 시 URL 검사 bypass 분기 삭제 → 항상 `^https?:\/\/` 강제

### 4. 신규 단위 테스트 (8건)
- `...settings/preview/__tests__/route.unit.spec.ts` — 2매장 fixture 4건 (all PASS)
- `...settings/__tests__/validate.unit.spec.ts` — 비-http URL 거부 4건 (all PASS)

---

## 테스트 로그

```
PASS src/api/admin/pos/customer-display/settings/__tests__/validate.unit.spec.ts
  R0-1125-AB · validateSettingsPatch store_image_url
    ✓ file_id 있어도 비-http URL → invalid_data
    ✓ file_id 있고 https URL → 허용
    ✓ file_id 없이 비-http URL → invalid_data
    ✓ file_id 없이 http URL → 허용
Tests: 4 passed

PASS src/api/admin/pos/customer-display/settings/preview/__tests__/route.unit.spec.ts
  R0-1125-AB · preview route store_name
    ✓ location_id 없음 → STORE 브랜드명
    ✓ location_id=sloc_pim → 지점명 PIM
    ✓ location_id=sloc_ps → 지점명 PS
    ✓ location_id 미존재 → store_name: null
Tests: 4 passed
```

## feature-map-check 로그

```
node scripts/feature-map-check.mjs --json --diff apps/commerce-core/playwright.cd-p.config.ts
{
  "counts": { "scannedFiles": 1, "matched": 1, "unmatched": 0 },
  "unmatched": []
}
```

## typecheck

`apps/commerce-core pnpm typecheck` → 출력 없음 (에러 0) ✓

## naming-check

`bash scripts/naming-check.sh` → ✓ PASS ✓
