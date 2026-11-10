# M0-1105-Z Report — Delivery 주문 배송지·받는 사람 연락처 서버 저장·조회 계약

**브랜치**: `feat/m0-1105-z-delivery-address`
**PR**: https://github.com/CuriocityDevAi/storeport/pull/206
**Base**: storeport `main` (8ba49a0 · M0-1105-X)
**Agent**: claude-opus-4-7
**완료 시각**: 2026-11-10

---

## §0 대사표 (코어 vs metadata vs snapshot · 택일 3줄)

| 저장소 | 장점 | 단점 | 역할 |
| --- | --- | --- | --- |
| **코어 `shipping_address`** (Medusa 2) | Admin 주문 상세 자동 표시 (추가 UI 0) · `updateOrderAddresses` merge-update 가능 | 고정 shape (first_name/last_name/phone/address_1/2) · country_code 변경 금지 | **SoT · 1차** |
| **`metadata.delivery`** (현재 M0-1105-T) | stage(#200) 동일 블록 · M3 fixture 그대로 미러 · 자유 shape | Admin UI 자동 표시 X | **운영 state + M3 미러** |
| **receipt `snapshot.delivery`** | 영수증 불변 snapshot | SoT 아님 · 참고용 | **영수증 전용 복제** |

**채택 3줄**:
1. 코어 `shipping_address` SoT (Kyu 09-18 "기존 기능 우선" + Admin UI 자동 표시).
2. `metadata.delivery` 는 stage 운영 상태 + M3 fixture 호환 미러 (shipping_address 접근 없이도 완결).
3. receipt snapshot 에 delivery 블록 복제 (렌더는 M3 · 58mm 32자 고려는 renderer 몫).

**매핑**: `recipient_name` → `first_name` (last_name=null · 인니 성 분리 X) · `phone` → `phone` · `address_lines[0]` → `address_1` · `address_lines[1..]` → `address_2` (`\n` join) · `country_code` 는 초기값 유지 (변경 금지).

---

## 변경 파일 (파일 주인 준수)

```
apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts       +218 -0
apps/commerce-core/src/api/admin/pos/orders/[id]/route.ts               +31  -0
apps/commerce-core/src/modules/receipt/service.ts                       +10  -0
apps/commerce-core/integration-tests/pos/tenders.spec.ts                +282 -1
apps/commerce-core/integration-tests/pos/fixtures/m0-1105-z-delivery.*.json (NEW · 3개)
```

**금지 준수**:
- `src/api/admin/pos/orders/[id]/fulfill/**` 미건드림 (#205 · M0-1105-Y 범위).
- `medusa-config.ts` 변경 0 · providers 코드 미건드림.

---

## 요청 fixture (M3 그대로 사용 · 규칙 ⓑ)

```json
{
  "provider_id": "pp_cash_default",
  "order_type": "delivery",
  "input": { "received_amount": 150000 },
  "delivery": {
    "recipient_name": "Siti Rahmawati",
    "phone": "+628111222333",
    "address_lines": [
      "Jl. Sudirman Kav. 25",
      "Apartemen Taman Rasuna Tower 3 Lt. 12",
      "Jakarta Selatan 12960"
    ],
    "note": "Simpan di meja resepsionis"
  }
}
```

## 응답 fixture (GET /admin/pos/orders/:id)

```json
{
  "order": {
    "shipping_address": {
      "first_name": "Siti Rahmawati",
      "last_name": null,
      "phone": "+628111222333",
      "address_1": "Jl. Sudirman Kav. 25",
      "address_2": "Apartemen Taman Rasuna Tower 3 Lt. 12\nJakarta Selatan 12960",
      "country_code": "id"
    },
    "metadata": {
      "order_type": "delivery",
      "delivery": {
        "recipient_name": "Siti Rahmawati",
        "phone": "+628111222333",
        "address_lines": [ "..." ],
        "note": "Simpan di meja resepsionis",
        "stage": "awaiting_dispatch",
        "awaiting_dispatch_at": "2026-11-10T..."
      }
    }
  },
  "delivery": {
    "recipient_name": "Siti Rahmawati",
    "phone": "+628111222333",
    "address_lines": [ "..." ],
    "note": "Simpan di meja resepsionis",
    "stage": "awaiting_dispatch",
    "awaiting_dispatch_at": "2026-11-10T...",
    "dispatched_at": null
  }
}
```

Fixture 3종 전체: `apps/commerce-core/integration-tests/pos/fixtures/m0-1105-z-delivery.*.json`.

---

## Validation (English 400 · ADDENDUM §2)

| 조건 | 응답 |
| --- | --- |
| `order_type='delivery'` + `body.delivery` 누락 | `400 delivery is required for order_type='delivery' …` |
| `delivery.recipient_name` 누락/빈문자 | `400 delivery.recipient_name is required …` |
| `delivery.phone` 형식 불량 | `400 delivery.phone must be a valid phone number …` |
| `delivery.address_lines` 빈 배열 또는 >6 | `400 delivery.address_lines must contain between 1 and 6 …` |

phone 규칙: `+62…` / `0…` / 숫자 8~15 자리 (공백·하이픈·괄호 strip).

---

## 통합 테스트 (로컬 DB 미기동 → CI 실측 위임)

신규 (파일 `integration-tests/pos/tenders.spec.ts`):
- `#44` delivery · body 저장: shipping_address 미러 + metadata.delivery (stage=awaiting_dispatch) + GET 응답 delivery 블록 + 영수증 snapshot delivery 블록.
- `#45` delivery · body.delivery 누락 → 400 · paymentCollection 0건 (orphan 가드).
- `#45a` recipient_name 누락 → 400.
- `#45b` phone 형식 불량 → 400.
- `#45c` address_lines 빈 배열 → 400.
- `#46` takeaway + body.delivery 동반 → 무시 (metadata.delivery 생성 X · 회귀 0).

갱신:
- `#26 [M0-1105-T · Z]` delivery body 필수 포함하도록 수정 (Z 계약).

**Local 실측**:
- `pnpm --filter commerce-core test` — 24/24 pass (unit · receipt-snapshot 포함).
- `pnpm --filter commerce-core typecheck` — 0 errors.
- `bash scripts/naming-check.sh` — PASS.
- Integration (PG+Redis 필요) — CI 에 위임 · PR #206 (https://github.com/CuriocityDevAi/storeport/pull/206).

---

## Fulfill 접근 키 (문서화 · #205 범위 아님)

Fulfill 라우트가 delivery 블록을 읽는 키:
- `order.metadata.delivery.recipient_name` / `.phone` / `.address_lines` — Fulfill 쪽이 shipping_address 대신 metadata 를 바로 읽어도 되는 미러.
- `order.metadata.delivery.stage` — M0-1105-T 가 이미 쓰는 키 (`awaiting_dispatch` → `dispatched`).
- `order.shipping_address.{first_name, phone, address_1, address_2}` — 코어 SoT (Admin UI).

**fulfill 쪽 변경 0건** (#205 범위) · 위 키들이 이미 스키마 일치.

---

## 다음 단계

- CI 통과 확인 후 T0 에 "착지: `feat/m0-1105-z-delivery-address`" 요청.
- M3 (앱 Checkout) 구현 시 위 request fixture 그대로 사용.
