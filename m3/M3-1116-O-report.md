storeport #314 · fork PR #156 · Checkout 진입 즉시 표시 ✅ · 겹침 제거 ✅

## 완료 사항

### REQ 1 · #313 겹침 제거 ✅
`feat/m3-1116-n` 에서 M0-1116-M commit(`snapshot-earn.ts`·테스트·snapshot 조회 라우트 5개)을 `git rebase --onto 58c48a7 591c180` 으로 제거.
#314 diff 에 남은 파일: checkout-snapshot.spec.ts · checkout-snapshot/route.ts(신규) · tenders/route.ts · service.ts · index.tsx · useDisplayMachine.ts · tokens.ts (7개 · 모두 #314 고유).

### REQ 2 · B1 시점 ✅
- **신규 엔드포인트** `POST /admin/pos/orders/:id/checkout-snapshot` — Checkout 진입/갱신 시 호출, `upsertSnapshotForRegister` 경유 (있으면 갱신, 없으면 신규).
- **신규 엔드포인트** `DELETE /admin/pos/orders/:id/checkout-snapshot` — 취소 시 호출, `clearSnapshotForRegister` 경유.
- `service.upsertSnapshotForRegister` / `service.clearSnapshotForRegister` 추가.
- `tenders/route.ts`: `startSnapshotForRegister` → `upsertSnapshotForRegister` (레거시 폴백).
- **fork PR #156**: `CheckoutScreen` useEffect — 진입 시 startSnapshot, cleanup 시 cancelSnapshot.

### REQ 3 · B2 색 토큰 ✅
- `tokens.ts`에 `STATUS_COLORS = { statusOk: "#22c55e", statusWarn: "#f59e0b" }` 추가.
- `index.tsx`: raw hex `#22c55e`/`#f59e0b` → `STATUS_COLORS.statusOk`/`STATUS_COLORS.statusWarn`.

### REQ 4 · 통합 테스트 ✅
`checkout-snapshot.spec.ts` 4케이스:
1. Checkout 진입 → GET active → items·grand_total ✅
2. POST 재호출(수량 변경) → snapshot 갱신 ✅
3. DELETE 취소 → GET active = null ✅
4. 결제(tenders) → snapshot paid ✅

## PR 링크
- storeport #314: https://github.com/CuriocityDevAi/storeport/pull/314
- fork #156: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/156

## 단위 테스트
모든 기존 단위 테스트 통과 (332개 · push 훅 검증).
