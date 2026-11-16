#291 경로 · #293 필터 · 로컬 검증

## #291 — customer-display-api.ts 경로 수정

| 항목 | 변경 |
|---|---|
| `applyDraft` 경로 | `POST /settings/draft/apply` → `PUT /settings/draft` → `POST /settings/apply` (draft 저장 후 apply 순서) |
| `discardDraft` 경로 | `POST /settings/draft/discard` → `POST /settings/discard` |
| `saveDraft` 추가 | `PUT /settings/draft` — 초안만 저장, apply 없음 |
| `fetchDraftPreview` 추가 | `GET /settings/preview?view=draft&as_of=` (404 시 `fetchCdSettings` fallback) |

**fallback 유지**: 서버에 draft API 없으면(404) 기존 `PUT /settings` 직통.

커밋: `663c0eb` · push → `origin/feat/m1-1116-d-customer-display-admin`

---

## #293 — 취소 주문 제외

| 항목 | 변경 |
|---|---|
| `filters` | `{ customer_id }` → `{ customer_id, status: ["completed", "returned"] }` — canceled 제외 |
| `refund_amount` | query fields 추가 → returned 주문 net = `max(0, total − refund_amount)` |
| 위젯 소제목 | `"완료·환불 주문 기준 · 취소 주문 제외"` xsmall 텍스트 추가 |
| T5 테스트 | 취소 주문 1건 → `visit_count=1`(완료 주문만) · `orders[0].id = completedId` 검증 |
| 리뷰 스레드 | `PRRT_kwDOTe-UYs63vS7C` resolve 완료 |

커밋: `739471d` · push → `origin/feat/m1-1116-e-customer-loyalty-detail`

---

## 로컬 검증

| 대상 | 결과 |
|---|---|
| typecheck #291 | `tsc --noEmit` exit 0 ✅ |
| typecheck #293 | `tsc --noEmit` exit 0 ✅ |
| unit #291 | 326/326 PASS ✅ |
| unit #293 | 326/326 PASS ✅ |
| integration | TEST_TYPE 분리로 skip (환경 별도 필요) |
