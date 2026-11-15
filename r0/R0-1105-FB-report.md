# R0-1105-FB 리뷰 리포트

fork#144 CHANGES(prettier 미적용 · CI block) · #271 APPROVE · #272 APPROVE · #269 CHANGES(console.log 운영 노출 · feature-map CI fail · pos-integration null.resolve)

## 돌려본 명령 · 로그

```
# fork #144 — worktree: /Users/kyu.lee/projects/pos-m1-ck (fix/m1-1105-ck-qris-ref-overflow)
node scripts/m2-1105-m-receipt-escpos-assertions.mjs
  → 45/45 passed (CK-1a~c · CK-2a~b · CK-3a 포함) ✓

npx vitest run --reporter=verbose
  → Test Files 26 passed · Tests 290 passed | 6 expected fail | 2 todo ✓

gh pr checks 144 -R CuriocityDevAi/agilo-medusa-pos-fork
  → assertions FAIL · lint FAIL · flow-tests PASS · playwright skipping
  
gh run view 43693809843 --log-failed (assertions job)
  → m0-1105-at-receipt-qr-assertions.mjs FAIL: (9) prettier check
     ✗ components/receipt/ReceiptCard.tsx → npx prettier --write 필요
  → m2-1105-m-receipt-escpos-assertions.mjs PASS ✓
  
gh run view 43693809859 --log-failed (lint job)
  → app/checkout/split-tender/[draftOrderId].tsx:69 react-hooks/set-state-in-effect
    (이번 PR 범위 외 기존 이슈)
```

## fork #144 판정: CHANGES

| 항목 | 결과 |
|---|---|
| 화면↔프린터 동일 규칙 | ✓ 양쪽 `length>10 ? '…'+ref.slice(-8) : ref` |
| kv() 멀티바이트·금액 줄 | ✓ reference_no는 ASCII ID, 금액 줄은 kv() 경유 안 함 |
| 화면 긴 토큰 안전망 | ⚠ issuer/approval_code 미처리 (wrap으로 overflow 없음, advisory) |
| 어설션 직접 실행 | ✓ 45/45 |
| vitest | ✓ 290 pass |
| 네이티브 의존 변화 | ✓ 0건 |
| **prettier CI block** | **✗ ReceiptCard.tsx 포맷 필요** |

## #271 판정: APPROVE

| 항목 | 결과 |
|---|---|
| advisory lock → credit 범위 | ✓ work() 내 creditAccounts+updateOrders 커버, trx commit 후 lock 해제 |
| 경쟁 호출 직렬화 | ✓ Call2가 lock 대기 → applied=true 재확인 → 멱등 반환 |
| subscriber payment→order | ✓ payment.captured → order_payment_collection 그래프 링크 |
| pg fallback 운영 위험 | ⚠ null 반환 시 lock 없음, metadata 최후 방어(advisory) |
| CI | ✓ pos-integration PASS · e2e-admin-loyalty PASS |

## #272 판정: APPROVE

| 항목 | 결과 |
|---|---|
| `__DEV__` Redirect 가드 | ✓ `if (!__DEV__) return <Redirect href="/" />` |
| e2e skip 조건 | ✓ `test.skip(!process.env.CD_E2E_DEV)` |
| CI | ✓ markers-and-forbidden · check · pos-integration · e2e-admin-loyalty PASS |
| customer-display CI | ⚠ #269 미머지로 미실행 (advisory) |

## #269 판정: CHANGES

| 항목 | 결과 |
|---|---|
| matcher `*` | ⚠ `/customer-display-web*` — `*`가 슬래시 포함 여부 불확실, `/**` 권장(advisory) |
| 확장자 404 | ✓ extname 있는 미존재 파일 → null → 404 |
| version.json no-cache | ✓ `file.endsWith("version.json")` 조건 ✓ |
| **console.log 운영 노출** | **✗ 모든 요청 `/customer-display-web` 에 로그 (middlewares.ts)** |
| **CI check FAIL** | **✗ feature-map unmatched 파일 5건** |
| pos-integration | ✗ null.resolve (PR 범위 외, 재실행 필요) |
| customer-display CI | ✓ 자체 PR CI에서 PASS (run 43685848067) |
| loyalty_admin ci.yml | 미검증 (main 직접 대조 미수행) |

## 미검증

- #271: `capturePaymentWorkflow`가 POS tenders / xendit 양쪽에서 `payment.captured` emit 여부 — 소스 직접 미확인 (pos-integration PASS로 간접 확인)
- #269: `loyalty_admin` paths-filter 경로가 main 현재 파일 구조와 일치하는지
