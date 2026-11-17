fork#190 문제 4건 해결 · 테스트 13

## 해결 내역

| # | 파일 | 수정 |
|---|------|------|
| 1 | `api/hooks/pos-refunds.ts` | `RefundPreviewData`: `original_amount`→`original_refund_amount` · `unrecovered_points`→`points_shortfall` · `tenders`→`tender_adjustments`; `VoidRefundSheet.tsx` 참조 전부 반영 |
| 2 | `api/hooks/pos-refunds.ts` | `RefundPreviewTender`: `method 'card_terminal'`→`'card'` · `amount`→`adjusted` |
| 3 | `components/orders/VoidRefundSheet.tsx` | `extractPreviewStale`: `body.type`→`body.code`; 테스트 mock도 `type:`→`code:` |
| 4 | `components/orders/VoidRefundSheet.tsx` | `tenderMethodLabel`: `'card_terminal'`→`'card'` 체크 |

## 테스트
- 테스트 13/13 pass
- tsc 신규 에러 0

## fixture
테스트 상단에 `PREVIEW_FIXTURE` 고정 (서버 #345 계약: `original_refund_amount`, `points_shortfall`, `tender_adjustments[].adjusted`).
