PASS

# M0-1124-I — POS 주문 custom_display_id 부여 fallback + receipt snapshot 포함

- 브랜치: `fix/M0-1124-I-order-number-assign` (origin/main 기준 분기)
- 커밋: `f5f0f04d12f191b342b4273928187ea80e3564ed`
- PR: https://github.com/CuriocityDevAi/storeport/pull/421
- 리포: storeport · 모델: Opus · 소요: ~35 분 (상한 45 분 내)

## 원인 =

POS fork 가 POST `/admin/draft-orders` 로 주문을 생성할 때 body 에 `metadata.stock_location_id` 를 보내지 않아, M0-1124-A 의 `generateCustomDisplayIdImpl` → `extractStockLocationId` (`apps/commerce-core/src/modules/order_number/lib/reserve.ts:25-43`) 가 `null` 을 반환 → 콜백이 `undefined` → Medusa core 가 `custom_display_id = NULL` 로 주문을 INSERT (`node_modules/.pnpm/@medusajs+order@2.17.2*/node_modules/@medusajs/order/dist/services/order-module-service.js:403`).

추가로 `buildSnapshot` 의 snapshot 출력에 `custom_display_id` 키가 아예 없어 (`apps/commerce-core/src/modules/receipt/service.ts:260`) 앱·프린터가 영수증 snapshot 만으로 긴 번호를 표시할 수 없었음.

### 분기 판정표 ([REQ] 1 응답)

| 질문 | 판정 | 근거 |
|---|---|---|
| POS draft-order 완료 경로에서 트리거 돎? | **돎** · 그러나 입력 매장 미해결 | `node_modules/.pnpm/@medusajs+medusa@2.17.2*/.../api/admin/draft-orders/route.js:81` → `createOrderWorkflow` → `createOrdersStep` → `orderModule.createOrders_` 내부에서 `generateCustomDisplayId_` 호출 (order-module-service.js:403). |
| 닉네임 매핑 키가 이 주문에서 찾아짐? | **안 찾아짐** | fork 는 metadata 에 stock_location_id 없이 draft 를 생성 · shipping_methods.data 도 비어 있어 둘 다 null. `reserve.ts:25-43` 가 1·2 fallback 로 종료. |
| 저장 위치 (코어 필드 vs metadata) 와 `fields=+custom_display_id` 매칭? | **매칭 OK (코어 필드)** | Medusa 2.17 core 가 `order.custom_display_id` 를 코어 컬럼으로 저장 (order-module-service.js:403). admin orders route 는 `defaultAdminOrderFields` 에 포함 (`.../api/admin/orders/query-config.js:13`). 조회 경로는 정상이고 **값이 아예 설정되지 않은 것**. |
| #415 가 운영 배포? | **배포 O** (코드 기준) | `docs/feature-map.yaml:241-249` live · `medusa-config.ts` 에 `@medusajs/medusa/order` 재등록 + `generateCustomDisplayId` 콜백 주입이 main 에 머지됨 (#415). Railway 실측은 금지 범위라 코드 기준으로만 확인. |

## 해법

### 매장 식별 fallback 체인 확장 (`reserve.ts`)

1 (metadata) → 2 (shipping) 가 비면 **3 (sales_channel_stock_location 단일 링크)** → **4 (order_number_store 단일 닉네임 · 1-store MVP = "브랜드 기본 닉네임" 역할)** 를 순차 시도. 결정적인 경우(링크/매장이 **정확히 1 개**) 에만 선택. 모호할 때는 undefined 를 그대로 반환 → custom_display_id null (주문은 계속).

### Receipt snapshot 에 긴 번호 포함

`buildSnapshot` input.order 에 `custom_display_id?: string | null` 추가. 출력 snapshot 에 **`order_custom_display_id`** 키 신설 (앱 바인딩 맞춤 · null-safe). 호출부 7 곳이 모두 order 쿼리에 `custom_display_id` 를 포함하고 snapshot 에 전달:

