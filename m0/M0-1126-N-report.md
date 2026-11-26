PASS #457 74fdf0a CI green · #458 0947e88 CI green · threads resolved 2/2

## 회귀 원인 (3줄)
1. M0-1126-J V4-6 신설 로직은 `cdSnapshot=null` 두 갈래(① 서버가 신규 CD 계약 미전송 → 구 XState 폴백 ② 신규 계약이 "대기화면" 요구)를 구분하지 않아, stale paid+skipped 스냅샷이 (②) 를 의도했는데 (①) 로 떨어졌다.
2. 구 XState 는 `snapshot_state=paid` 를 받자마자 `screen=receipt` 를 돌려 ReceiptScreen 이 눌러앉고 `main-screen` testid 는 안 보인다. 로컬 1-worker 는 초기 React 렌더(screen=main)가 toBeVisible 에 잡히지만, CI 4-worker 는 React 18 초기 커밋과 첫 TICK 가 함께 batched 되며 MainScreen 노출 창이 사라져 15s 타임아웃.
3. `LiveIndexRoute` useMemo 가 `{cdSnapshot, cdFallbackMain}` 를 반환하도록 리팩터. stalePaid · skippedDismissed+paid · empty building 세 경로가 `cdFallbackMain=true` 를 돌려 cart/qris/receipt 분기 앞에서 MainScreen 을 결정론적으로 강제.

## #457 (feat/M0-1126-J · head 74fdf0a)
- commit: `fix(cd): M0-1126-N — V4-6/CD-1 회귀 수정 · stale paid+skipped → MainScreen 결정론`
- 변경: `apps/customer-display/app/index.tsx` — cdSnapshot 메모 split (cdFallbackMain 플래그 추가) + 렌더 분기에 cart/qris/receipt 앞으로 cdFallbackMain → MainScreen 분기 삽입.
- 로컬 (CI heavy-mac 동일 스텝): `pnpm build:web` + `pnpm e2e --workers=4` → 139 pass / 8 skipped. 구 라운드 red 였던 `cd-pos-sync-v2.spec.ts:129 CD-1 · stale paid+skipped` 포함.
- customer-display 327 unit pass · typecheck green.
- CI heavy-cloud: SUCCESS (heavy-mac skipped = route 가 cloud 선택). 전체 checks 전부 SUCCESS.

## #458 (feat/M0-1126-K · head 0947e88)
- rebase: origin/feat/M0-1126-J (74fdf0a) 위로 clean rebase (충돌 없음).
- commit: `fix(cd/commerce-core): M0-1126-N — 리뷰 반영 (cashier.id CD payload 제거 · 로고 onError 줄 숨김)`
- 반영:
  1) **cashier.id CD payload 제외** (R0-1126-AD-1) — Medusa 내부 user UUID 가 손님 기기 network 로 흐르지 않는다.
     - `apps/commerce-core/src/types/customer-display.ts` · `packages/receipt-view-model/src/order-snapshot.ts` 타입: `cashier?: { name } | null`
     - `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` · `apps/commerce-core/src/subscribers/order-snapshot-paid.ts`: `cashier = { name: cashierName }` 만 (name 없으면 undefined)
     - integration test: `cashier.id` → `toBeUndefined()`
  2) **로고 onError → 줄 숨김** (R0-1126-AD-추가) — `apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx` 에 `logoLoadFailed` state + `onError` 콜백 + `useEffect(() => setLogoLoadFailed(false), [view.storeLogoUrl])`.
- 로컬: `pnpm build:web` + `pnpm e2e --workers=4` → 139 pass / 8 skipped. 328 unit pass · receipt-view-model 10 pass · commerce-core typecheck green.
- CI heavy-mac: SUCCESS (heavy-cloud skipped). 전체 checks 전부 SUCCESS.

## 리뷰 스레드 (2/2 resolved)
- `PRRT_kwDOTe-UYs68WTP0` (resolve-cashier-name.ts:47 · cashier.id payload) — 반영 완료 답글 (reply 4708333382) + resolve.
- `PRRT_kwDOTe-UYs68WTlL` (cd-pos-sync-v4-next-customer.spec.ts:339 · subscriber 직접 호출) — 반영 안 함 · 이유 (통합테스트 환경 derived field 한계 · 로직은 unit+integration 로 분리 검증 · staging 확인 권장) 답글 (reply 4708336869) + resolve.

## 기타
- 러너 폴더 (`~/projects/curiocity-relay`) 는 건드리지 않음. 모든 상주 작업은 `~/projects/curiocity-relay-wts/M0-1126-J` · `~/curiocity-live/storeport-wts/M0-1126-K` 에서.
- 50분 상한 내 완료 (19:09 ~ 19:51 WIB, 42 min).
