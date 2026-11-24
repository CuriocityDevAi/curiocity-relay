REHEARSAL PARTIAL

작성자: Claude (M2-1124-T · Opus · 모델 자가 실기 리허설)
날짜: 2026-11-24 WIB
리포 접촉 범위: storeport (read-only) · agilo-medusa-pos-fork (read-only)
운영 접촉: ⛔ 없음 (Railway · 운영 DB · SSH · admin.meros.id 쓰기 0)
로컬 Medusa 백엔드: 구동 중 아님 (Postgres 만 가동) → S1/S4 전체 E2E 는 코드 + CI + 단위테스트로 간접 검증

## 시나리오 판정표

| 시나리오 | 판정 | 실제로 본 화면 한 줄 | 스샷 경로 |
|---|---|---|---|
| S1 주문번호 PIM26B | PARTIAL · 코드/CI 검증 · 로컬 E2E 미실행 | PR #421 본문 integration-test (order-number-receipt.spec) 가 CI heavy-mac 14m29s GREEN — 로컬 Medusa 백엔드 미기동이라 눈으로 본 PIM26B 번호는 없음 | 해당 없음 (로컬 render 없음) |
| S2 Admin 영수증 탭 | PASS · Playwright 스모크 3/3 로컬 PASS | 탭 5개 "General · Tax · Payments · Pre-order · Receipt" 노출 · Receipt 활성 강조 · Advanced 접힘 · General 매장 선택 시 Store nickname 편집기 보임 | screens/S2-receipt-tab-*.png · screens/S2-general-nickname-editor.png |
| S3 Checkout B안 | PARTIAL · 코드 가드 OK · PR CI 1건 assertion FAIL (legacy testID 어설션) | 소스에 testID checkout-pay-{cash,card,qris} · "Pay in parts" 링크 · "Checkout" 타이틀 · tender-cash "Cash payment" · Cart X "h-11 w-11 rounded-full" 전부 존재 — 로컬 Expo web 빌드는 미수행 (dist/ 없음) | screens/M3-1124-O-01~05.png (PR committed · CI 생성) |
| S4 PS 매장 스크립트 | PARTIAL · 코드 가드 + parseArgs 단위 4/4 PASS · 로컬 dry-run 미실행 | setup-multi-store.ts 가 dry-run 기본, logger 가 "mode=DRY-RUN" + 각 단계 PIM/PS/채널/inventory/주소를 명확히 출력하도록 구성됨 — 그러나 매장 2개 이상 DB 에서는 `existing[0]` 가 Soopsok 가 아닐 위험 상존 (아래 §위험 참고) | 해당 없음 (로컬 render 없음) |

## 세부 실기 로그

### S1 · 주문번호 PIM26B (storeport PR #421 OPEN + fork #252·#253 MERGED)

- **PR #421 CI** (`gh pr checks 421`): heavy-mac PASS 14m29s · check PASS · route PASS · markers-and-forbidden PASS · changes-filter PASS · heavy-cloud skipped. 즉 통합 테스트(`order-number-receipt.spec.ts`)는 CI Postgres에서 통과.
- **PR #421 의 integration-test** (`/private/tmp/M2-1124-U-pr421/apps/commerce-core/integration-tests/pos/order-number-receipt.spec.ts`) 가 커버하는 케이스:
  - ①② metadata.stock_location_id 있는 주문 → custom_display_id 자동 발급 + snapshot 에 order_custom_display_id = 발급 번호
  - ④ metadata 없이 생성 → fallback 1·2·3 전부 실패 → null (M0-1124-K 거동 · fallback 4 제거됨)
- **buildSnapshot** (service.ts 270-274) 가 `order_custom_display_id: input.order.custom_display_id ?? null` 반환 — 소스 확인됨.
- **generateCustomDisplayIdImpl** (reserve.ts) 는 매장 식별 1=metadata, 2=shipping_methods.data, 3=sales_channel_stock_location 단일 링크 순. fallback 4(닉네임 단일 매장) 는 M0-1124-K 에서 삭제.
- **Fork #252 MERGED** (`app/checkout/success/[orderId].tsx`): `useOrder(orderId)` 로 custom_display_id 로드해 enrichedReceipt 주입. 자동 print 는 order 로드 대기 후 출력. 없으면 order_display_id fallback 유지.
- **Fork #253 MERGED** (`api/hooks/draft-orders.tsx`): `useCreateNewDraft` 에서 metadata.stock_location_id 를 draft 생성 body 에 포함 + 이후 pos_order_num stamp 시 병합. 매장 미선택 태블릿은 metadata 미전송으로 회귀 없음.

