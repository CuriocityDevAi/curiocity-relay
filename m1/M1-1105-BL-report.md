# M1-1105-BL Report — storeport #233 rebase onto main (b5d9092)

## 판정: DONE

## 충돌 파일 및 채택

| 파일 | 충돌 유형 | 채택 | 비고 |
|------|----------|------|------|
| `src/modules/payment_xendit/lib/webhook.ts` | both-added | **main (b5d9092)** | M0-1105-BI 공식 Xendit v3 이벤트명(`payment.capture` · `payment.failure` · `payment.expiry` · `payment_request.expiry`) + `payment_id` 타입 보존. M1-1105-BJ/BK는 이 파일 미수정. |
| `src/api/admin/pos/orders/[id]/refund/route.ts` | both-added | **main (b5d9092)** | packed_at 미출고 판정 + orderModule.cancel + reservation 소거(step 1b) 보존. M1-1105-BJ/BK는 이 파일 미수정. |

## rebase 상세

- merge-base: `ade942a` → 두 파일 모두 미존재 → both-added 충돌
- 23개 커밋 `skipped` (이미 origin/main에 포함)
- 적용된 커밋: 4개 (M1-1105-BJ × 1 + M1-1105-BK × 3)
- `git diff origin/main --name-only`: webhook.ts · refund/route.ts 모두 diff 없음 → main 로직 완전 보존

## CI

**Run #43263400733** (https://github.com/CuriocityDevAi/storeport/actions/runs/43263400733)

| Job | 결과 |
|-----|------|
| unit-commerce-core | ✅ pass (56s) |
| pos-integration | ✅ pass (3m51s) |
| webhook-route.unit.spec.ts | ✅ pass (122 tests) |
| qris-xendit.unit.spec.ts | ✅ pass |
| qris-xendit-bd.unit.spec.ts | ✅ pass |
| xendit-creds.unit.spec.ts | ✅ pass |
| changes-filter | ✅ pass |
| markers-and-forbidden | ✅ pass |

## PR

- #233 코멘트 게시: https://github.com/CuriocityDevAi/storeport/pull/233#issuecomment-6830061981
- 커밋: `ba52320` → `1da8afe` (force-with-lease)
