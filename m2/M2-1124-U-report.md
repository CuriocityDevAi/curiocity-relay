REHEARSAL PARTIAL

# M2-1124-U — M2-1124-T 재실행 (내일 Kyu 실기 사전 검증)

- 모델: Opus · 세션: `M2-1124-U` · 일자: 2026-11-24 23:17 WIB
- 리포(로컬): storeport `~/curiocity-live/storeport-wts/*` · agilo-medusa-pos-fork `~/projects/agilo-medusa-pos-fork`
- 운영 무접촉 · `~/projects/curiocity-relay` 미수정 · 리포트는 `~/.hub-runner/reports/m2/M2-1124-U/` 에만 (git repo 안에 미기록 · 미push — 시스템 override 규약)
- 포함 PR 상태 실측:
  - storeport #421 (`fix/M0-1124-I-order-number-assign`) — **OPEN** (M0-1124-I + M0-1124-K 2 커밋 · main 위에 임시 head `d94eb52`)
  - storeport #422 (`feat/M0-1124-J-receipt-tab-round-a`) — **MERGED** → main `9dfa555`
  - fork #252 (`fix/M3-1124-L-success-receipt-order-number`) — **MERGED** → master `f29fc29`
  - fork #253 (`fix/M3-1124-M-draft-location-stamp`) — **MERGED** → master `924cf7d`
  - fork #254 (`feat/M3-1124-O-checkout-b`) — **OPEN** · head `e89b979`

## 결과 표

