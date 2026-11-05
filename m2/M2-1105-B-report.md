---
round: M2-1105-B
pr:
  fork: agilo-medusa-pos-fork#24
commit: 47afa2b1ebd58ff6216ffbd9103d2b236d7dcd37
outcome: M2-1105-A 뿌리 3-A 1 라인 fix · 어설션 2 신설 (15/15) · Playwright 2 신설 (5/5) · 머지 가능
kyu_checks: 4 (그리드 N left · Cheese Bread 흐림+품절 배지 · 정상 상품 담김 · 경계 서비스 상품)
---

# M2-1105-B · 재고 2차 조회 fields '+' 접두사 1자 fix

**일자**: 2026-11-05 · **허브**: M2 (임시 owner — `api/hooks/products.ts` 주인 없음 · 1 라인) · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `master = 0515209`

## 1. 뿌리 (M2-1105-A §0 재확인)

`api/hooks/products.ts:35` — `fields: 'id,inventory_quantity'` 에 **`+` 접두사 1 자 누락**. Medusa 가 default fields 치환 → `manage_inventory` 가 재조회 variant 에서 빠짐 → `wrapVariants` 가 `if (!variant.manage_inventory) continue` 로 전 variant skip → `inventory_quantity` undefined → `computeInventoryStatus` 전 상품 `unknown` → 배지 숨김 + 탭 허용.

**같은 파일 line 19 주석은 올바르게 `+inventory_quantity` 로 서술** — 의도/구현 drift 1 자.

## 2. Fix

```diff
--- a/api/hooks/products.ts
+++ b/api/hooks/products.ts
@@ -33,7 +33,9 @@ const enrichProductsWithInventory = async (
     const variantsResponse = await sdk.admin.productVariant.list({
       id: managedVariantIds,
-      fields: 'id,inventory_quantity',
+      // M2-1105-B · '+' 접두사 — default fields(manage_inventory 포함) 유지한 채 inventory_quantity 추가.
+      // 접두사 없이 보내면 Medusa 가 default 를 치환 → wrap 이 variant.manage_inventory 를 못 읽고 skip → 전 상품 unknown.
+      fields: '+inventory_quantity',
       limit: managedVariantIds.length,
     } as any);
```

1 라인 change + 2 라인 why 주석.

## 3. 회귀 가드 (2 레벨)

### 3-A. source assertion (`scripts/m0-1103-a-assertions.mjs`) — 2 건 추가

```
--- M2-1103-A · 재고 배지 fail-open 어설션 ---  (기존 13 건 통과)

--- M2-1105-B · 뿌리 fix 회귀 가드 ---  (신규)
  ✓ (M2-1105-B ①) fields literal starts with '+' → "+inventory_quantity"
  ✓ (M2-1105-B ②) 2차 조회 응답 { inventory_quantity: 0 } → { kind: 'sold-out', total: 0 }

15/15 passed · 0 failed
```

- ① `api/hooks/products.ts` 소스에서 fields 리터럴을 regex 매치 · `+` 로 시작 여부 체크. 1 자 drift 재발 즉시 감지.
- ② round-trip: 2차 조회 응답 shape 를 mock → `computeInventoryStatus` 가 sold-out 판정. 지침 §요청 ② 의 정확한 wording 대응.

### 3-B. bundle-level Playwright (`scripts/m2-1105-b-inventory-playwright.mjs`) — 신규

```
--- 상시 ⓐ Expo web 부팅 smoke ---  (3/3)
  ✓ pageerror 0건 · 로그인 DOM 도달 · console.error 0건

--- (A1) 2차 조회 fields 리터럴 "+inventory_quantity" 번들 포함 ---  (2/2)
  ✓ (A1a) web bundle 에 "+inventory_quantity" 리터럴 존재 (__common-*.js)
  ✓ (A1b) 옛 "id,inventory_quantity" 리터럴 사라짐 (회귀 가드)

5/5 passed · 0 failed
```

- Metro 가 리터럴을 보존하므로 **번들에 실제로 들어갔는지** 확인 가능 (compile-time ↔ runtime 중간 지대).
- A1a 가 공통 청크 (`__common-*.js`) 에서 찾음 — api/hooks/products.ts 가 여러 화면에서 공유되어 chunk-split 됨 (스크립트는 `dist/_expo/static/js/web/*.js` 전부 스캔).

## 4. A2/A3/B1/B2 가 이 PR 에서 빠진 이유

**웹 flow 에서 실행 불가** · `expo-secure-store` web polyfill 이 비어 있음 (`contexts/auth.tsx:9` 주석 · `ExpoSecureStore.web.js = export default {}`). 결과 체인:

1. 로그인 성공 → `safeSetSecureItem` noop → apiKey 미저장 (React state 에는 있음)
2. settings query → `safeGetSecureItem` 전부 null → `settings.data = null`
3. `isSetupComplete === false` → `setup-wizard` 가드
4. setup-wizard 가 updateSettings 돌려도 SecureStore write noop → 영구 null → `/(tabs)/products` 못 감

Kyu iPad native 흐름에서는 SecureStore 가 정상 작동 → 그리드 렌더 → A2/A3/B1/B2 어설션 적용 가능 (Kyu 실측 4건으로 커버).

**M3 e2e 하네스 라운드** 에서 auth-mock + 그리드 렌더 테스트를 묶어 처리 권장 (M2 owner 밖).

## 5. 변경 파일 (허용 범위 100%)

| 파일 | 변경 | 라인 |
|------|------|------|
| `api/hooks/products.ts` | 1 라인 (+ 주석 2) | 3 |
| `scripts/m0-1103-a-assertions.mjs` | 어설션 2 건 추가 | 48 |
| `scripts/m2-1105-b-inventory-playwright.mjs` | 신규 | 137 |

`app/**` · `components/**` · 기타 M1/M3 파일 미수정 (#22 M3-1105-A 와 충돌 X).

## 6. 자동 검증

- **tsc**: 기존 CSS side-effect import 1 건만 (범위 밖)
- **clean-clone `npm ci --legacy-peer-deps`**: exit 0
- **assertions**: 15/15 PASS
- **Playwright**: 5/5 PASS

## 7. Kyu 실기 체크 4 건 (iPad · Soopsok Store Jakarta · api.meros.id)

- [ ] **그리드 "N left" 숫자 배지** 재등장 (초록 6+ · 앰버 1~5)
- [ ] **Cheese Bread 흐림 + "품절" 배지** · 탭 → "품절" 토스트 · 상세 안 열림
- [ ] 재고 많은 상품 탭 → 상세 정상 · Add to cart 동작
- [ ] (경계) manage_inventory=false 서비스 상품 배지 없음 · 탭 허용

**상세 Add to cart 재고 가드 (M2-1105-A §3-B)** 는 **M3 몫** — 상세 화면 소유권.

## 8. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/24
- 브랜치: `fix/m2-1105-b-inventory-fields` · 머지 대상: `master` (`0515209`)
- 커밋: `47afa2b`
- 선행: M2-1105-A 진단 리포트 (`m2/M2-1105-A-report.md`)
