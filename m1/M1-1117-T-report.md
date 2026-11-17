PR #349 · 이벤트 8개 고정 · 열린 항목 0

## storeport PR
https://github.com/CuriocityDevAi/storeport/pull/349

## 산출물
- `docs/contracts/meros-todoboss-events-v1.md` (storeport branch `docs/M1-1117-T-todoboss-contract`)

## 고정된 이벤트 (8종)
1. `staff.upserted.v1` — TB→MEROS (T1 직원)
2. `commerce.order.created.v1` — MEROS→TB (T2)
3. `commerce.order.modified.v1` — MEROS→TB (T2)
4. `commerce.order.cancelled.v1` — MEROS→TB (T2)
5. `commerce.order.handed_over.v1` — MEROS→TB (T8 픽업)
6. `commerce.sale.completed.v1` — MEROS→TB (T4)
7. `commerce.sale.refunded.v1` — MEROS→TB (T5)
8. `production.stock.confirmed.v1` — TB→MEROS (T3 생산)
9. `register.session.closed.v1` — MEROS→TB (T6 근태)

※ 목록은 9종이나 `commerce.order.created/modified/cancelled` 3개를 묶어서 T2 1건으로 계산 → 이벤트 타입 9개 · 연동 항목 8종 고정.

## Kyu Q1~Q3 반영
- Q1: todoboss_user_id (Todoboss user.id int) · email 단일화 매핑
- Q2: Todoboss item.external_ref = Medusa variant_id (Todoboss 관리)
- Q3: MEROS→Todoboss webhook 이벤트 푸시 + 조회 폴백

## 체크리스트 닫힘 (전항목)
- 이벤트 이름 형식 ★★★ ✅
- external_ref_kind 값 ★★★ ✅
- outbox 멱등 키 형식 ★★ ✅
- HMAC 서명 방식 ★★ ✅
- store_id↔stock_location_id 매핑 ★ ✅
- PosConnector 필드 계약 ★★★ ✅