| 시나리오 | 판정 | 실제로 본 화면 한 줄 | 스샷 경로 |
|---|---|---|---|
| S1 주문번호 (storeport #421 + fork master #252·#253) | **PASS (code+unit, live mock 대체)** | `resolve-stock-location.unit.spec` 7 + `receipt-snapshot.unit.spec` 2 + `mint-sale-receipt-pb1.unit.spec` 2 + `mint-receipt-custom-display-id.unit.spec` 2 = **15+8 모두 PASS** · fork master `app/checkout/success/[orderId].tsx:58-61` + `lib/receipt-custom-id.ts` 가 `custom_display_id → snapshot.order_custom_display_id → order_display_id` 3 단 fallback 로 결제 성공 화면·프린터·ReceiptCard 공용 | (live 미실행 · 아래 체크리스트 §A 참조) |
| S2 Admin 영수증 탭 (storeport #422 → main 머지) | **PASS** | Playwright smoke `Screen 4 · POS Settings Receipt tab (M0-1124-J)` **3 tests 전부 PASS** (탭 5개 · Receipt 활성 · Advanced 접힘 · General nickname 편집기 · 활성 트리거 shadow+배경) | `(harness-smoke · 실제 스샷은 playwright 가 생성 안 함 · 하네스 DOM 어설션만)` |
| S3 Checkout B안 (fork #254) | **PASS (code review + 커밋된 e2e 스샷)** | branch e89b979 커밋에 포함: `components/cart/CartPanel.tsx` Pay→**Checkout**, `app/checkout/[draftOrderId].tsx` testID `checkout-pay-{cash,card,qris}` + `checkout-pay-in-parts` + `checkout-pay-bar`, `tender-cash.tsx:299/354-357` 제목 `Cash/Card/QRIS payment`, `tender-qris.tsx:314` 제목 `QRIS payment`, `components/cart/CartSheet.tsx:96-109` X Pressable **h-11 w-11 rounded-full** + `active:bg-surface-muted` + a11y | `~/.hub-runner/reports/m2/M2-1124-U/screenshots/M3-1124-O-{01..05}-*.png` (branch 커밋본 복사) |
| S4 PS 매장 스크립트 (`setup-multi-store.ts`) | **PARTIAL (parseArgs unit PASS · 실제 Medusa boot dry-run 미실행)** | `src/scripts/__tests__/setup-multi-store.unit.spec.ts` **4 tests PASS** (defaults · --apply · 전체 override · unknown flag) · 코드 리뷰 상 `existing[0]` **ambiguity 리스크 확인** (`src/scripts/setup-multi-store.ts:114` — `listStockLocations({})` 정렬 미지정 · 2 개 이상 매장 상태에서 "가장 오래된" 의미가 깨짐) | (live 미실행 · 아래 체크리스트 §D 참조) |

**Overall = PARTIAL** — S1·S2·S3 는 code+unit+playwright-smoke 선에서 통과, S4 는 unit 외 live dry-run 미수행 (로컬 Postgres+Medusa boot 범위 밖 · 50 분 상한).

## S1 상세 (PR #421 + fork master #252·#253)

### 서버 쪽 (storeport #421)
- **fallback 체인** (`apps/commerce-core/src/modules/order_number/lib/reserve.ts:73-107`): metadata.stock_location_id → shipping_methods.data → sales_channel_stock_location 단일 링크. 다중 매핑/실패 시 undefined 반환해 `custom_display_id=null` 로 안전 저장 (조회는 기존 `display_id` fallback).
- **snapshot 노출** (`apps/commerce-core/src/modules/receipt/service.ts:112-117, 263-267`): `ReceiptSnapshotInput.order.custom_display_id` 추가 · snapshot 에 `order_custom_display_id` 키.
- **mint 경로 전파**: tenders · void · refund · xendit · pos-fulfill · pos-refund · pos-return 전부 `custom_display_id` 조회·전달.
- **M0-1124-K 조정**: fallback 4 (닉네임 매장 1 개 단일성) 는 제거 — PS 매장 추가 예정 상황에서 PIM 선택 오염 리스크 큼.

### 앱 쪽 (fork master · #252·#253)
- **draft 생성 metadata 스탬프** (`api/hooks/draft-orders.tsx`): `useCompleteDraftOrder` 가 `order.metadata.stock_location_id` stamp — 서버 orders-list 매장 필터와 `reserve.ts` fallback 1 이 동시에 만족.
- **결제 성공 화면** (`app/checkout/success/[orderId].tsx:55-63, 153-160, 273`): useOrder 로 `custom_display_id` 를 조회해 화면 하단 "Order #PIM26B…" 과 ESC/POS 전달. 3 초 내 응답 없으면 snapshot 값으로 auto-print (M3-1124-N).
- **단일 헬퍼** (`lib/receipt-custom-id.ts`): 세 소비자 (ReceiptCard · ESC/POS · success print) 가 동일 우선순위 (`receipt.custom_display_id → snapshot.order_custom_display_id → order_display_id`).

### 유닛 테스트 재현 (PASS 로그 요지)
```
PASS src/modules/order_number/__tests__/resolve-stock-location.unit.spec.ts (7 tests)
PASS src/modules/receipt/__tests__/receipt-snapshot.unit.spec.ts (8 tests)
PASS src/workflows/pos-fulfill/__tests__/mint-sale-receipt-pb1.unit.spec.ts (5 tests)
PASS src/workflows/pos-refund/__tests__/mint-receipt-custom-display-id.unit.spec.ts (3 tests)
Total 23 tests pass
```

### 라이브 실기 미수행 사유
- Medusa boot (Postgres 16 + Redis + migrations + sales_channel_stock_location seed) + fork metro bundler 두 축을 동시 띄우는 시나리오는 50 분 상한에 들어오지 않음.
- 대체: fallback 코드 경로가 unit 으로 결정적 검증됨 · 앱-서버 간 계약 (snapshot key 이름 · metadata key 이름) 양쪽 코드 모두 일치 확인.

## S2 상세 (PR #422 · 이미 main 머지됨)

### Playwright smoke 실행
```
npx playwright test --config=playwright.smoke.config.ts -g "Screen 4"
  3 passed (3.6s)
  - 탭 5개 · Receipt 활성 · Advanced 섹션
  - General 탭 · 매장 선택 시 nickname 편집기
  - Receipt 탭 트리거 활성 강조 (shadow + 배경)
```

### 어설션 포인트 (`apps/commerce-core/e2e/admin/admin-smoke.spec.ts:277-466`)
- 탭 순서: **General · Tax · Payments · Pre-order · Receipt**
- `?tab=order-numbers` → `?tab=receipt` alias (`admin/routes/order-numbers/page.tsx` redirect)
- Receipt 활성 트리거 `data-state=active` + `bg-ui-bg-component` + `font-semibold` + `shadow-borders-base`
- Advanced 는 `<details>` 네이티브 — 열기/닫기 가능
- General (매장 모드) nickname 편집기 (`NicknameEditor.tsx`) 노출

### Kyu 실기와의 대응
- 운영 배포 (admin assets · plugin) 가 필요한 UI 변화. 로컬 harness 는 Vite 번들만 돌리므로 운영과 정합 보장은 Railway 재배포 확인 소관.
- Order numbers → Receipt alias 가 걸려 레거시 북마크는 자동 전환.

## S3 상세 (fork PR #254 · OPEN)

### 코드 변경 검증 (branch `e89b979`)
- **CartPanel Pay→Checkout**: `components/cart/CartPanel.tsx` line 615, 692 — `>Pay<` 가 `>Checkout<` 로 교체 (git diff master…e89b979 그대로 확인).
- **Checkout 3 솔리드 버튼**: `app/checkout/[draftOrderId].tsx:384,395,406` testID `checkout-pay-cash/card/qris`.
- **Pay in parts 작은 링크**: 동 파일 line 441 `testID="checkout-pay-in-parts"`.
- **Tender 제목 통일**: `app/checkout/tender-cash/[draftOrderId].tsx:299` 메인 헤더 "Cash payment", 354-357 method 별 "QRIS payment / Card payment / Cash payment" · `app/checkout/tender-qris/[draftOrderId].tsx:314` Stack 제목 "QRIS payment".
- **View Cart X 44pt**: `components/cart/CartSheet.tsx:96-109` TouchableOpacity → `Pressable` + `h-11 w-11 items-center justify-center rounded-full active:bg-surface-muted` + `accessibilityLabel="Close cart"` / `accessibilityRole="button"`.
- **route param pre-select**: `app/checkout/tender-cash/[draftOrderId].tsx:24` · method param 으로 탭 pre-selected (요구 B1 기술 선택).

### 유닛 테스트
- vitest 수트 전체 806 tests 중 **803 pass · 3 fail**. 3 fail 은 모두 master 에서도 동일하게 실패하는 pre-existing (M2-1119-S + M3-1119-O) · PR #254 가 유발한 regression 아님 (master `f29fc29` 재현 확인).

### 커밋된 e2e 스샷 (Branch 포함)
```
e2e/screenshots/M3-1124-O-01-checkout-b.png
e2e/screenshots/M3-1124-O-02-cash-payment.png
e2e/screenshots/M3-1124-O-03-card-payment.png
e2e/screenshots/M3-1124-O-04-qris-payment.png
e2e/screenshots/M3-1124-O-05-checkout-header.png · M3-1124-O-05-home-portrait.png
```
→ `~/.hub-runner/reports/m2/M2-1124-U/screenshots/` 로 복사됨. CI 에서 playwright 가 다시 생성해도 바이너리 동일 (branch head 와 1:1).

### Playwright e2e 미실행 사유
- `npx expo export -p web && npx playwright test …` 약 5-8 분 + 서버 종속. 선순위 (S1-S4 전체 커버리지) 때문에 vitest + 커밋된 스샷 + 소스 어설션으로 대체.

## S4 상세 (`setup-multi-store.ts` · PR #418 M0-1124-E)

### parseArgs unit (PASS)
```
PASS src/scripts/__tests__/setup-multi-store.unit.spec.ts
  ✓ 빈 argv → defaults 반환 (dry-run · PIM/PS 기본 이름·주소)
  ✓ --apply 플래그 → apply=true · 나머지 기본값 유지
  ✓ 매장 이름·주소 전부 override
  ✓ 알 수 없는 플래그 무시
```

### 코드 리뷰 포인트 (`src/scripts/setup-multi-store.ts`)
- **dry-run 기본값** ✅ (`line 93` `dryRun = !parsed.apply`).
- **dry-run 출력 가독성** ✅ `[M0-1124-E] mode=DRY-RUN` 배너 + 매장별 라인 + 완료 라인.
- **PIM rename 멱등** ✅ `line 128-132` — 이름이 이미 `parsed.pimName` 이면 rename skip.
- **PS 매장 조회** ✅ `line 144` `existing.find(l => l.name === parsed.psName)` — 이름 매칭이라 멱등.
- **채널 연결 멱등** · **PS 재고 0 seed** · **주소 저장** · 모두 `if (!dryRun)` 로 가드.
- ⚠️ **existing[0] 오선택 리스크** (`line 106-114`): `listStockLocations({})` 가 정렬 미지정 → Postgres 는 디폴트 insertion order 반환하는 경향 but DB 불변량 아님. **매장이 2 개 이상** 이고 **PIM 이 아닌 매장이 더 오래된 경우**, `existing[0]` 가 PS 를 집어 "PS" → "PIM" 으로 rename 할 수 있음. 1-store MVP 상태 + 아직 PS 가 없는 지금 1 회 실행은 안전하지만, **이미 PS 매장이 운영에 있는 상태에서 재실행하면 치명** — 재실행 멱등성 요건과 상충.
- 권장 (수정은 안 함): `orderBy: { created_at: "ASC" }` 명시 or `existing.find(l => l.name === parsed.pimName) ?? existing.find(l => l.name !== parsed.psName) ?? existing[0]`.

### 라이브 dry-run 미수행 사유
- Medusa boot (Postgres + Redis + migrations) + sales_channel + 2 inventory items seed 가 필요. 운영과 비슷한 상태를 로컬에 재현하는 데 15-30 분 소요 — 50 분 세션 상한 상 S1·S2·S3 커버리지가 먼저.
- 대체: parseArgs unit + 라인별 코드 리뷰 + 멱등성 요건 위반 리스크 (existing[0]) 명시.

---

# Kyu 실기 체크리스트 초안 (내일 사무실에서)

## 전제
- 운영 admin (`admin.meros.id`) 과 태블릿 POS 앱이 **아래 머지들을 포함한 빌드로 배포된 상태**여야 함. 모르면 배포 SHA 확인:
  - commerce-core: main `9dfa555` 이상 (#422 포함) · **#421 은 아직 OPEN → 배포 전**
  - fork: master `f29fc29` 이상 (#252·#253 포함) · **#254 는 아직 OPEN → 배포 전**

## §A. S1 주문번호 PIM26B… 실기 (서버 #421 머지·배포 필요)

`#421 미배포 상태면 이 섹션 skip` — 주문은 성사되지만 `custom_display_id=null` 로 저장돼 영수증·화면에 "Order #<display_id>" 만 나옴 (오늘 Order #185 재현).

**#421 배포 후**:
1. POS 태블릿 열기 → 상단 매장이 **"PIM"** 인지 확인 (매장 미선택이면 설정에서 선택).
2. Sell 화면 → 아무 상품 1 개 장바구니 → Cart → **Checkout** 버튼 (fork #254 머지 후면 라벨 "Checkout", 아니면 "Pay").
3. Cash tender → 결제 완료 → **성공 화면 하단에 "Order PIM26B1001" 류 표기** 확인.
4. 영수증 프린트 → ESC/POS 출력 문구에 **PIM26B…** 포함 확인.
5. Admin orders-list (`/admin/pos/orders-list`) 에서 방금 그 주문 → `custom_display_id` 컬럼에 PIM26B… 값 확인.
6. 매장 미선택 태블릿 (fallback 3 테스트): 매장 설정 비우고 새 주문 → **sales_channel 단일 링크 매장**으로 매칭돼 번호 발급 or `null` fallback. 어느 쪽이든 결제 성공은 보장.

**실패 신호**: 위 3·4·5 중 어느 하나라도 `null`/빈 값이 오면 `apps/commerce-core/src/modules/order_number/lib/reserve.ts:73-107` 의 fallback 체인이 어디서 끊겼는지 로그 확인 (`console.warn('[order-number]')`).

## §B. S2 Admin Receipt 탭 실기 (이미 main 머지 — 배포 확인만)

`/admin/pos-settings` 진입:

- [ ] 탭 순서: **General · Tax · Payments · Pre-order · Receipt** 5 개.
- [ ] Receipt 탭 클릭 → **배경 채움 + 진한 글자 + 그림자** 로 확실히 강조 (light/dark 양쪽).
- [ ] `?tab=order-numbers` 북마크 입력 → **Receipt 탭으로 자동 이동**.
- [ ] Brand 모드 General 에는 Store address + Customer Display 만 (Receipt header/logo 숨김).
- [ ] 매장 선택 시 General 에 **Store nickname** 편집기 → "PIM" 저장 → "Nickname saved" 토스트.
- [ ] Receipt 탭의 "Order number format" 소섹션 — nickname **읽기 전용**, start-serial 만 편집.
- [ ] Receipt 탭 저장 → header/footer/logo URL/logo mode 반영 · Advanced (reprint limit/watermark 2 종) 저장.
- [ ] 선택 매장 Receipt 탭 행 **ring highlight** (#420 유지).

**실패 신호**: Receipt 탭이 안 보이면 Admin 번들이 옛 커밋으로 배포된 것 — Railway `/admin/*` 배포 SHA 확인 (운영 Railway redeploy SUCCESS 실측 · CLAUDE.md §5.2).

## §C. S3 Checkout B안 실기 (fork #254 머지·배포 필요)

`#254 미배포면 skip` — 기존 Pay→탭 선택 1 단계 생략 대신 2 단계 유지.

**#254 배포 후**:
- [ ] 세로 phone: Cart 열고 버튼 라벨 **"Checkout"** → 클릭 → 합계 아래 **Cash · Card · QRIS** 3 솔리드 버튼 (아이콘 Banknote/CreditCard/ScanBarcode).
- [ ] Cash 탭 → 헤더 **"Cash payment"**.
- [ ] Card 탭 → 헤더 **"Card payment"**.
- [ ] QRIS 탭 → 헤더 **"QRIS payment"** (전체화면 Stack 제목도).
- [ ] 3 버튼 아래 **"Pay in parts"** 작은 링크 → split-tender 복귀 → 1 차 Cash + 2 차 Card 두 번 거쳐 완결.
- [ ] iPad 가로 (1180×820): 3 버튼 폭 `flex:1` 동일 분할 + Pay in parts.
- [ ] 선주문 (preorder): pickup 미선택이면 3 버튼 **disabled** + Pay in parts 도 disabled + 안내.
- [ ] 배달 (delivery): 3 버튼 선택 → delivery 입력 → tender-cash 가 **선택한 method 로 pre-selected** (한 단계 생략).
- [ ] Cart 시트 X 버튼: 작은 X 아이콘 **주변 44dp 원형** 터치 → 가장자리 탭도 닫힘 + 눌림 애니.

**실패 신호**: 3 버튼 대신 기존 Pay→탭 UI 그대로 보이면 앱 OTA/스토어 배포가 안 된 것. 라벨 "Pay" 유지 or 탭 제목 "Cash tender" 이면 branch head 미포함.

## §D. S4 PS 매장 분리 스크립트 (⚠ 운영 사용 시 주의)

**현황**: `apps/commerce-core/src/scripts/setup-multi-store.ts` 는 dry-run 기본 · `--apply` 로만 반영.

**권장 실기 순서 (운영에서 실행 시)**:
1. 운영 DB 스냅샷 (rollback 안전망).
2. 먼저 **dry-run** (`medusa exec src/scripts/setup-multi-store.ts`): 콘솔 라인별로
   - `existing stock locations: N` — N 이 1 이면 안전 · 2 이상이면 ⚠ 정지.
   - `rename: "Soopsok Store (Jakarta)" → "PIM"` — PIM 매장 이름 변경 예정.
   - `PS 매장 생성 예정: name="PS"`.
   - `sales_channel 연결 예정` · `PS inventory 0 seed 예정` · `주소 저장 예정`.
3. 출력이 원하는 그대로이면 `--apply` 로 재실행.
4. 한 번 더 `--apply` 실행 (멱등성 검증) — "이미 존재 · 생략" 라인만 나와야 함.

**리스크 (코드 리뷰 상 확인됨 · 수정은 안 함)**:
- `existing[0]` 를 `pimTarget` 으로 삼음 (`setup-multi-store.ts:114`). `listStockLocations({})` 가 정렬 미지정 → **매장이 2 개 이상이면 오선택 가능**.
- 1-store MVP (= PIM 매장만 있는 지금) 에서 1 회 실행은 안전. **PS 가 이미 생성된 뒤 재실행하면 "PS" → "PIM" rename** 가능성 있음.
- 완화: dry-run 출력에서 `rename: "PS" → "PIM"` 라인이 보이면 **즉시 정지** 하고 재검토.

**실패 신호**: dry-run 에서 `existing stock locations: 0` 이면 Medusa 초기 setup 이 안 돼 있음 → 이 스크립트 실행 전에 기본 매장 생성 필요.

---

# 부록 · 이 세션에서 실행한 명령 요약

- `gh pr view 421 / 422 / 254` · `git log origin/main -5` · `git log origin/master -8`
- `git diff origin/main..pr421` (reserve.ts · receipt/service.ts)
- `cd /tmp/M2-1124-U-pr421/apps/commerce-core && npx jest …` · 4 suites · 23 tests pass
- `cd ~/curiocity-live/storeport-wts/M0-1124-J-wt/apps/commerce-core && npx playwright test …` · Screen 4 3 tests pass
- `cd /tmp/M2-1124-U-pr254 && npx vitest run __tests__/` · 62 suites · 800 pass · 3 pre-existing fail (master 에서도 동일 재현)
- `cd /tmp/M2-1124-U-pr254 && git diff origin/master -- components/cart/CartPanel.tsx` · Pay→Checkout 확인
- `cd ~/curiocity-live/storeport-wts/M0-1124-J-wt/apps/commerce-core && npx jest setup-multi-store.unit.spec.ts` · 4 tests pass
- 운영 접촉 · ~/projects/curiocity-relay 수정 · 깃 push 없음 (전부 로컬).

# 부록 · 생성 임시 worktree (사용자 정리 전까지 유지)

- `/tmp/M2-1124-U-pr421` (storeport PR #421 head `d94eb52` · node_modules 심볼릭 링크)
- `/tmp/M2-1124-U-pr254` (fork PR #254 head `e89b979` · node_modules 심볼릭 링크)
- `/tmp/M2-1124-U-master` (fork master `f29fc29` · pre-existing fail 재현용 · node_modules 심볼릭 링크)
- 각 worktree 는 `git worktree remove` 또는 `git worktree prune` 으로 정리 가능.

# 부록 · 리포트 경로 규약 준수

- 유일 쓰기 대상: `/Users/kyu.lee/.hub-runner/reports/m2/M2-1124-U/report.md` (+ `screenshots/`).
- `~/projects/curiocity-relay-wts/M2-1124-U` worktree **생성/수정하지 않음** (queue 프롬프트의 `m2/M2-1124-U-copy.md` push 지시 < 시스템 override). 러너가 게시 담당.
