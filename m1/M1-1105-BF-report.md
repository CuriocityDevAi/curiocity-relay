# M1-1105-BF Report

## 결과: PASS 4/4

Playwright E2E 흐름 테스트 — Expo web + network intercept.

## 테스트 결과

| 테스트 | 결과 |
|--------|------|
| Flow 1: cash tender 완료 후 success 화면에 QR 블록 존재 | ✅ PASS |
| Flow 1: success 화면에 "Payment successful" 타이틀 존재 | ✅ PASS |
| Flow 2: split 1차 금액 입력 필드가 inputMode=numeric 을 사용 | ✅ PASS |
| Flow 2: Cash→Card split 완료 후 success QR 확인 | ✅ PASS |

## 주요 구현

- `playwright.config.ts`: `dist/` 정적 빌드를 `serve -l 4321 --single`로 제공
- `e2e/helpers/api-mocks.ts`: LIFO 순서 준수한 route intercept + `seedAuth` localStorage 시드
- `navigateTo()` 헬퍼: `Stack.Protected` guard 우회 — root→/products 대기 후 History API 클라이언트 푸시
- `e2e/flows/01-cash-sale-receipt.spec.ts`: Flow 1 현금 판매 QR
- `e2e/flows/02-split-cash-card.spec.ts`: Flow 2 Split Cash→Card

## 스크린샷

- `e2e/screenshots/01-cash-receipt-qr.png`
- `e2e/screenshots/01-cash-success-title.png`
- `e2e/screenshots/02-split-step1.png`
- `e2e/screenshots/02-split-step2.png`
- `e2e/screenshots/02-split-success-qr.png`

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/107 (base: test/m1-1105-be-flow-e2e)
