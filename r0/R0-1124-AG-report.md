APPROVE

# R0-1124-AG 리뷰 리포트 — PR #253

**날짜**: 2026-11-24  
**PR**: fix(draft-orders): M3-1124-M — draft 생성 시 metadata.stock_location_id 전달  
**브랜치**: `fix/M3-1124-M-draft-location-stamp`  
**커밋**: `598d55a`

---

## 체크 1 · draft 생성 경로 전수 확인

`draftOrder.create` 호출부를 `api/hooks/draft-orders.tsx` 전체 + 프로젝트 나머지 파일 grep:

| 경로 | 파일:라인 | stock_location_id 포함 |
|------|-----------|------------------------|
| `useCreateNewDraft` (새 주문) | draft-orders.tsx:145 | `metadata: locationId ? { stock_location_id: locationId } : undefined` ✓ |
| `useResetAndCreateDraftOrderId` (복구) | draft-orders.tsx:248 | 동일 패턴 ✓ |
| 기타 파일 | — | **호출부 없음** ✓ |

칩 새 주문 경로는 별도 `create` 없이 `useCreateNewDraft` 를 통해 호출됨 → 커버됨.

---

## 체크 2 · metadata update 경로 전수 확인 (stock_location_id 삭제 여부)

`draftOrder.update` 에 `metadata` 를 포함하는 호출부 전체:

| 훅 | 라인 | metadata 처리 | 위험 |
|----|------|---------------|------|
| `useCreateNewDraft` stamp | draft-orders.tsx:162 | `{ pos_order_num, stock_location_id? }` — create 직후 병합 stamp (locationId 조건 동일) ✓ | 없음 |
| `useCompleteDraftOrder` | draft-orders.tsx:1329 | `{ ...(draft_order.metadata ?? {}) }` spread 후 `stock_location_id` 추가 ✓ | 없음 |

`metadata` 를 **포함하지 않는** `.update()` 호출:

| 훅 | 라인 | 전달 필드 | 비고 |
|----|------|-----------|------|
| `useUpdateDraftOrderCustomer` | draft-orders.tsx:1222 | `customer_id`, `email` only | Medusa v2 — body에 `metadata` 없으면 기존 metadata 무변경 ✓ |

카트 아이템 수정(`updateItem`)은 라인아이템 단위이므로 draft order metadata 미영향.

**결론**: metadata replace 방식(Medusa v2)에서 `stock_location_id` 가 지워지는 경로 없음.

---

## 체크 3 · CI 결과

```
assertions    pass   1m30s
flow-tests    pass     57s
lint          pass     58s
playwright    pass   5m52s   ← 미실행 주장 → 실제 PASS 확인
heavy-cloud   skip
route         pass      8s (×2)
```

PR 본문이 "playwright 미실행" 으로 기재했으나 CI playwright 잡이 **5분 52초 PASS** 로 실행·완료됨.

---

## 종합

| 항목 | 결과 |
|------|------|
| 새 주문 경로 stock_location_id | ✅ 포함 |
| 복구 경로 stock_location_id | ✅ 포함 |
| 추가 `draftOrder.create` 호출부 | ✅ 없음 |
| stamp update 병합 (pos_order_num + stock_location_id) | ✅ 병합 |
| complete update spread 패턴 | ✅ 보존 |
| customer update metadata 무영향 | ✅ 미전송 |
| 매장 미선택 회귀 0 | ✅ metadata undefined |
| CI 전 잡 | ✅ 초록 (playwright PASS) |

**APPROVE** — 요구사항 3항 모두 충족.
