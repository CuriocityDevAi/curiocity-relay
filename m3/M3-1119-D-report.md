fork PR #203 · 화면 17개 중 깨짐 1 · 권장 방식: 화면별 개별 패치 · 라운드 3개(R1 즉시필수·R2·R3 선택)

## 진단 결과

- **스크린샷**: 8화면 × 2뷰포트 = 16장 촬영 (Playwright + dist/ 정적 빌드)
- **정상**: 15개 화면 — Products(2열 OK), Cart, Orders목록, Cash tender, Register Open/Close, Settings, Settings-Printer
- **경미**: QRIS QR 코드 220px 고정 → 507px 화면에서 43% 차지, 더 좁아지면 여백 소실 위험

## 수정 필요

| 라운드 | 파일 | 작업 | 크기 |
|--------|------|------|------|
| R1 (즉시) | `app/checkout/tender-qris/[draftOrderId].tsx:277` | `w-[220px]` → `Math.min(220, width-48)` 동적 계산 | S |
| R2 (선택) | `components/RegisterBadge.tsx` | 말줄임 현재 OK, 필요시 store name 단축 | S |
| R3 (선택) | `components/receipt/ReceiptCard.tsx` | `maxWidth:420` 현재 OK (< 507), 방어적 명시 | S |

## 핵심 발견

- `useBreakpointValue` 기준: md=768px → 507px은 `base` 폴백 — Products 2열, Orders 1열 (정상)
- 고정px 문제: 썸네일 `w-[5.25rem]`(84px), 라벨 `w-24`(96px) 모두 507px에서 허용 범위
- `maxWidth:420` 컴포넌트들(ReceiptCard, PaymentSlipCard, CapsuleToast) 모두 507px 미만 → 정상
- 공용 레이아웃 리팩토링 불필요 — 개별 패치 충분

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/203
