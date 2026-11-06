---
round: M0-1105-E
pr:
  storeport: storeport#188
base_pr: storeport#185
outcome: pos-settings-wiring-9of9 · tenders Math.round→Math.floor 일관성 · receipt_header CRLF→LF 정규화 · 통합 9/9 PASS · 라우트·receipt service 는 기 구현 확인 · tsconfig 선행 결함 해소
kyu_checks: 1 (settings-dp30-and-tax-off-and-header-3lines-end-to-end · integration 3 scenarios PASS)
---

# M0-1105-E · POS Settings → 결제·영수증 wiring

**일자**: 2026-11-06 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` + `src/modules/receipt/service.ts` + 통합/유닛 테스트 + `tsconfig.json`.

**base**: storeport PR #185 (`fix/m0-1105-c-pos-findings`) 위에 쌓음. 평행: #187 (D · Admin UI · admin/** 만).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | tenders · body.dp 없으면 settings.dp_percent (기본 100) 사용 · body 우선 | ✓ (기 구현 · #7 로 증명) |
| 2 | tenders · Math.floor 일관성 (amount == metadata.deposit_amount) | ✓ (수정) |
| 3 | receipt · show_tax_label=false 면 tax 줄 생략 | ✓ (기 구현 · #8 로 증명) |
| 4 | receipt · receipt_header 3줄 영수증 상단 삽입 + CRLF 정규화 | ✓ (정규화 추가 · #9 로 증명) |
| 5 | GET /admin/pos/receipts/:id 응답에 반영 확인 | ✓ (#8·#9 GET 어설션) |
| 6 | 통합 9/9 (기존 6 + 신규 3) | ✓ |
| 7 | Unit 23/23 (기존 20 + 신규 3) | ✓ |
| 8 | 산출물 기동 BOOT OK + /health 200 | ✓ |
| 9 | 금지 (src/admin/** · medusa-config) 변경 0 | ✓ |
| 10 | 선행 TS2304 빌드 결함 해소 | ✓ (tsconfig exclude) |

---

## 1. 실측 요약 ↔ 설정→동작

M0-1105-D §6 "서버 라우트가 settings 미참조" 지적은 **부분적 오진**. 실측 결과:

### tenders 라우트 (`route.ts`)
- line 152-158: `posSettingsSvc.getOrCreateStoreSettings()` 로 설정 로드 완료.
- line 158: `const dp_percent = Number(settings.dp_percent ?? 100)`.
- line 164-177: `body.amount` 우선 → fallback 으로 `preorder` 시 `dp_percent` 로 산출.
- line 425-434: receipt snapshot 에 `posSettings` 넘김 (show_tax_label · receipt_header 포함).

### receipt service (`service.ts`)
- line 151-159: `taxShow = show_tax_label && tax_label` → false 면 `{ show: false }` 반환.
- line 163: `header: p.receipt_header ?? ""` → snapshot 에 삽입.

### 보강 2점 (M0-1105-E 에서 추가)
- **Math.floor 일관성**: line 174 를 `Math.round` 에서 `Math.floor` 로. 뿌리는 M0-1105-C FIX #4 에서 metadata (line 198) 만 바꾸고 amount (line 174) 는 Math.round 유지한 불일치. (999 × 50% 기준 round=500, floor=499). `amount == metadata.deposit_amount` 불변 조건 재확립.
- **header 정규화**: Admin textarea 는 OS 별 CRLF/LF 혼재 가능. `buildSnapshot` 에서 `\r\n?→\n` + `^\n+|\n+$` 트림 → 영수증 상단 빈 줄 방지 + 플랫폼 일관성.

---

## 2. 설정 → 동작 연결 표

| 설정 (Admin UI) | 기본값 | 서버 동작 (로직 지점) |
|---|---|---|
| `dp_percent` | **100** | `tenders/route.ts:173-184` · `body.amount` 미제공 + preorder → `Math.floor(total × dp% / 100)`. `body.amount` 있으면 그것 우선. |
| `show_tax_label` | **false** | `receipt/service.ts:151-159` · false 면 `snapshot.tax = { show: false }` → 영수증 renderer 가 tax 줄 skip. |
| `receipt_header` | `""` | `receipt/service.ts:163` (normalizedHeader) · snapshot.header 로 영수증 상단 삽입 · CRLF→LF 정규화 + 트림. |

---

## 3. 테스트

### Integration (9/9 PASS · medusa-test-utils · 실 Postgres)
```
PASS integration-tests/pos/tenders.spec.ts (20.436 s)
  ✓ #1 cash tender captures a payment_collection
  ✓ #2 edc tender missing approval_code returns 400 (English)
  ✓ #3 preorder with dp_percent=50 computes amount = total * 50/100
  ✓ #4 takeaway fulfill decrements inventory stocked_quantity
  ✓ #5 preorder fulfill transitions stage without inventory decrement
  ✓ #6 two tenders on one order create two payment_collections + aggregate
  ✓ #7 [M0-1105-E] settings dp_percent=30 + body.amount 없음 → amount = 30%
  ✓ #8 [M0-1105-E] settings show_tax_label=false → GET snapshot.tax={show:false}
  ✓ #9 [M0-1105-E] settings receipt_header 3줄 → GET snapshot.header 3줄 + CRLF→LF
