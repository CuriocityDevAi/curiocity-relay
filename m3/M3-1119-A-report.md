fork #194 · 타임아웃 정리 O · 첫 거부 분류 O · unit 19/19 · checks lint:fail(기존) assertions:fail(기존) flow-tests:pass

## 변경 파일
- `lib/printer/ble.ts`
- `tests/flows/m3-1118-j-printer.test.ts`

## REQ 1 — 연결 타임아웃 정리
- `BleManagerLike` 타입에 `cancelDeviceConnection: (deviceId: string) => Promise<BleDeviceLike>` 추가
- `printBytes` finally 블록에 `mgr.cancelDeviceConnection(printerId)` 무조건 실행 (device null 여부 무관, 에러 삼킴)

## REQ 2 — 첫 권한 거부 오분류 수정
- `scanForPrinters`에서 `setItemAsync(BLE_ASKED_KEY, '1')` 제거 (시스템 프롬프트 전 선점 저장 제거)
- `bleAvailability` Unauthorized 분기: 키 없으면 → 키 저장 후 `unauthorized` 반환 (Scan 활성)
- 키 있으면 → `unauthorized-permanent` 반환

## Unit 테스트
- 기존 15개 → 19개 (신규 4개 추가)
  - REQ-1: `BleManagerLike declares cancelDeviceConnection` / `printBytes calls mgr.cancelDeviceConnection(printerId) in finally`
  - REQ-2: `bleAvailability stores BLE_ASKED_KEY on first Unauthorized detection` / `scanForPrinters no longer sets BLE_ASKED_KEY before scanning`
- 기존 삼항식 assertion → if/else 패턴에 맞게 업데이트 (count 유지)

## typecheck
- lib/printer/ble.ts, tests/flows/m3-1118-j-printer.test.ts 신규 에러 0

## gh pr checks 194 결과
```
assertions  fail   2m55s  (기존 실패: MerosLogo·ReceiptCard·CardTenderPanel — 본 커밋 무관)
lint        fail   1m2s   (기존 실패: BottomSheet.tsx·OptionChip.tsx — 본 커밋 무관)
playwright  skipping
flow-tests  pass   1m9s
```

## 커밋
b5a7e1d  fix(printer): M3-1119-A — 타임아웃 뒤 cancelDeviceConnection · 첫 거부 unauthorized 분류