- `api/admin/pos/orders/[id]/tenders/route.ts` (결제 완료 · **Order #185 경로**)
- `api/admin/pos/orders/[id]/void/route.ts`
- `api/admin/pos/orders/[id]/refund/route.ts`
- `api/hooks/payment/xendit/route.ts` (QRIS webhook)
- `workflows/pos-fulfill/steps/fetch-order.ts` + `mint-sale-receipt.ts`
- `workflows/pos-refund/steps/mint-receipt.ts`
- `workflows/pos-return/steps/fetch-and-validate-order.ts` + `mint-receipt.ts`

### 결제 완료 → receipt mint 순서

Medusa 2.17 의 `custom_display_id` 는 **주문 생성 트랜잭션 내**에서 발급된다 (order-module-service.js:403). receipt mint 는 결제 tender 완료 후 발생하므로 (tenders/route.ts §5 `buildSnapshot` + `createReceiptForOrder` · line 1457~1510) **항상 custom_display_id 가 이미 확정된 뒤에** snapshot 에 삽입된다. 즉 "receipt mint 보다 먼저 custom_display_id 를 갖고 snapshot 에 넣는다" 요건이 구조적으로 충족.

### 매핑 없을 때의 동작 명시

- 1·2·3·4 fallback 전부 실패 (모호 포함) → `custom_display_id = null` 로 주문 생성 성공. 영수증 `order_custom_display_id = null` · 앱은 기존 `order_display_id` 로 fallback 표시.
- 닉네임 없음 (매장은 식별됐으나 nickname NULL) → `console.warn` + `undefined` 반환 → 동일한 null 결과.
- Admin Order Numbers 탭이 "nickname 없음" 상태를 사용자에게 안내 (M0-1124-A 라이브).

### 소급 부여 없음

이미 null 로 기록된 당일 주문 (Order #185 포함) 은 그대로. 주문번호는 발행 후 변경 금지 (spec).

## 앱 쪽 바인딩 (M3-1124-L 참고)

- 신규 snapshot 키: `snapshot.order_custom_display_id` (string | null).
- 앱·프린터 표시 우선순위: **`order_custom_display_id` → `order_display_id` fallback**.
- 영수증 상단 "주문 번호" 라벨에 PIM26B1000 그대로 노출. 미설정 시 "Order {order_display_id}" 로 fallback (현 M0-1119-S fork #250 동작 보존).

## 검증 로그

### typecheck (전수 pass)

```
$ pnpm --filter commerce-core typecheck
> commerce-core@0.0.1 typecheck
> tsc --noEmit
(no errors)
```

### unit tests (관련 4 suites · 32 tests)

```
$ pnpm --filter commerce-core test -- --testPathPattern='receipt-snapshot|resolve-stock-location|mint-sale-receipt-pb1|format.unit'
PASS src/modules/receipt/__tests__/receipt-snapshot.unit.spec.ts
PASS src/workflows/pos-fulfill/__tests__/mint-sale-receipt-pb1.unit.spec.ts
PASS src/modules/order_number/__tests__/format.unit.spec.ts
PASS src/modules/order_number/__tests__/resolve-stock-location.unit.spec.ts
Test Suites: 4 passed, 4 total
Tests:       32 passed, 32 total
```

### unit tests (전수 pass · 리그레션 없음)

```
$ pnpm --filter commerce-core test
Test Suites: 53 passed, 53 total
Tests:       600 passed, 600 total
Snapshots:   18 passed, 18 total
Time:        21.133 s
```

### lint

```
$ pnpm --filter commerce-core lint
✖ 104 problems (0 errors, 104 warnings)
```

- errors 0 · warnings 는 모두 "Unused eslint-disable directive" 로 기존 파일에 축적된 노이즈. 새로 추가/수정한 파일에서 warning 증가 0.

### feature-map-check

```
$ node scripts/feature-map-check.mjs --diff $(git diff --name-only HEAD~1 HEAD)
scanned: 14 files → matched=14 unmatched=0 (0.0%)
```

- `docs/feature-map.yaml` 의 `commerce-core.order-number` 프로세스에 신규 통합 테스트 파일 등재 (summary 에 M0-1124-I fallback 추가 기술).

### 통합 테스트 (Postgres 필요 · 로컬 미실행)

- `apps/commerce-core/integration-tests/pos/order-number-receipt.spec.ts` (3 case):
  - ①② metadata 비어도 fallback 로 custom_display_id 부여 + cash tender → `receipt.snapshot.order_custom_display_id` 가 발급 번호와 동일 · `order_display_id` 도 함께 보존.
  - ③ 이미 null 로 생성된 주문은 소급 부여 X.
- 미실행 상태 (로컬 Postgres 부재 · CI 빌링 보수 범위) — CI 레일웨이 자원 가용해지면 실측. 어설션은 파일에 그대로 동봉.

## 기술 선택지 & 권장안 (PR 본문 3 줄)

- fallback 체인에 "sales_channel 단일 링크" → "nickname 설정 매장 1개" 2 단계를 추가. 결정적일 때만 매장을 선택해 모호한 다중 매장 환경에서 잘못된 닉네임을 쓰지 않도록 함.
- snapshot 키 이름은 `order_custom_display_id` (기존 `order_display_id` 대칭 · 앱 바인딩 맞춤). 미설정 (null) 시 renderer 가 `order_display_id` 로 fallback.
- 이미 custom_display_id=null 로 발행된 주문은 소급 부여하지 않음 (주문번호 발행 후 변경 금지 · spec).

## 어설션 파일 동봉

- `apps/commerce-core/src/modules/order_number/__tests__/resolve-stock-location.unit.spec.ts` — fallback 체인 7 case (metadata · shipping · sales_channel 단일 · sales_channel 다중 → 매장 1개 → ambiguous → null).
- `apps/commerce-core/src/modules/receipt/__tests__/receipt-snapshot.unit.spec.ts` — `order_custom_display_id` 포함/미포함 2 case.
- `apps/commerce-core/src/workflows/pos-fulfill/__tests__/mint-sale-receipt-pb1.unit.spec.ts` — buildSnapshot 에 custom_display_id 전달/미전달 2 case.
- `apps/commerce-core/integration-tests/pos/order-number-receipt.spec.ts` — 통합 3 case (fallback 발급 → tender → snapshot 포함 / 소급 X).

## 금지사항 준수

- 운영 DB · Railway 접근 X.
- `~/projects/curiocity-relay` 수정 X.
- /loop · 예약 깨우기 X.
- PR 자기 머지 X.
- `admin/routes/pos-settings/*` · `modules/pos_settings/*` (PR #420 리뷰 중) 건드리지 않음.