Tests: 9 passed, 9 total
```

### Unit (23/23 PASS)
- `receipt-snapshot.unit.spec.ts` (6 · 신규 3): show_tax_label=false 우선권 + header 정규화 + 빈 header.
- `preorder-dp-math.unit.spec.ts` (9): M0-1105-C 에서 Math.floor edge case 3건 포함.
- `cash-provider.unit.spec.ts` (3).
- `edc-manual-provider.unit.spec.ts` (5).

---

## 4. 검증

| 상시 체크 | 결과 |
|---|---|
| ⓐ Build (`pnpm --filter commerce-core build`) | Backend **5.38s** · Frontend **26.63s** · **PASS** (선행 TS2304 해소 포함) |
| ⓒ 산출물 기동 (dist · `medusa start`) | `BOOT OK unknown :9994` + `Server is ready on port: 9994 – 2418ms` + `curl /health 200` |
| 통합 테스트 | **9/9 PASS** |
| Unit 테스트 | **23/23 PASS** |
| 금지 영역 (`src/admin/**` · `medusa-config.ts`) | 변경 **0** |

---

## 5. 선행 결함 해소 (tsconfig)

base 브랜치의 TS build 가 테스트 파일에서 `TS2304: Cannot find name 'expect'` 로 실패. 이전 "Backend build PASS" 보고는 warn/error 혼동이거나 캐시 효과로 판단. **뿌리**: `tsconfig.json` 의 `"include": ["**/*"]` 가 테스트 파일까지 포함하는데 compilerOptions 에 jest 타입 없음. **해소**: build output 과 분리된 테스트 파일을 `exclude` 로 명시:
```json
"**/__tests__/**",
"**/*.unit.spec.ts",
"**/*.integration.spec.ts",
"integration-tests/**"
```
테스트는 `TEST_TYPE=unit NODE_OPTIONS=--experimental-vm-modules jest` 로 돌아가므로 영향 없음.

---

## 6. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/188
- **브랜치**: `feat/m0-1105-e-settings-wiring` (base = `fix/m0-1105-c-pos-findings` #185)
- **커밋**: `36bbf20` — `feat(pos): POS Settings → 결제·영수증 wiring (M0-1105-E)`

---

## 7. 다음 후보

- **M0-1105-F** · Admin "Receipt configuration" sub-page (tax label 텍스트 PBJT/PPN 선택 + receipt_footer + receipt_logo_mode 토글) — Kyu 결정 대기.
- `#185 · #187 · #188` 머지 순서: 
  1. #185 (C · 통합 테스트 infra · tenders fixes 뿌리)
  2. #187 (D · Admin UI)
  3. #188 (E · wiring · 선행 2건 후 자동 rebase 가능)
- 세금 기능 완성: tax_rate_pct Admin 설정 UI 추가 (현재 settings 모델에 필드만 있고 UI 없음).
