#314 C · fork #156 A · #315 A · 결제 후 snapshot 삭제 위험 있음

## #314 — CHANGES

### 블로커: clearSnapshotForRegister "paid" 가드 누락

**service.ts** `clearSnapshotForRegister`:
```typescript
for (const s of rows) {
  if (s.snapshot_state === "expired") continue; // "paid" 건너뛰지 않음
  await updateOrderSnapshots({ id: s.id, snapshot_state: "expired" });
}
```

**문제 흐름:**
1. Checkout 진입 → `startSnapshot` → 상태 `active`
2. 결제 처리(`tenders POST`) → `upsertSnapshotForRegister`(snapshot_state 미전달 → 상태 여전히 `active`)
3. 앱이 success 화면으로 이동(`router.replace`) → checkout unmount → cleanup → `cancelSnapshot` → `DELETE checkout-snapshot`
4. `clearSnapshotForRegister`: `active` snapshot → `expired`
5. success 화면: snapshot = null → `shouldDisableNextOrder(null) = false` → Hand over 즉시 활성 → 손님 화면 번호입력 상태 소멸

**필요 수정 (3곳):**
① `clearSnapshotForRegister`: `|| s.snapshot_state === "paid"` 추가
② `upsertSnapshotForRegister` signature에 `snapshot_state?: string` 추가
③ `tenders/route.ts` cash/card·QRIS 양쪽 `upsertSnapshotForRegister` 호출에 `snapshot_state: "paid"` 추가

### CI 요약

| Check | 결과 |
|---|---|
| pos-integration | ✅ SUCCESS |
| unit-commerce-core | ✅ SUCCESS |
| e2e-admin-loyalty | ✅ SUCCESS |
| customer-display | ✅ SUCCESS |
| docker-smoke-commerce-core | ❌ infra flake |

docker-smoke: `"Running migrations... Creating migrations table 'mikro_orm_migrations'..."` 가 동일 타임스탬프(`10:27:56`)로 60초 간격 반복 → migration 단계 deadlock(infra). 코드 기인 아님 (prior: `30343055378` 동일 패턴).

### 나머지 ✅

- #313 겹침 제거: 7개 파일 모두 #314 고유 ✅
- `tenders/route.ts` → `upsertSnapshotForRegister` 재사용 ✅
- `tokens.ts STATUS_COLORS` / `index.tsx` raw hex 제거 ✅
- 수량 변경 갱신: checkout 화면에서 수량 변경 불가 → 블로커 아님 ✅
- #313 머지 전/후 충돌 없음(고유 파일만) ✅

---

## fork #156 — APPROVE

- `app/checkout/[draftOrderId].tsx` useEffect: 진입 시 `startSnapshot`, cleanup 시 `cancelSnapshot` ✅
- 수량 변경 deps `[draftOrderId, openSession.data?.id]`: checkout 화면에서 수량 변경 불가 → 블로커 아님 ✅
- cleanup 설계는 정상; 결제 후 삭제 위험은 storeport #314 서버 수정으로 해소
- 단위 테스트 335 passed | 6 expected fail ✅
- TypeScript 오류 10건 모두 pre-existing (#156 diff 외 파일) ✅
- **조건:** storeport #314 fix 머지 후 함께 배포

---

## #315 — APPROVE

- `item_subtotal ?? subtotal` 순서 수정 ✅
- `discount_total` 전달: before/after 양쪽 `previewReceipt` 호출에 반영 ✅
- 할인 주문 테스트(1300), item_subtotal 우선 테스트 ✅
- pos-integration ✅ · unit-commerce-core ✅
- 추가: `receipt-preview.ts` earn_base 조합 버그 수정 · `page.tsx` NumericInput UX 개선 — M1-1116-T 범위 내 ✅
