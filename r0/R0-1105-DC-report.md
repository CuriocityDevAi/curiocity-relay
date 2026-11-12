# R0-1105-DC Report — storeport #233 재리뷰 (M1-1105-BK · Xendit 자격증명 단일 해석기)

## 판정

**CHANGES** — REQ 4(충돌) 미해소: PR 브랜치가 b5d9092(#234) 변경사항 2개를 누락.  
REQ 1-3은 전항목 통과.

## 검증 표

| REQ | 항목 | 판정 | 근거 |
|-----|------|------|------|
| 1 | 자격증명 단일화 — 모든 경로가 `resolveXenditCreds` 사용 | ✓ PASS | 아래 경로표 참조 |
| 2 | 운영 회귀 없음 — env fallback(`XENDIT_WEBHOOK_TOKEN`) 경로 보존 | ✓ PASS | 12개 webhook-route 테스트 통과 |
| 3 | 복호화 경고 로그 · POS_SECRETS_KEY 우선 · Admin 재입력 | ✓ PASS | xendit-creds.ts 직접 확인 |
| 4 | main(b5d9092) 충돌 없음 | ✗ FAIL | webhook.ts · refund/route.ts 2파일 diverged |
| 5 | PR 코멘트 | — | 별도 게시 |

---

## REQ 1 — 경로표

| 호출부 | 사용 함수 | 경로 |
|--------|-----------|------|
| `tenders/route.ts` → `pp_xendit_qris_default` | `xendit-qris-provider.ts::resolveCreds()` → `resolveXenditCreds` | ✓ |
| `api/hooks/payment/xendit/route.ts` (webhook) | `resolveXenditCreds` 직접 | ✓ |
| `api/admin/pos/_shared/xendit-refund.ts` | `resolveXenditCreds` 직접 | ✓ |
| `orders/[id]/qris-status/route.ts` → `provider.getPaymentStatus` | `xendit-qris-provider.ts::resolveCreds()` → `resolveXenditCreds` | ✓ |
| `orders/[id]/qris-regenerate/route.ts` → provider | `xendit-qris-provider.ts::resolveCreds()` → `resolveXenditCreds` | ✓ |
| `payment_xendit/lib/config.ts` | `xendit-creds.ts` re-export | ✓ |

`git grep XENDIT_SECRET_KEY|XENDIT_API_KEY|XENDIT_WEBHOOK_TOKEN FETCH_HEAD -- '*.ts'`  
→ 프로덕션 코드 직접 참조 0건(테스트·주석 제외).  
우선순위: store 암호화 → `XENDIT_API_KEY` → `XENDIT_SECRET_KEY` ✓

## REQ 2 — 운영 회귀

`resolveXenditCreds(svc)` 호출 시 store 설정 없는 경우 env fallback:
```ts
return {
  secret_key: process.env.XENDIT_API_KEY ?? process.env.XENDIT_SECRET_KEY ?? null,
  webhook_token: process.env.XENDIT_WEBHOOK_TOKEN ?? null,
  ...
};
```
Railway 환경(`XENDIT_SECRET_KEY` + `XENDIT_WEBHOOK_TOKEN` 있음 · 매장 설정 없음)에서도 webhook 200 유지.  
webhook-route.unit.spec.ts 12개 — pos_settings stub 없이 env fallback 경로 명시 검증.

## REQ 3 — 복호화 경고·POS_SECRETS_KEY·Admin 재입력

```ts
// xendit-creds.ts
function deriveKey(): Buffer {
  const secret = process.env.POS_SECRETS_KEY ?? process.env.COOKIE_SECRET;
  ...
}
// 복호화 실패 시:
console.warn("[xendit-creds] decryption failed — re-enter required in Admin");
```
복호화 실패 → `source: "env"` fallback, `buildPublicView`는 `configured: true` + `source: "env"` 반환 → Admin UI "재입력 필요" 시그널.

## REQ 4 — 충돌 상세

```
merge-base(ba52320, origin/main) = ade942a (#205)
```

두 브랜치 모두 ade942a 이후 diverged. `git diff ba52320 origin/main` 결과 b5d9092가 main에만 존재하는 변경:

**A. `src/modules/payment_xendit/lib/webhook.ts`**  
PR 브랜치: M0-1105-BI 적용 없음  
main(b5d9092): 공식 Xendit v3 이벤트명 추가
```
payment.capture  / payment.expiry  / payment.failure
payment_request.expiry
XenditWebhookEvent.data.payment_id 타입 추가
```
머지 시 이 이벤트명 처리 누락 → QRIS 결제 완료 webhook 미인식 위험.

**B. `src/api/admin/pos/orders/[id]/refund/route.ts`**  
PR 브랜치: packed_at 필드 없음, 미출고 cancel+reservation 소거 없음  
main(b5d9092): packed_at → hasShippedFulfillment 보정 + order cancel + reservation 소거(step 1b)  
머지 시 ghost reservation 버그(Admin #81) 재발.

두 파일 모두 ade942a 기준 "both added" 충돌 → GitHub merge 불가.

## 필요 조치

```bash
# PR 브랜치에서
git fetch origin
git rebase origin/main
# webhook.ts · refund/route.ts 충돌 해소(b5d9092 변경 보존)
git push --force-with-lease
```
이후 CI 재실행 확인.

## CI

현재 PR 브랜치 CI: 미트리거 (ba52320 · M1 보고서 동일). 리베이스 후 재확인 필요.
