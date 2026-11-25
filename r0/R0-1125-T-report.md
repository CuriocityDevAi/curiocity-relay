#259 APPROVE · #258 APPROVE

## 검증 표

| 항목 | 결과 |
|------|------|
| oneshot → pos-quote 단독 무효화 (`useAddToDraftOrder`) | ✅ |
| oneshot → pos-quote 단독 무효화 (`useUpdateDraftOrderItem`) | ✅ |
| 비oneshot → `invalidateDraftAndQuote` (draft-order + pos-quote) | ✅ |
| 테스트: `MutationObserver` + 실제 `QueryClient` (직접 헬퍼 호출 아님) | ✅ |
| 신규 테스트 7/7 passed | ✅ |
| CI (#259): route / assertions / flow-tests / playwright 모두 SUCCESS | ✅ |
| CI (#258): route / assertions / flow-tests / playwright / lint 모두 SUCCESS | ✅ |

## master 합친 뒤 vitest 결과

| 대상 | 결과 |
|------|------|
| origin/master → feat/M1-1125-I(#258) | Auto-merging, 충돌 없음 → **81/81 passed** |
| origin/master → feat/M1-1125-K(#259) | Auto-merging, 충돌 없음 → **81/81 passed** |
| 실패 2파일(m2-1119-s · m3-1119-o) | master 머지 후 소멸 ✅ |

## 충돌 여부

- `#258` → `master` 머지: 무충돌 (ort auto-merge). `draft-orders.tsx`, `CartPanel.tsx`, `success/[orderId].tsx` 모두 자동 해결.
- 머지 순서 권장: **#259 → feat/M1-1125-I 브랜치** 먼저, 그 다음 **feat/M1-1125-I(#258) → master**.

## 액션

- #259: APPROVE 코멘트 추가 (자신의 PR APPROVE 불가로 코멘트 대체)
- #258: APPROVE 코멘트 추가 + CHANGES 스레드 resolve (`PRRT_kwDOTtbGC867vMq0` → isResolved: true)
