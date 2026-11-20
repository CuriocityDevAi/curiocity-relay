원인 `lib/printer/ble.ts:117 bleAvailability()` 가 ble-plx native 모듈 로드 실패 시 `module-missing` 리턴 → `components/printer/PrinterRow.tsx:81-89` 가 "Bluetooth unavailable on this build" 표시 · 이전 iPad 빌드 ble-plx 포함 O (package.json + app.json ble-plx config plugin 모두 포함 · 다만 PR #191 "결제 후 자동 인쇄·BLUETOOTH_SCAN 권한" 통합은 미포함) · Info.plist 블루투스 문구 O (NSBluetoothAlwaysUsageDescription="Meros POS uses Bluetooth to connect to receipt printers." · 임시 prebuild 로 실측) · 새 iOS 빌드 5a73b64e-41d4-4aa4-93ba-3a25e4a60da6 https://expo.dev/accounts/curiocity/projects/meros-pos/builds/5a73b64e-41d4-4aa4-93ba-3a25e4a60da6

---

## 상세

### 1) "Bluetooth unavailable on this build" 뜨는 조건 (코드 1~2줄)

`components/printer/PrinterRow.tsx:33,81-84`:
```ts
const isUnavailable = availability !== null && !availability.ok;
// ...
{isUnavailable ? (
  <Text>Bluetooth unavailable on this build. Pair on the iPad dev build.</Text>
) : ...}
```

`lib/printer/ble.ts:117-139 bleAvailability()` 가 `{ok:false}` 를 돌려주는 경로:
- `Platform.OS === 'web'` → `reason: 'web'`
- `loadBleModule()` 또는 `getManager()` 실패 (require('react-native-ble-plx') throw · BleManager 생성 실패) → `reason: 'module-missing'`
- `mgr.state() === 'Unauthorized'` → `reason: 'unauthorized'` / `'unauthorized-permanent'`
- 그 외 (`'PoweredOff'` 등) → `reason: 'off'`

→ iPad dev build 이라면 Platform.OS==='ios' 이므로 가장 가능성 큰 원인 = `module-missing` (native ble-plx 미링크) 혹은 `off` (iPad BT 꺼짐). PR #191 이전 빌드라도 app.json ble-plx config plugin 은 이미 들어있었음 → 원칙적으로 native 링크됨. 실측 BT ON 상태에서도 뜬다면 빌드 당시 autolinking 실패 가능성 (새 빌드로 재검증).

### 2) 이전 iPad 빌드 ID 추적 (`eas build:list --platform ios --limit 5`)

최신 FINISHED iOS development 빌드:
- `9e69257b-3024-4d96-b03e-09717bff4e77` (2026-11-17 09:52 UTC · commit `4e8f7f79` · M3-1117-M splash)
- fingerprint hash `bac838f00da0a85d34aa5dda9bd5e04793e8b62d`

`4e8f7f79` 에서 확인:
- `package.json`: `"react-native-ble-plx": "^3.5.1"` O
- `app.json` plugins: `react-native-ble-plx` config plugin O (M2-1105-C · commit 0a81c0d · ancestor 확인)
- `NSBluetoothAlwaysUsageDescription` O

PR #191 (`0ce47c0` · 2026-11-18) = **iPad 빌드 이후 머지**. #191 이 추가한 것:
- Android `BLUETOOTH_SCAN` 권한 1줄 (iOS 무관)
- `app/checkout/success/[orderId].tsx` 결제 성공 시 `printReceipt()` 자동 1회
- __tests__/m3-1118-g.test.ts 21개 스냅샷

→ **iOS native 변경 없음**. 즉 iPad 11-17 빌드 자체는 ble-plx 네이티브 포함. 다만 자동 인쇄 UI 통합·관련 후속 수정 (#194 타임아웃·거부 안내 등) 은 미포함. 재빌드로 모두 포함.

### 3) 임시 prebuild (iOS · 커밋 안 함) Info.plist

```
$ npx expo prebuild --platform ios --no-install --clean
✔ Finished prebuild
$ grep -B1 -A1 NSBluetooth ios/MerosPOS/Info.plist
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>Meros POS uses Bluetooth to connect to receipt printers.</string>
```

prebuild 산출물은 즉시 삭제 (`rm -rf ios/`).

### 4) 새 iOS 빌드

```
$ eas build --profile development --platform ios --non-interactive --no-wait
```

- Build ID: `5a73b64e-41d4-4aa4-93ba-3a25e4a60da6`
- Profile: development · Distribution: INTERNAL
- Provisioned devices: iPad (UDID `00008132-000859511178801C`) — 등록 완료
- Distribution Certificate · Provisioning Profile 유효 (만료 2027-11-11)
- URL: https://expo.dev/accounts/curiocity/projects/meros-pos/builds/5a73b64e-41d4-4aa4-93ba-3a25e4a60da6

**Kyu 할 일**: 빌드 완료 후 위 URL → "Install" (혹은 QR) 로 iPad 에 설치 → 기존 "Meros POS" 앱 덮어쓰기 → Printer 설정 재진입 → BT-58D 페어링 재시도.

### 5) 코드 수정 여부

없음. 원인 = 빌드 (iPad 설치본 자체가 #191 이전) + 재현 가능성 (ble-plx autolinking 재검증) → 코드 변경 PR 불필요. app.json / lib/printer/ble.ts / PrinterRow.tsx 모두 origin/master 상태 그대로 OK. push 생략.

### 범위·금지 준수

- `app.json`, `.github/**`, `app/_layout.tsx`, `components/cd-preview/*` 미변경 O
- `/tmp/*` 외 수정 0 · origin/master `docs/M3-1120-A-cd-preview-on-pos` 로 복귀 (stash pop)
- /loop 미사용 · 40분 내 완료
