#384 APPROVE · POS 필드명 line_item_id · 정규화 안전 O · 404 결론 O · it O

## REQ 1 · POS 앱 필드명 확인

**pos-r0 master `ReturnItemsPicker.tsx:48`:**
```ts
return q > 0 ? { line_item_id: it.id, quantity: q } : null;
```
키는 `line_item_id`. `it.id`는 값(line item UUID)이고 키 이름은 이미 `line_item_id`.
`ReturnSelection` 타입(`{ line_item_id: string; quantity: number }[]`) 및 `useReturnOrder`
hook도 동일.

**PR 설명 오류**: "POS 앱은 `id` 필드 전송"은 현재 pos-r0 master 기준 부정확.
현재 POS master는 이미 `line_item_id`를 보냄. 과거 버전 또는 다른 클라이언트 대비
방어 코드로서 fix는 유효하지만 설명이 오해 소지 있음(본문 지적에 그침).

**서버 수정이 POS와 맞는지**: ✓ — `it?.line_item_id ?? it?.id` 순으로 normalize →
현재 POS(`line_item_id`) 처리 완벽. `id` fallback은 추가 보너스.

---

## REQ 2 · 정규화 안전성

PR diff (`return/route.ts` 101-113):
```ts
const requestedItems: ReturnItemInput[] = (
  Array.isArray(body.items) ? (body.items as any[]) : []
).map((it: any) => ({
  line_item_id: String(it?.line_item_id ?? it?.id ?? ""),
  quantity: Number(it?.quantity ?? 0),
}));
```

**다른 필드 손실 여부**:
`ReturnItemInput = { line_item_id: string; quantity: number }` — 딱 2개 필드만 존재.
`reason`, `method`, `manager_pin` 등은 items 배열 항목이 아닌 body 최상위 필드 →
normalize 대상 아님. 손실 없음 ✓

**둘 다 없을 때 400 유지**:
- `line_item_id`: `String("" ?? "")` → `""` → `!it.line_item_id` → 400 ✓
- `quantity`: `Number(0)` → `it.quantity <= 0` → 400 ✓

**삭제된 `typeof` 체크 정당성**:
`String()`/`Number()` 변환 후 항상 string/number → `typeof` 체크 중복 제거 올바름 ✓

정규화 안전 ✓

---

## REQ 3 · 404 결론 검증

**라우트들이 query.graph로 완료 주문 찾는지**:
`return/route.ts` (line 135-151 현재 storeport main 기준):
```ts
const { data: preRows } = await query.graph({
  entity: "order",
  fields: [...],
  filters: { id: order_id },   // ← status 필터 없음
});
```
refund/route.ts, customer/route.ts도 같은 패턴. fulfilled 주문 조회 차단 없음 ✓

**`orderModule.retrieveOrder`가 테스트 코드에만 있는지**:
- 프로덕션 route 3개(return, refund, customer) — `retrieveOrder` 없음 ✓
- `tenders.spec.ts`(테스트 파일)에만 있음(10개소) ✓
- 신규 `fulfilled-order-after-sales.spec.ts`는 `query.graph` 사용(올바름) ✓

404 결론(테스트 인프라 이슈) 올바름 ✓

---

## REQ 4 · 직접 실행 로그

PR HEAD(`fix/M2-1118-S-fulfilled-refund`) → /tmp/storeport-pr384 클론 후 실행.

```
✓ it.sh fulfilled-order-after-sales      PASS (4/4)
  #S-1 BUG-C 환불: … refund(cash+pin) → 200 (1394ms)
  #S-2 반품 (line_item_id 필드) → 200 (1468ms)
  #S-3 반품 (id 필드 — POS 앱 형식) → 200 (1198ms)   ← normalize 핵심 케이스
  #S-4 나중 연결 → 200 · is_completed_order=true (1052ms)

✓ it.sh checkout-handover-smoke          PASS (2/2, 17s)

✓ it.sh pin-audit                        PASS (4/4, 66s)
  Authorization 없음 → 401
  admin 인증 → PIN 형식 검증
  올바른 PIN → { ok: true }
  잘못된 PIN → 401 + remaining_attempts

✓ commerce-core unit test                47 suites · 539 tests (25s)

✓ Build                                  Backend 6.60s · Frontend 22.51s
```

---

## 판정 · APPROVE

수정 1개(`return/route.ts` +6 / -7)로 BUG-C 핵심 fix.
정규화 안전, 모든 테스트 통과, 빌드 성공.

**사소한 코멘트(본문 전달용)**:
> PR 본문 "POS 앱은 `id` 필드 전송"은 현재 pos-r0 master(`ReturnItemsPicker.tsx:48`)
> 기준 부정확 — 이미 `{ line_item_id: it.id }` 로 전송. `id` fallback이 필요한 구체적 클라이언트
> 버전 또는 경위를 추후 commit/PR note에 보완하면 이력 추적에 도움이 됨.
