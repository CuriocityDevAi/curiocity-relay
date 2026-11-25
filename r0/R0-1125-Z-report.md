#438 APPROVE · #263 CHANGES · 계약 MISMATCH

## 계약 대조표

| 항목 | 서버 (#438) 실제 | POS (#263) 가정 | 일치? |
|------|-----------------|-----------------|-------|
| 엔드포인트 | `POST /admin/pos/orders/:id/qris-cancel` | 동일 | ✓ |
| 요청 body | `{}` (optional pc/pr id) | `{}` | ✓ |
| 취소 성공 응답 | `200 {ok:true, status:"expired", canceled:[…]}` | 성공 → draft 삭제 진행 | ✓ |
| 이미 결제 응답 | `200 {ok:true, status:"paid", canceled:[]}` | **409 {type:'already_paid'}** 가정 | ❌ MISMATCH |
| POS catch 도달 여부 | 200 OK → catch 미실행 | catch에서 409 감지 기대 | ❌ |

## 계약 불일치 상세 (BLOCKING)

`#263` `useDiscontinueSplitPendingOrder` 는 `already_paid` 를 `catch (e)` 블록 `e?.status === 409` 로 감지하려 함. 그러나 서버는 `already_paid` 도 `200 OK {status:'paid'}` 로 반환하므로 catch 블록이 실행되지 않고, 항상 `② sdk.admin.draftOrder.delete(orderId)` 로 진행 → **이미 결제된 주문 draft 삭제** 위험.

**서버가 정본. POS (#263) 수정 필요:**
```ts
const resp = await sdk.client.fetch<{ ok: boolean; status: string; order_id: string }>(
  `/admin/pos/orders/${orderId}/qris-cancel`,
  { method: 'POST', body: {} },
);
if (resp?.status === 'paid') {
  return { kind: 'already_paid', orderId: resp?.order_id ?? orderId };
}
await sdk.admin.draftOrder.delete(orderId);
```

## #438 (storeport M0-1125-K) — APPROVE

- qris-cancel: capture 선검사 → pending session cancel → webhook race 재확인 (멱등·돈 안전 ✓)
- CD snapshot `line_total→total` (CdSnapshotItem 타입 도입) · `toSnapshotNum` 공용화
- 회귀 가드 `snapshot-total-field.unit.spec.ts` (tenders `line_total:` ≤ 1 grep 체크)
- qris-pending GET 엔드포인트 신규
- M0 보고: 25 신규 + 715 전체 테스트 통과 · typecheck 0 · lint 신규 error 0
- CI check-runs 403 (API 제한) — M0 리포트 기준으로 통과 확인
- **#437 충돌 없음**: `#438` → `tenders/route.ts` CD snapshot items `total`, `#437` → `mint-sale-receipt.ts` receipt.items `line_total`. 별개 레이어·타입.

## #263 (pos-fork M3-1125-N) — CHANGES

**BLOCKING:**
- qris-cancel `200 {status:'paid'}` 미처리 → `already_paid` 분기 무효 → 결제된 draft 삭제 위험

**CI 실패:**
- Lint / lint ❌
- CI / assertions ❌
- (unit-tests ✅ · flow-tests ✅ · route ✅)

**나머지 합격:**
- P4 `fromOrders=1` back nav (`< Checkout`) + `gestureEnabled:false` ✓
- P5 step=second 자동 초기화 + `CashTenderPanel total=remaining` ✓
- P6 "QRIS 대기 중" 레이블 (paid_so_far=0 & method=qris) ✓
- 기능 플래그 `QRIS_CANCEL_ENABLED=false` → Discontinue 버튼 현재 숨김 (안전 장치) ✓
- ③ draft 삭제: `sdk.admin.draftOrder.delete(orderId)` (Medusa 표준 SDK)
- 받은 돈 0 판단: 클라이언트 `paid_so_far===0` 로 버튼 노출 조건 결정, 서버가 capture 독립 재확인 → 클라이언트 판단 오류 시에도 돈 손실 없음 ✓

## 리뷰 액션

- storeport #438: COMMENT(APPROVE) 제출 ✓ (셀프 머지 제한 → COMMENT 형식)
- agilo-medusa-pos-fork #263: COMMENT(CHANGES) 제출 ✓
- 계약 불일치 코멘트 양쪽 PR 에 동일 내용 첨부 ✓
- 기존 스레드 없음 (resolve 대상 없음) ✓
