#365 APPROVE · 같은 누락 다른 route 2곳 (M0-1117-N 범위 외 · 수정 별도)

## REQ 1 — 수정 정확도 판정

**정확하다.**

Medusa v2 remote query 에서 `items.quantity` 는 계산(computed) 필드이며, 같은
요청에 `items.detail.quantity` 가 없으면 undefined 로 반환된다.
M0-1117-N (8d69bc3) 에서 `fulfill/route.ts` 의 fetchFields 를 `items.*` →
개별 항목 열거로 좁히는 과정에서 `items.detail.quantity` 가 누락됐다.
결과: `items[i].quantity === undefined` → `Number(undefined ?? 0) = 0` →
"no items to fulfill" 400 회귀.
PR 의 한 줄 추가(`"items.detail.quantity"`)는 뿌리를 정확히 해소한다.

**M0-1117-N 범위 (commit 8d69bc3)**: `fulfill/route.ts` 한 파일만 변경.
따라서 M0-1117-N 에서 좁힌 다른 route 에서 같은 누락은 **0곳**.

## REQ 2 — 로컬 spec 2종 실행 결과

PR 브랜치 `fix/M0-1118-E-pos-it-green` 의 fix (`items.detail.quantity` 추가)
를 로컬에 적용 후 실행.

| spec | 결과 | 시간 |
|------|------|------|
| open-order-reservations | **5/5 PASS** | 30.6 s |
| void-refund-restock | **6/6 PASS** | 19.0 s |

수정 전 `open-order-reservations #5 complete_order` 가 400 으로 실패하는 것을
로컬에서 직접 확인 → PR fix 적용 후 초록 전환 확인.

## REQ 3 — 판정

**APPROVE**

---

### 별도 목록 — `items.quantity` 있고 `items.detail.quantity` 없는 다른 route 2곳

> M0-1117-N 범위 밖. 수정은 별도 티켓으로.

| 파일 | 라인 | 실제 운영 영향 |
|------|------|----------------|
| `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-cancel.ts` | 116 | **없음** — `items.quantity` 를 fetchFields 에 포함하지만 함수 내에서 `order.items[*].quantity` 를 직접 읽지 않음(fulfillment items 의 `fi.quantity` 만 사용). 사실상 dead fetch. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts` | 268 | **있음(잠재)** — M0-1117-L (c8df655) 에서 추가된 QRIS 선행 환불 금액 사전 계산 경로(`oriQty = Number(ori.quantity ?? 0)`)가 이 값을 읽음. `items.detail.quantity` 누락 시 oriQty = 0 → share = 0 → refundAmount = 0 으로 조용히 오산. QRIS return 경로 한정. |

이 두 파일은 M0-1117-N 커밋과 무관하므로 본 PR 범위 밖이다.
