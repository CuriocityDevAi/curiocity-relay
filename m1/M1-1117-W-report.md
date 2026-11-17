PR #353 · NET 환불 IT 3건 작성 · 발견 버그 1건

## 결과 요약

| 항목 | 내용 |
|------|------|
| PR | https://github.com/CuriocityDevAi/storeport/pull/353 (초안) |
| 브랜치 | test/M1-1117-W-net-refund-it (origin/main 기반) |
| 추가 파일 | `apps/commerce-core/integration-tests/pos/net-refund-preview-small.spec.ts` |
| 테스트 통과 | 0건 (pre-existing 버그로 bootstrap 실패 — 아래 BUG-1 참조) |
| 발견 버그 | 1건 |

## 커버 시나리오 (3건)

| # | 시나리오 | 기댓값 |
|---|---------|--------|
| W-1 | 미회수 800pt 주문 → preview=true → confirmed | 200 · net=99200 · preview_ref 16hex · original=100000 |
| W-2 | preview 뒤 잔액 100pt 추가 차감 → confirmed | 409 `preview_stale` · new_preview.shortfall=900 · 환불 레코드 0 |
| W-3 | confirmed + preview_ref 누락 | 400 |

## 발견 버그

**BUG-1** `src/workflows/pos-refund/workflow.ts:83`

```
input.matched.find((m) => m.tender.method === "qris")?.pack.payment_id
```

`createWorkflow` 함수 바디 안에서 `input.matched.find(...)` 를 직접 호출.
Medusa Workflows SDK definition time 에 `input` 은 context proxy — 배열 메서드가 아닌 proxy trap 으로 처리되어 `TypeError: input.matched.find is not a function`.
결과: Medusa 서버 bootstrap 실패 → 모든 refund IT `api.post is not a function` 연쇄 실패.
수정: `transform(() => ...)` 또는 별도 step 내부로 이동 필요.

## 실행 로그 발췌

```
TypeError: input.matched.find is not a function
  at Object.find (src/workflows/pos-refund/workflow.ts:83:21)
  at createWorkflow (.../workflows-sdk/.../create-workflow.ts:170:33)
  ...bootstrapApp...
Tests: 3 failed (bootstrap error), 3 total
```

## 작업 메모

- `storeport-m1-U` 의 `net-refund-preview.spec.ts` (5건) → 핵심 2건+optional 1건으로 압축
- 시드 헬퍼 `seedOrderWithDebt` 인라인 (별도 파일 불필요)
- PIN 계산 로직은 M1-1117-U 패턴 그대로 사용
