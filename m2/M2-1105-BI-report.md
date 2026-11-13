# M2-1105-BI Report

**PR**: https://github.com/CuriocityDevAi/storeport/pull/244 (draft · base main)

## 변경 파일 (docs 만)

```
docs/runbooks/qris-test-simulation.md |   4 +-
docs/runbooks/xendit-webhook-setup.md | 110 ++++++++++++++++++++++++++++++++++
2 files changed, 112 insertions(+), 2 deletions(-)
```

## 웹훅 칸 필수/선택 근거 (코드 파일:줄)

| Xendit 칸 | 판정 | 코드 근거 |
|-----------|------|-----------|
| V3 Payment Status (`payment.capture` · `payment.failure`) | **필수** | `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts:153,170` |
| Unified Refunds (`refund.succeeded` · `refund.failed`) | **필수** | `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:106` |
| V2 Payment Succeeded/Failed | 선택 (레거시 compat) | `webhook.ts:154,171` — 비공식 legacy 이벤트명, V3 `payment.capture` 로 대체됨 |
| V2 Captured Succeeded/Failed | 불필요 | 코드 미사용 (수동 2-step capture 전용) |

## git diff --stat origin/main

```
docs/runbooks/qris-test-simulation.md |   4 +-
docs/runbooks/xendit-webhook-setup.md | 110 ++++++++++++++++++++++++++++++++++
2 files changed, 112 insertions(+), 2 deletions(-)
```
