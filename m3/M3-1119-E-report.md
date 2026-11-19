fork PR #204 · 넓은 창 220 유지 O · 좁은 창 화면 안 O · 스크린샷 3 · lint/assertions O

## 변경 내용
- `app/checkout/tender-qris/[draftOrderId].tsx`
  - `useWindowDimensions` import 추가
  - `qrSize = Math.max(160, Math.min(220, windowWidth - 48))` 계산
  - `SvgXml width/height`, fallback View `style` 를 `qrSize` 로 교체 (Tailwind h-[220px] w-[220px] 제거)

## 검증
- 1194px: qrSize = Math.min(220, 1146) = 220 → 기존과 동일 ✓
- 507px: qrSize = Math.min(220, 459) = 220 → 507-48=459 > 220 이므로 여전히 220 ✓ (여백 충분)
- 400px: qrSize = Math.max(160, Math.min(220, 352)) = 220 → 하한 160 유지 ✓
  (실제 400-48=352 > 220 → 220. 268px 미만이어야 하한 발동)
- Playwright 3/3 passed: 각 뷰포트에서 container bounding box 화면 안 + SVG 크기 어설션
- vitest 763 passed
- ESLint 0 errors
