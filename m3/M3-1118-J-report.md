fork PR #194 · 타임아웃 O · 권한 거부 안내 O · 0대 안내 O

## 작업 요약

Branch: fix/M3-1118-J-printer-followup → master
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/194
Commit: 8534750

## REQ 처리 현황

### REQ-1: BLE 타임아웃
- 연결: CONNECT_TIMEOUT_MS 10000 → 8000 (ms), withTimeout() 래퍼 단일화
- 쓰기: WRITE_TIMEOUT_MS = 5000 신규 추가, printBytes() 각 chunk 쓰기에 적용
- 타임아웃 초과 시 cancelConnection() 후 false 반환 (기존 finally 블록 활용)

### REQ-2: 권한 거부 안내
- BLE_ASKED_KEY = 'meros.printer.bleAsked.v1' (SecureStore) 로 첫 사용 여부 추적
- scanForPrinters() 진입 시 BLE_ASKED_KEY = '1' 기록
- bleAvailability(): Unauthorized + 미기록 → 'unauthorized', 기록 있음 → 'unauthorized-permanent'
- printer.tsx:
  - unauthorized → 스캔 버튼 활성 + "Bluetooth permission is required. Tap Scan to grant access."
  - unauthorized-permanent → "Bluetooth permission is off — Settings > Apps > Meros POS > Permissions" + Linking.openSettings() 버튼 (스캔 비활성)

### REQ-3: 0대 안내
- 기존 Alert.alert('No printers found', 'Make sure the printer is powered on and in pairing mode.') 확인 — 별도 추가 불필요

### REQ-4: 단위 테스트
- tests/flows/m3-1118-j-printer.test.ts 신규 (15 tests)
- 범위: 연결 타임아웃 계약, 쓰기 타임아웃 계약, unauthorized 구분 계약, UI 계약, 0대 계약, typecheck exhaustive switch
- 결과: 15/15 passed

## 테스트 로그
```
 RUN  v5.1.0
 Test Files  1 passed (1)
      Tests  15 passed (15)
   Duration  155ms
```

전체 스위트: 11 test files, 178 tests (172 passed | 6 expected fail) — 신규 실패 없음

## 금지 사항 준수
- app/checkout/success/* 미수정
- 결제 훅 미수정
- 서버 미수정
