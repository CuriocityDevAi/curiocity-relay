storeport PR #392 · 좁은 창 8화면 O · 넓은 창 변화 0 O · Split View 허용 O · 앱 재빌드 필요 O · 스크린샷 16장

## 변경 사항
- app.config: orientation "landscape" → "default" (iOS UIRequiresFullScreen=false · Split View 활성화 · 네이티브 재빌드 필요)
- ReceiptScreen: slot/paper 크기 뷰포트 기반 Math.min 처리 (overflow 방지)
- KeypadAfterScreen: 타이머 텍스트 bpFs(bp, 20, 16, 14) 반응형
- e2e/responsive-M1-1119-F.spec.ts: 8화면 × 2뷰포트(1194×834 · 507×834) 스크린샷 + 어서션

## 테스트 결과
- playwright responsive-M1-1119-F: 16/16 passed
- playwright responsive.spec.ts (기존): 27/27 passed (회귀 없음)
- vitest: 195/195 passed