**실기 못 한 부분:** 로컬 Medusa 백엔드 미기동 → 실제 "PIM26B1000" 글자를 결제 성공 화면·영수증 ESC/POS·주문 상세 헤더에서 본 결과 없음. 백엔드 bootstrap 비용(마이그레이션+시드)이 50 분 상한을 초과.

**예상되는 Kyu 실기 결과 (내일):**
- POS 태블릿이 PIM 매장 선택 · draft-order 생성 → `metadata.stock_location_id` 송신 (#253) → 서버 콜백 (reserve.ts) 가 PIM nickname + 카운터 → `PIM26B1000` 발급 → tenders 캡처 시 `buildSnapshot` 이 `order_custom_display_id` 포함 → fork 성공 화면 (#252) 이 enrichedReceipt 로 "Order PIM26B1000" 하단에 노출.
- 매장 미선택 태블릿 → `metadata` 미송신 → fallback 1·2·3 전부 실패 → `custom_display_id=NULL` → fork 성공 화면이 `order_display_id` fallback "Order 186" 표시.

### S2 · Admin 영수증 탭 (storeport PR #422 MERGED)

로컬 Playwright 스모크 실제 실행:

```
cd ~/curiocity-live/storeport-wts/M0-1124-J-wt/apps/commerce-core
npx playwright test --config playwright.smoke.config.ts --reporter=list --grep "Screen 4"

Running 3 tests using 1 worker
  ✓  1 Screen 4 · POS Settings Receipt tab (M0-1124-J) › 탭 5개 · Receipt 활성 · Advanced 섹션 (749ms)
  ✓  2 Screen 4 · POS Settings Receipt tab (M0-1124-J) › General 탭 · 매장 선택 시 nickname 편집기 (459ms)
  ✓  3 Screen 4 · POS Settings Receipt tab (M0-1124-J) › Receipt 탭 트리거 활성 강조 (shadow + 배경) (420ms)
  3 passed (3.2s)
```

스샷 3장 복제 → `screens/S2-*.png`:
- `S2-receipt-tab-advanced.png` — 탭 5 개 + Receipt 활성 + Advanced 전개
- `S2-general-nickname-editor.png` — General 탭 매장 선택 후 Store nickname 편집기 노출
- `S2-receipt-tab-active-emphasis.png` — Receipt 탭 활성 강조 (배경 + shadow)

하니스는 e2e/harness-smoke/main.tsx 기반 Vite 하니스 (실서버 불필요) — Admin UI 컴포넌트가 mock fetch 로 작동함. 즉 운영 Medusa 배포 없이도 UI 가드 검증 가능.

### S3 · Checkout B안 (fork PR #254 OPEN · M3-1124-O)

- **Fork PR #254 CI** (`gh pr checks 254`): `assertions` **FAIL** (27/28 pass · m3-1105-d-assertions.mjs 1건: `✗ Pay 버튼 (testID="checkout-pay")`) · `flow-tests` PASS · `lint` PASS · `playwright` skipped. — Pay 라벨이 "Checkout" 로 바뀌면서 레거시 어설션이 testID="checkout-pay" 단일 노드를 요구했는데 이제 testID 가 `checkout-pay-{cash,card,qris}` 3개로 분리됨. PR 자체 어설션은 갱신됐지만 **레거시 하니스 `m3-1105-d-assertions.mjs` 리프레시가 필요**.
- **소스 레벨 가드 확인** (코드 grep):
  - `app/checkout/[draftOrderId].tsx` 361: `ListHeaderComponent={() => <Text className="text-2xl">Checkout</Text>}` — 체크아웃 상단 타이틀 ✓
  - 384 / 395 / 406: `testID="checkout-pay-cash" / -card / -qris"` 3 버튼 ✓
  - 441: `testID="checkout-pay-in-parts"` + `accessibilityLabel="Pay in parts"` + text "Pay in parts" ✓
  - `components/cart/CartPanel.tsx` 615/692: "Checkout" 라벨 ✓
  - `components/cart/CartSheet.tsx` 98/102: `accessibilityLabel="Close cart"` · `className="h-11 w-11 ... rounded-full active:bg-surface-muted"` — View Cart X 44pt ✓
  - `app/checkout/tender-cash/[draftOrderId].tsx` 299: `<Text ...>Cash payment</Text>` · 354-357: method 별 "QRIS payment" / "Card payment" / "Cash payment" 선택 ✓
- **PR #254 의 e2e spec** (`e2e/flows/M3-1124-O-checkout-b.spec.ts`) 은 chromium 하니스에서 3 버튼 가시성 · 높이 ±1px · "Pay in parts" · "Checkout" 머리글 · method=cash/card/qris → tender 제목 등을 전부 어설트. CI 에서 playwright 가 skip 됐지만 어설션은 코드로 존재.
- **PR committed 스샷 복제** (CI 생성): screens/M3-1124-O-01~05.png.

**실기 못 한 부분:** 로컬 Expo web 빌드 (`expo export -p web` → `dist/`) 미수행 → playwright 하니스 local 미구동. 빌드 비용(초기 5~10 min) + 서버 기동 시 상한 초과 리스크.

### S4 · setup-multi-store 스크립트 (M0-1124-E MERGED)

- **parseArgs 단위 테스트**: `apps/commerce-core/src/scripts/__tests__/setup-multi-store.unit.spec.ts` 4/4 PASS (로컬 실행).
- **스크립트 로직 검증** (src/scripts/setup-multi-store.ts):
  - **기본 dry-run**: argv 에 `--apply` 없으면 `dryRun=true` (line 93). ✓
  - **매장 1 · PIM rename**: `existing[0]` 가 "PIM" 가 아니면 rename 예정 로그 → `--apply` 시 updateStockLocations(id, {name:"PIM"}) (line 119-127). ✓
  - **매장 2 · PS 생성**: `find(l => l.name === parsed.psName)` 로 조회 → 없으면 createStockLocationsWorkflow 예정 로그 (line 144-159). ✓
  - **채널 연결**: 첫 번째 sales channel 을 PS 에 link (line 162-178). ✓
  - **PS 재고 0**: 모든 inventory_item 각각 createInventoryLevelsWorkflow(stocked_quantity: 0) (line 180-199). ✓
  - **주소**: patchLocationSettings(id, {store_address}) PATCH merge (line 201-227). ✓
  - **종료 안내**: dry-run 시 "실제 반영: 명령어 뒤에 `-- --apply` 를 붙여 재실행" (line 232-236). ✓
- **dry-run 출력 가독성**: 모든 로그에 `[M0-1124-E]` prefix. 각 매장 action 에 매장 이름·id 출력 → PIM 대상이 어느 매장인지 사용자가 식별 가능.

**실기 못 한 부분:** 로컬 Medusa 백엔드 미기동 → `pnpm --filter commerce-core exec medusa exec ./src/scripts/setup-multi-store.ts` 가 Medusa 컨테이너 resolve 를 필요로 함. 백엔드 bootstrap 비용으로 미실행. parseArgs + 단위 테스트 범위만 실측.

## ⚠️ 위험 (Kyu 가 내일 운영 실기 전 반드시 확인)

### R1 · setup-multi-store existing[0] 오선택 위험

파일: `apps/commerce-core/src/scripts/setup-multi-store.ts:114`
```ts
const pimTarget = existing[0] ?? null;
```
- 주석은 "가장 오래된 1 개" 를 PIM 으로 간주한다고 하지만, Medusa `stockLocationModule.listStockLocations({})` 의 반환 순서가 생성 시각 오름차순이라는 보장이 없음.
- 만약 운영 DB 에 이미 매장 2 개 이상 존재하면 `existing[0]` 가 Soopsok 가 아닐 수 있음 → **잘못된 매장이 "PIM" 로 rename 될 위험**.
- **운영 실기 전 반드시 선행**:
  1. `select id, name, created_at from stock_location where deleted_at is null order by created_at` 를 운영 DB 에서 조회
  2. 매장이 1 개 (Soopsok) 뿐임을 확인
  3. 그 후에만 `-- --apply` 실행
- 매장 1 개일 때는 안전.

### R2 · inventory_level 멱등성 결함

파일: `apps/commerce-core/src/scripts/setup-multi-store.ts:188-198`
```ts
if (!dryRun && psId && inventoryItems.length > 0) {
  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: inventoryItems.map(...) },
  });
}
```
- PS 매장이 이미 존재하고 inventory_level 이 이미 생성된 상태에서 재실행하면 `createInventoryLevelsWorkflow` 가 unique constraint (inventory_item_id + location_id) 를 위반해 **에러**로 멈춤.
- 재실행이 "완전 멱등" 하지는 않음. 다만 에러로 멈추므로 데이터 손상은 없음 — "다시 실행하면 pretty error 로 중단" 정도의 안전성.
- **대응**: 재실행 전 PS 매장 조회 단계에서 "이미 있으면 inventory level 단계 skip" 가드 추가가 이상적. 현재는 "한 번만 apply" 운영 방식으로 사용.

### R3 · PR #421 미병합 상태

- 서버 측 `custom_display_id` 부여 fallback 체인 확장 (reserve.ts) + `buildSnapshot` 의 order_custom_display_id 포함은 PR #421 에 묶여 있음. **PR #421 이 main 에 머지 + Railway 재배포** 되기 전엔 운영 Order 가 fork #253 가 metadata 를 보내도 `custom_display_id` 가 NULL 로 기록될 수 있음 (fallback 체인 3=sales_channel_stock_location 는 M0-1124-A 원본에 있으나, 매장이 1개이고 shipping method가 없는 draft-order 의 경우 metadata 가 없으면 여전히 NULL).
- **대응**: Kyu 실기 전 PR #421 머지 상태 확인. heavy-mac CI GREEN 이므로 머지 준비 완료.

### R4 · Fork PR #254 CI 1건 FAIL

- `m3-1105-d-assertions.mjs` 가 legacy testID="checkout-pay" 단일 버튼을 찾아 실패. PR 범위의 어설션 (`m3-1124-o-checkout-b.spec.ts`) 은 정상.
- 기능적으로는 PR 자체 테스트가 testID 분리를 제대로 가드하므로 운영 영향 없음.
- **대응**: 머지 전 `m3-1105-d-assertions.mjs` 를 새 testID 체계로 리프레시 (별도 PR 가능).

## Kyu 실기 체크리스트 초안 (2026-11-25 아침 회사 실기)

### 선행 (실기 시작 전 10분)

- [ ] **storeport PR #421** 머지 상태 확인 (`gh pr view 421`). 머지 안 됐으면 먼저 머지 → Railway auto deploy 성공 확인.
- [ ] **운영 Postgres 매장 수 확인**: `select id, name from stock_location where deleted_at is null` → **매장이 1개 (Soopsok) 뿐** 임을 반드시 확인.
- [ ] Admin `/admin/pos-settings` 진입 → General 탭에서 **매장 nickname "PIM"** 저장 완료 상태인지 확인.
- [ ] fork POS 앱(iOS/태블릿) 최신 master 설치 (#252·#253 반영분).

### S1 · 주문번호 PIM26B 실기 (가장 중요)

- [ ] POS 태블릿에서 **매장 "PIM" 선택** 후 Sell → 상품 1개 담기 → Checkout.
- [ ] **결제 성공 화면 맨 아래** `Order PIM26B1000` (또는 1001, 1002 …) 노출 확인.
- [ ] Admin `/admin/orders/:id` → 헤더 바로 아래 **긴 번호 PIM26B1000** 노출.
- [ ] 영수증 프린터 ESC/POS 텍스트에 `Order PIM26B1000` 포함 (프린터 연결 시).
- [ ] **매장 미선택 fallback**: 매장 선택 해제 상태로 새 draft → 결제 성공 화면에 `Order {display_id}` (예: `Order 186`). PIM 번호 아닌 fallback 작동.

### S2 · Admin 영수증 탭 실기

로컬 Playwright 스모크 결과 (`S2-receipt-tab-*.png`) 와 동일하게 보여야 함.

- [ ] `/admin/pos-settings` → 탭 5 개 순서 **General · Tax · Payments · Pre-order · Receipt**.
- [ ] Receipt 탭 활성 시 다른 탭과 **채운 배경 + 진한 글자**로 명확히 구분 (light/dark 양쪽).
- [ ] 레거시 `/admin/pos-settings?tab=order-numbers` → 자동으로 Receipt 탭으로 이동.
- [ ] Brand 모드 General → **Store address + Customer Display** 만.
- [ ] 매장 선택 모드 General → **Store nickname** 편집기 ("PIM" 등 2-4자) → 저장 → "Nickname saved" 토스트.
- [ ] Receipt 탭 "Order number format" 섹션에서 nickname 은 **읽기 전용** 텍스트, start-serial 만 편집.
- [ ] Receipt 탭 저장 → header / footer / logo URL / logo mode 가 brand setting 에 반영.
- [ ] Advanced 접힘 → Reprint limit · Reprint watermark · Refund watermark 3개 저장.

### S3 · Checkout B안 실기 (PR #254 머지 후)

PR #254 는 아직 OPEN. 머지 후:

- [ ] 세로 phone/태블릿에서 Cart → **"Checkout"** 라벨 (Pay 가 아님).
- [ ] Checkout 화면 합계 아래 **Cash · Card · QRIS 3 버튼 가로 배치** + 아래 작은 "Pay in parts" 링크.
- [ ] Cash 탭 → tender 머리글 **"Cash payment"**.
- [ ] Card 탭 → tender 머리글 **"Card payment"**.
- [ ] QRIS 탭 → tender 머리글 **"QRIS payment"**.
- [ ] "Pay in parts" → split-tender 흐름 복귀 (1차 Cash + 2차 Card 정상).
- [ ] Cart 시트 **X 버튼 주변 44pt 원형 터치 영역** (가장자리 탭도 닫힘).
- [ ] 선주문(preorder) + pickup 미선택 → 3 버튼 비활성 + Pay in parts 비활성.

### S4 · setup-multi-store 실기 (PS 매장 추가하는 날만)

⛔ **운영 매장 1개 확인 선행 필수** (상기 R1 참고).

- [ ] 1차 dry-run:
  ```
  pnpm --filter commerce-core exec medusa exec ./src/scripts/setup-multi-store.ts
  ```
  로그에 `mode=DRY-RUN` + `rename: "Soopsok Store (Jakarta)" → "PIM" (id=stl_xxx)` + `PS 매장 생성 예정` + `sales channel "..." 을 PS 에 link` + `inventory items: N → PS inventory level 수량 0 생성 예정` + `PIM 주소 저장 예정` + `PS 주소 저장 예정` 전부 노출되는지 확인.
- [ ] rename 대상 id 가 운영 Soopsok 매장 id 와 일치하는지 눈으로 확인.
- [ ] 2차 apply:
  ```
  pnpm --filter commerce-core exec medusa exec ./src/scripts/setup-multi-store.ts -- \
    --apply \
    --pim-name "PIM" --pim-address "Pondok Indah Mall, Jakarta" \
    --ps-name "PS" --ps-address "Plaza Senayan, Jakarta"
  ```
- [ ] 3차 재실행 (멱등성 점검): `--apply` 로 다시 실행 → PIM rename 생략 로그 + PS 생성 생략 로그 + 주소 저장 재실행. **inventory_level 재생성에서 에러 발생 가능** (R2) → 에러 메시지가 unique constraint 쪽이면 "이미 생성 완료 상태" 로 해석하고 넘어감.
- [ ] Admin `/admin/pos-settings` → 매장 2 개 (PIM · PS) 모두 보이고 각 매장 주소 노출.
- [ ] 각 매장 nickname "PIM" · "PS" 설정 → 각 매장 주문이 올바른 prefix 발급 확인.

### 운영 배포 선행 필요 항목

| 항목 | 상태 | 조치 |
|---|---|---|
| storeport #421 (reserve.ts fallback + snapshot) | OPEN · CI GREEN | 머지 → Railway auto deploy SUCCESS 확인 (§5 Railway 규약) |
| storeport #422 (Receipt 탭) | MERGED | 이미 반영 — Admin 접속해서 Receipt 탭 노출 확인 |
| fork #252 (success 화면 custom_display_id) | MERGED | iOS/태블릿 앱 최신 master 설치 |
| fork #253 (draft metadata stock_location_id) | MERGED | 위와 동일 |
| fork #254 (Checkout B안) | OPEN · CI 1건 FAIL (legacy assertion) | 머지 전 legacy assertion 리프레시 — 기능 자체 영향 없음 |
| setup-multi-store.ts | MERGED (M0-1124-E) | 매장 2개 날에만 실행. R1 선행 필수 |

## 리허설 요약

- **S2 는 완전히 통과** (로컬 Playwright 3/3 PASS · 스샷 포함).
- **S1 은 운영 Order #185 뿌리 수정 (PR #421) + fork master (#252·#253) 가 함께 동작해야 하는 end-to-end 흐름이라 로컬 백엔드 없이 눈으로 확인은 불가**. 다만 코드/CI 신호는 전부 녹색. Kyu 가 내일 머지·배포 후 매장 1개에서 PIM 한 번 돌리면 결정적.
- **S3 는 소스 가드 모두 OK**. 머지 전 legacy assertion 하나만 처리하면 안전.
- **S4 는 "매장 1 개 환경" 전제에서 안전**. **매장 2 개 이상 환경에서는 existing[0] 가정이 깨짐** — 운영 실행 전 매장 수 확인이 체크리스트 최상위.

리허설 판정: **PARTIAL** · S2 는 PASS, S1/S3/S4 는 코드·CI 검증까지만, 라이브 E2E 눈 확인은 Kyu 내일 실기로 이관.
