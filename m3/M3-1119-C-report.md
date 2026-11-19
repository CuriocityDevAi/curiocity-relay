fork PR #199 · 영어화 5건 · 가드 범위 app+components O · 위반 0 O · lint/assertions O

## 작업 내용

### 영어화 5건 (master feb3196 에서 완료 · 본 PR 회귀 고정)

| # | 파일 | 변경 전 (한글) | 변경 후 (영어) |
|---|------|--------------|--------------|
| 1 | `app/(tabs)/cart.tsx` | `` `${items}줄` `` | `` `${items}rows` `` (debug console) |
| 2 | `components/payment/CustomerLinkSheet.tsx:141` | 아직 지원 안 됨 | `'Not yet supported'` |
| 3 | `components/payment/CustomerLinkSheet.tsx:165` | 아직 지원 안 됨 | `'Not yet supported'` |
| 4 | `components/payment/CustomerLinkSheet.tsx:272` | 새 고객으로 등록됩니다 | `'Will be registered as new customer'` |
| 5 | `components/orders/VoidRefundSheet.tsx:371` | 금액이 변경되었습니다 | `'Amount changed. Please review again.'` |

### 가드 확장 (m3-1105-c-english-assertions.mjs)

- `walk()`: `.test.` / `.spec.` 파일 제외
- `stripComments()`: `console.*` 콜 제거
- Section (3) 3a~3e: 위 5건 영어화 회귀 assertion 추가

### CI 결과

- lint: 0 errors ✅
- assertions: 10/10 passed (m3-1105-c-english) ✅
- vitest: 763 passed ✅
- playwright: pre-existing failure on master (m1-1105-ao, m3-1105-d) ❌ (범위 밖)
