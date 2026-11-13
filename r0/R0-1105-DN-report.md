# R0-1105-DN — storeport #241 리뷰 보고서

**판정: APPROVE**

head SHA: `f2006068b1e00f928de147b7a54bbb6324a8e690` · mergeableState: CLEAN

---

## 판정 근거 (파일:줄)

### REQ1 — webhook.ts `jsonb_exists` 치환

- `jsonb_exists(jsonb, text)` 는 PostgreSQL 9.4+ 에서 `?` 연산자의 함수형 별칭 — 의미 완전 동일.
- CAS 멱등 보존: `NOT jsonb_exists(coalesce(data, '{}'::jsonb), 'webhook_claim')` 조건 불변. `webhook.ts:273`
- 바인딩 개수:
  - `claimWebhookCapture`: `?::jsonb`, `= ?` → 2 슬롯, bindings 2개 ✓ (`webhook.ts:270-276`)
  - `releaseWebhookClaim`: `= ?` → 1 슬롯, bindings 1개 ✓ (`webhook.ts:289-292`)
- storeport 전체 JSONB `?` 잔존: 실 SQL 0건 (PR 본문 §(e) 표 확인).

### REQ2 — 돈 경로 결론 (가장 중요)

**돈 경로 안전.** `webhook_claim` 은 `claimWebhookCapture` 가 DB 에 원자 SET 하는 서버 측 값. `authorizePayment` 의 `input.data` 는 Medusa payment-module 이 DB 에서 직접 읽어 주입 — 외부 클라이언트가 HTTP 요청으로 주입할 경로 없음. 웹훅 없이 CAPTURED 로 넘어가는 경로 없음. (`xendit-qris-provider.ts:160-185`)

### REQ3 — webhook route order 역추적

`order_payment_collection` 링크 엔티티 직접 조회 패턴이 `qris-regenerate` · `repair-dangling-payment-links` 와 일치. 종전 Medusa v2 미지원 역방향 필터가 non-fatal catch 로 삼켜져 receipt_id=null 이 된 원인 해소. (`route.ts:332-368`)

### REQ4 — 테스트 · CI

| 항목 | 결과 |
|---|---|
| `#BM-a2` `it.failing` → `it` | ✓ PASS |
| `#BM-e2` `it.failing` → `it` | ✓ PASS |
| `pos-integration` CI | SUCCESS · 118/118 |
| `unit-commerce-core` CI | SUCCESS · 132/132 |
| `markers-and-forbidden` | SUCCESS |
| `feature-map-check` | SUCCESS |

QRIS 환불 경로: 변경 파일 중 환불 관련 코드 없음. `releaseWebhookClaim` 논리 불변 — 기존 refund 테스트 영향 없음.

---

## 주의

- `apps/wing` typecheck React 19 type incompat (`components/ui/button.tsx:50`) — origin/main 에도 동일 실패. 본 PR 변경과 무관(pre-existing).

---

PR 코멘트: https://github.com/CuriocityDevAi/storeport/pull/241#issuecomment-6841318574
