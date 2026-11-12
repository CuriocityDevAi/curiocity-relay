# M0-1105-BE · 보고서

원장 대사: decision-qris-20261112 · R0-1105-CS 조건부 APPROVE 조건 7건 전부 반영 완료.

## 커밋
- BC (feat/m0-1105-bc-qris-xendit-server): `06b6ab2` fix(commerce-core): QRIS webhook concurrency + direct lookup + sha256 token (M0-1105-BE · R0-1105-CS)
- BD (feat/m0-1105-bd-qris-xendit-refund-cancel): `053b064` (rebased onto BE · force-with-lease)

## 항목별 처리 (파일:줄 · 커밋 06b6ab2)

| 항목 | 요건 | 파일 | 처리 |
|---|---|---|---|
| REQ1 [필수] | 동시 paid 이중 처리 차단 | `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts:165-247` · `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:234-296` | `webhook_claim` JSONB CAS · capture "already captured" 멱등 처리 · 실패 시 release · 완료 시 mark |
| REQ2 [필수] | 전체 테이블 조회 제거 | `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts:208-224` | `findSessionByXenditRefs` raw SQL · `data->>'payment_request_id'` / `data->>'reference_id'` |
| L1 | sha256 토큰 비교 | `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts:57-73` | 양쪽 sha256 digest 후 `timingSafeEqual` (32 B 고정 길이) |
| L2 | split + QRIS → 400 | `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:379-391` | code=`qris_split_not_supported` |
| L3 | expired/failed · captured 후 덮어쓰지 않음 | `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:194-204` | `alreadyCaptured` 분기 · `updatePaymentSession` 생략 · 200 no-overwrite |
| REQ6 | token env 미설정 → 503 | `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:74-80` | `service_unavailable` · Xendit 재시도로 자동 회복 |
| REQ7 | PR #228 코멘트 + CI | — | PR #228 comment 6821235051 · CI 43200084894 success |

## 동시성 테스트 로그 (jest unit)

```
PASS src/modules/payment_xendit/__tests__/qris-xendit.unit.spec.ts
  webhook DB helpers (M0-1105-BE)
    ✓ REQ2 · findSessionByXenditRefs · data.payment_request_id 직조회 (전체 스캔 없음)
    ✓ REQ1 · claimWebhookCapture · Promise.all 동시 2건 → 한 건만 true
    ✓ REQ1 · releaseWebhookClaim 후 재claim 성공 (capture 실패 복구)
    ✓ REQ1 · markWebhookCompleted 이후 release 가 clear 하지 않음 (double-process 차단)

PASS src/api/hooks/payment/xendit/__tests__/webhook-route.unit.spec.ts
  M0-1105-BE · Xendit webhook 라우트 가드 (8 시나리오)
    ✓ REQ6 · 토큰 env 미설정 → 503
    ✓ REQ5 · expired/failed · 이미 captured → 200 no-overwrite
    ✓ paid · 이미 captured → 200 idempotent (CAS claim 없이)
    (외 4 시나리오)

Test Suites: 9 passed, 9 total
Tests: 97 passed, 97 total (BE 신규 29건 포함)
```

Promise.all 핵심 보장:
```ts
const results = await Promise.all([
  claimWebhookCapture(pg, "payses_cas", "tok-A"),
  claimWebhookCapture(pg, "payses_cas", "tok-B"),
]);
expect(results.filter(Boolean).length).toBe(1);
```

## CI
- ci (43200084894) · success · 3m53s · headSha 06b6ab2
- feature-map-check (43200084886) · success · 15s · headSha 06b6ab2

## BD 브랜치 rebase 여부
완료. `webhook.ts` auto-merge · `hooks/payment/xendit/route.ts` 수동 merge (refund webhook dispatch 를 BE 의 세션 직조회 앞에 삽입). BD 테스트 19건 + BE 신규 29건 모두 green (총 97건).

## PR #228
- comment: https://github.com/CuriocityDevAi/storeport/pull/228#issuecomment-6821235051
