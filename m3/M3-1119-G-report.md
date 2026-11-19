fork #205 · lint 0 error O · assertions O · playwright O

## M3-1119-G 완료 요약

- **prettier 수정**: `app/checkout/tender-qris/[draftOrderId].tsx:269` contentContainerStyle 인라인 → 멀티라인 포맷
- **lint**: 0 errors, 60 warnings (기준 이하)
- **vitest assertions**: 768 passed (6 expected fail, 3 todo)
- **playwright**: 4/4 passed (`M3-1119-E-qris-width.spec.ts`)
- **커밋**: `e0cd4d3` fix(qris): M3-1119-G — prettier format contentContainerStyle
- **push**: `--force-with-lease` (rebase 후)
