PASS · https://github.com/CuriocityDevAi/storeport/pull/454 · 원인=(a) 서버 pickBestSnapshot 이 paid+skipped #196 을 rank 3 fallback 으로 계속 "active" 반환 → CD-1 클라 가드만으로는 못 막음 (receipt 화면 old-path 폴백).

# M0-1126-F — CD ↔ POS v3 (Kyu 11-26 14:19 WIB)

## 배포 확인
- #452(a6b693c) 는 origin/main 에 머지 완료 (2026-11-26 05:44Z). admin.meros.id 배포 상태는 러너 네트워크 밖이라 공개 확인 skip · 본 PR 은 a6b693c 위에 적용.

## 뿌리 진단 (가설 a 확정)
POS Sell 빈 카트 상태에서 CD 가 과거 Order #196(cash·Rp68.200·phone skipped) 을 띄운 것은 서버 `getActiveSnapshotForRegister` 의 `pickBestSnapshot` 이 paid+skipped 스냅샷을 rank 3(paid fallback)으로 계속 "active" 응답에 실어 보내기 때문. link_open_until=EOB 22:00 WIB 이라 evaluateLifecycle 은 "keep" · CD-1 클라 가드는 cd-sync 경로만 null 폴백시키고 `index.tsx` 의 old-path(screen=receipt) 는 그대로 발화 → 사용자는 과거 영수증 + "Phone entry skipped" 패널을 본다. 이후 Order #201 active 가 들어와도 CD 가 이미 terminal flow(receipt/#196) 에 잠겨 Rule E (`isTerminalFlow` + `snapshot.id !== prevSnapshot.id && state !== paid`) 때문에 새 cart 스냅샷을 무시 → stopper. (b)(c)(d) 는 (a) 뒤에 따라붙는 증상.

## 고침
### V3-1 (stopper · 서버에서 보장)
- `apps/commerce-core/src/modules/register_session/lifecycle.ts` · 신규 `isPostSettlementStale(snapshot, now)`: paid + (skipped_at ∨ customer_phone ∨ phone_deferred) + paid_age > 30s → true. phone_entry_open 중이면 false (keypad 유지), paid_age<30s 는 CD-1 receipt→keypad 전환 창 보존.
- `apps/commerce-core/src/modules/register_session/service.ts` · `getActiveSnapshotForRegister` 가 `pickBestSnapshot` 전에 settled-stale 을 alive 후보에서 제외. 스냅샷 자체는 expire 하지 않음 (캐셔 LateLink 용 link_open_until 보존).

### V3-2 (영수증 머리 "Store" → 매장명·주소·옵션·Received)
- `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` · `buildSnapshot({ store: { name, address } })` — 기존 name 만 전달 → address 추가(기존 inline patchSnapshotReceiptByOrder 가 CD 에 흘림).
- `apps/commerce-core/src/subscribers/order-snapshot-paid.ts` · fallback 경로(QRIS 웹훅·inline 패치 실패)에서도 pos_settings 에서 store_name/store_address 를 읽어 최소 receipt 에 심어 둠 → CD 영수증 머리가 "Store" 공란이 되는 회귀 차단.
- `apps/customer-display/src/components/cd-sync/LeftPaymentPanel.tsx` · `ReceiptMiniStoreOptions` prop 추가, `"Store"/PB1/10` 하드코딩 폴백 제거 · 라이브 storeConfig 를 resolveReceiptView 에 전달 · variant_title(옵션) + 현금 Received/Change 라인 렌더.
- `apps/customer-display/src/screens/PhoneFlowScreen.tsx` · storeOptions prop forward.
- `apps/customer-display/app/index.tsx` · LiveIndexRoute 가 liveConfig 로부터 만든 storeConfig 를 PhoneFlowScreen 에 전달.

## 자기 검증 로그
- `pnpm typecheck` (commerce-core · customer-display) — 0 err.
- `pnpm test` commerce-core — **869/869 pass** (`order-snapshot.unit.spec.ts` 에 `isPostSettlementStale` 5 case 추가).
- `pnpm test` customer-display — **313/313 pass**.
- `bash scripts/it.sh cd-pos-sync-v3` — **3/3 pass** (11.35s):
  - `V3-1 · paid+skipped snapshot 이 30초 넘기면 GET active = null (POS Sell 빈 카트 복귀)` ✓ 575ms
  - `V3-1 · 이어서 주문 B 담기 → GET active = B (A 아님)` ✓ 711ms
  - `V3-2 · markSnapshotPaidByOrder 가 receipt.store.name/address 를 담는다 (fallback 경로)` ✓ 408ms
- 회귀 integration: `cd-full-flow` 8/8 · `cd-parallel-pay` 15/15 · `cd-pos-screen-sync` 7/7 · `cd-snapshot-skip` 7/7 · `post-pay-link-balance` 2/2.
- naming-check PASS.
- CD 스크린샷(실기): 러너 환경에서 Playwright E2E 는 live 서버 필요 — Kyu 재배포 후 admin.meros.id 실기로 확인 필요 (PR 본문 체크리스트 4항).

## ⛔ POS fork 수정
- 범위 밖 · 미수정. 서버 `payment_phase`/`customer_flow` 계약은 그대로 유지.

## 제한 & 알림
1. **POS fork 미수정** (지침). POS 가 Sell 복귀 시 명시적 `pos_screen='idle'` 전송 또는 `clearSnapshotForRegister` 호출을 보장하면 더 명시적 · 지금은 서버 시간-기반 가드(`isPostSettlementStale`) 로 덮음.
2. **운영 실기 CD 스크린샷 미첨부**. 배포 반영 후 Kyu Case 1 ①~⑥ 재현 필요 (PR 체크리스트).
3. **CD-1 클라 가드는 유지**. 서버 가드와 중복이지만 폴백으로 유지 (서버 롤백 시에도 작동).
4. **receipt_no · 일시 · 캐셔 이름** 은 현 PR 범위 밖 — snapshot payload 에 아직 미포함(buildSnapshot 에 넣으려면 createReceiptForOrder 결과를 taken 후 패치해야 함). 다음 라운드에.
