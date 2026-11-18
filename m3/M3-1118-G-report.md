PR #191 · 기존 코드 있음 · BLE 모듈 O · 실패 시 결제 계속 O · Android 권한 O

## 조사 결과
lib/printer/* (BLE·ESC-POS·receipt-escpos·settings 화면) 는 M2에서 완성.
app.json BLUETOOTH_SCAN 누락 + checkout success onReprint stub 연동이 이번 작업.

## 변경
- app.json: BLUETOOTH_SCAN 추가 → prebuild AndroidManifest 확인
- app/checkout/success/[orderId].tsx: printReceipt() 자동 1회 + "Print failed · Retry" 버튼
- __tests__/m3-1118-g.test.ts: 21개 unit (ESC/POS 스냅샷 · 결제 흐름 차단 금지)

## 선택지 & 권장안
- 권한 추가: BLUETOOTH_SCAN 단독 추가 (기존 BLUETOOTH/ADMIN/CONNECT 보존) → Android 12+ 대응
- 자동인쇄 위치: useEffect(receiptQuery.data 변경 감지) + hasPrintedRef 중복 방지 → 가장 단순·안전
- 실패 UI: printFailed state → "Print failed · Retry" 버튼 (레이아웃 최소 침범)

## 테스트
vitest 21/21 통과 · tsc 신규 파일 에러 없음 · prebuild BLUETOOTH_SCAN 포함 확인

## 실기 (프린터 도착 후)
Android dev build: npx expo run:android --device
