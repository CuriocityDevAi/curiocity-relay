PR #340 · 3요청 262ms → 1요청 159ms

## M0-1117-K — POS 장바구니 담기 3요청 → 1요청 (서버)

- **브랜치**: `feat/M0-1117-K-pos-cart-items-oneshot` · origin/main 기준
- **워크트리**: `~/curiocity-live/storeport-wts/M0-1117-K-wt`
- **PR**: https://github.com/CuriocityDevAi/storeport/pull/340
- **M0-1117-J 상태**: PR #334 OPEN (미착지). K 파일 영역 (apps/commerce-core/src/api/admin/pos/draft-orders/[id]/items/\*\*) 과 J (loyalty) 는 완전 분리 → origin/main 위에서 진행.

### 측정 (mock 50ms/workflow + 50ms RTT)
- 기존 3요청 (begin+add+confirm, 클라이언트 왕복 포함): **262ms**
- 신규 1요청 (서버 안 begin→add→confirm): **159ms**
- 절약: **103ms (mock 기준)** · 실 POS iPad WiFi 왕복에서는 **2 RTT 감소**. Kyu 11-17 17:14 실기 2초 대기 = 3 RTT 합 → oneshot 적용 시 1 RTT 로 약 2/3 단축 기대 (실측은 POS 교체 후).
- 기록 파일: `/tmp/M0-1117-K-perf.json`

### 변경 파일
1. `apps/commerce-core/src/api/admin/pos/draft-orders/[id]/items/route.ts` — 신규 POST 핸들러
2. `apps/commerce-core/src/api/admin/pos/draft-orders/[id]/items/__tests__/route.unit.spec.ts` — add/update/remove/leftover 복구/apply 실패 롤백/validation/동시 2요청, 8 PASS
3. `apps/commerce-core/src/api/admin/pos/draft-orders/[id]/items/__tests__/route.perf.unit.spec.ts` — mock 왕복 비교 측정
4. `docs/feature-map.yaml` — `commerce-core.pos-cart-items-oneshot` 프로세스 신설 (기존 `split-pending-orders` 글롭은 `route.ts` 로 좁힘)

### POS 클라이언트 교체 프롬프트 근거 — 응답 JSON 예시
```json
{
  "draft_order": {
    "id": "order_01JXXX",
    "display_id": 182,
    "currency_code": "idr",
    "subtotal": 42000,
    "tax_total": 4620,
    "total": 46620,
    "discount_total": 0,
    "shipping_total": 0,
    "items": [
      {
        "id": "orli_01JXXX",
        "variant_id": "variant_01JXXX",
        "title": "Croissant Classic",
        "quantity": 2,
        "unit_price": 21000,
        "subtotal": 42000,
        "tax_total": 4620,
        "total": 46620
      }
    ]
  },
  "elapsed_ms": 159
}
```

POS 는 지금처럼 수동 begin + addItem + confirm 을 호출하는 대신 한 번의 `POST /admin/pos/draft-orders/:id/items` 로 `add`, 필요 시 `update`, `remove` 를 한꺼번에 보내면 된다. body:
```json
{ "add": [{ "variant_id": "variant_01JXXX", "quantity": 1 }] }
```

### 운영 유의
- `remove` 는 draft-order edit workflow 가 persist 된 라인의 "삭제" 를 노출하지 않아 `updateDraftOrderItemWorkflow({ items: [{ id, quantity: 0 }] })` 로 표현. 라인 row 자체가 사라지지 않을 수 있으나 카트 합계는 0 으로 계산 — POS UI 상 사라진 것처럼 보임. 필요 시 후속 티켓에서 완전 삭제 플로우 도입.
- Leftover edit 세션 복구: begin 실패 메시지가 `already/pending/existing/in-progress/order_change` 중 하나를 포함하면 cancel 후 1회 재시도. #182 에서 보인 400 의 구조적 원인과 동일한 경로.
- 롤백: apply 중간 또는 confirm 중 실패하면 cancel 을 best-effort 로 실행 (실패해도 400 오류 메시지 유지).

### 권장안 (단일 선택지)
서버 PR #340 머지 (T0 착지 대기) → 별도 **M0-1117-L** (가칭) 발부해 POS 클라이언트 (apps/anchor 또는 agilo-medusa-pos-fork `api/hooks/draft-orders.tsx`) 가 기존 3 fetch 를 이 신규 엔드포인트 1 fetch 로 교체. 기존 Medusa 코어 라우트 3종은 그대로 두고 신규 엔드포인트만 쓰도록 바꿔 롤백 쉽게 유지.

### PR 본문 3줄
1. POS 담기 2초 원인 = begin + add + confirm 3 HTTP 왕복. 신규 `POST /admin/pos/draft-orders/:id/items` 가 서버 안에서 셋을 묶어 1 요청으로 처리 · leftover 세션은 cancel 후 begin 재시도.
2. body = `{ add?, update?, remove? }` · 응답 = 계산 끝난 draft order 전체 + `elapsed_ms` · 실패 시 cancel 롤백 · 직접 SQL 금지.
3. mock 50ms/workflow 기준 262ms → 159ms (-103ms) · 실 POS 왕복에서는 2 RTT 감소 (약 2/3 단축) · POS 클라이언트 교체는 후속.
