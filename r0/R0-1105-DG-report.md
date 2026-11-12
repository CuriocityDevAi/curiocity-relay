# R0-1105-DG 리뷰 리포트

**판정: APPROVE**  
**PR**: CuriocityDevAi/storeport#236  
**head SHA**: `fd017bbc0660c38e81c2d84f9370a67a1b37124a`

---

## REQ 1 · qris-simulate/route.ts — findSessionByXenditRefs + provider_id 검사 ✅

- `findSessionByXenditRefs(pg, payment_request_id, "")` — webhook 과 동일 JSONB 직조회 (`data->>'payment_request_id'`).
- `sessionProviderId !== "pp_xendit_qris_default"` → 400 (QRIS 전용 허용).
- `sessionOrderId !== order_id` → 400 `payment_request_mismatch` (다른 주문 세션 거부).

## REQ 2 · webhook.ts:214,236 — provider_id 추가가 웹훅 경로에 영향 없음 ✅

- `XenditSessionRow` 타입에 `provider_id?: string | null` 추가 (L214) — 기존 webhook 핸들러가 미소비, 동작 불변.
- SELECT 에 `provider_id` 컬럼 추가 (L236) — 조회 범위 확장만; webhook 경로 로직 변경 없음.
- `webhook-route.unit.spec.ts` 는 `pos_settings` mock 추가(`resolveXenditCreds` DI) 로만 갱신, 기존 케이스 그대로 통과.

## REQ 3 · SQL 파라미터 바인딩 ✅

`pg.raw(sql, [paymentRequestId, referenceId, referenceId])` — `?` 플레이스홀더 바인딩, 문자열 조립 없음.

## REQ 4 · CI runs head SHA 일치 ✅

| Run ID | Workflow | Status | headSha |
|---|---|---|---|
| 43277250204 | feature-map-check | ✅ passed | fd017bb |
| 43277250268 | ci (unit + pos-integration) | ✅ passed | fd017bb |

두 런 모두 `fd017bbc0660c38e81c2d84f9370a67a1b37124a` 일치.

---

PR 코멘트: https://github.com/CuriocityDevAi/storeport/pull/236#issuecomment-6832774906
