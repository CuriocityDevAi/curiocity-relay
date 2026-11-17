PR #190 · NET 미리보기 표 · 확인 · 409 재미리보기

## 변경 파일
- `api/hooks/pos-refunds.ts` — `RefundPreviewData`, `RefundPreviewInput`, `useRefundPreview` 추가 · `VoidRefundInput.previewConfirmation` · `useRefundOrder` confirmed 전송
- `components/orders/VoidRefundSheet.tsx` — `'preview'` step · `callPreview` · `onPressPreviewConfirm` · `goBackFromPreview` · NET 표 UI · 409 stale 처리
- `__tests__/m3-1117-v-refund-net-preview.test.ts` — 13개 pure-fn 테스트

## 구현 요약
1. 환불(full) 진행 시 `preview:true` 호출 → `unrecovered_points > 0` 이면 'preview' step으로 전환
2. 미리보기 표: 원결제 금액 · 미회수 포인트(있을 때만) · 환불액 · 수단별 차감 (서버 순서 그대로)
3. `unrecovered_points === 0` → 기존 흐름 유지 (하위 호환)
4. [Confirm] 버튼: `previewConfirming` 상태로 연타 방지 · `confirmed:true + preview_ref + expected_net_refund_amount` 전송
5. 409 `preview_stale` → `new_preview` 로 표 갱신 + "금액이 바뀌었어요, 다시 확인해 주세요" (직접 재시도 아님)
6. tsc 신규 에러 0 · 테스트 13/13 pass

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/190
