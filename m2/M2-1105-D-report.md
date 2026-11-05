---
round: M2-1105-D
pr:
  fork: agilo-medusa-pos-fork#28
commit: 01e2de6063757cd5bbc500717f54d0f37953809c
outcome: R0-1105-F ⓒ 2건 정리 (dead dep + legacy Peripheral 권한) · 머지 가능
kyu_checks: 0 (dep/plist cleanup · UX 변동 없음)
---

# M2-1105-D · BLE cleanup (dead dep + legacy Peripheral permission)

**일자**: 2026-11-05 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `master = 0a81c0d` (PR #26 머지분)

## 1. R0-1105-F 관찰 → 처리

| # | 관찰 | 처리 |
|---|------|------|
| ① | `@config-plugins/react-native-ble-plx` 가 M2-1105-C 교체 후 미사용 dead-dep | package.json 1 줄 제거 · lock entries 10 줄 regen |
| ② | `app.json ios.infoPlist.NSBluetoothPeripheralUsageDescription` 가 Always 와 중복 (iOS 13+ 공식 deprecated · 플러그인이 Always 만 요구) | app.json 2 줄 제거 |

## 2. 변경 파일 (owner 100%)

| 파일 | 변경 | 라인 |
|------|------|------|
| `package.json` | dep 1 줄 제거 | 1 |
| `package-lock.json` | regen (-10, +0) | 10 |
| `app.json` | infoPlist Peripheral 2 줄 제거 | 2 |

그 외 파일 무수정 (owner 밖 전부 untouched).

## 3. 자동 검증

### 3-A. prebuild 발췌 (`npx expo prebuild --platform ios --no-install --clean`)

tmp 디렉토리 (`/tmp/m2-1105-d-prebuild`) 복사본에서 실행 · 저장소 ios/android 디렉토리 영향 0.

```
- Creating native directory (./ios)
✔ Created native directory
- Updating package.json
✔ Updated package.json | no changes
- Running prebuild
✔ Finished prebuild
```

생성된 `ios/MerosPOS/Info.plist` 의 `NSBluetooth*` 블록:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Meros POS uses Bluetooth to connect to receipt printers.</string>
```

**Peripheral 키 없음** · `react-native-ble-plx` 자체 플러그인이 Always 만 주입 · 중복 해결.

### 3-B. isolated `npm ci --legacy-peer-deps`

```
$ mkdir /tmp/pos-m2-ci-test && cp package.json package-lock.json /tmp/pos-m2-ci-test/
$ cd /tmp/pos-m2-ci-test && npm ci --legacy-peer-deps
...
added 974 packages, and audited 975 packages in 15s
exit 0
```

M2-1105-C 975 → M2-1105-D **974** (`-1` · 정확히 `@config-plugins/react-native-ble-plx` 하나).

### 3-C. 프린터 하네스 재실행 (`scripts/m2-1105-c-settings-playwright.mjs`)

```
--- (ⓐ) Expo web 부팅 + 로그인 플로 ---
  ✓ (1) 로그인 후 /login 이탈
--- (2) /settings 탭 이동 → Printer 행 렌더 ---
  ✓ (2) settingsPrinterRow 렌더
--- (3) 섹션 헤더 "Printer" 노출 ---
  ✓ (3) "Printer" 섹션 헤더 노출
--- (4) "Not paired" 상태 ---
  ✓ (4) "Not paired" 레이블 노출
--- (5) "Test print" 버튼 disabled ---
  ✓ (5a) Test print 버튼 존재
  ✓ (5b) Test print 버튼 disabled (printerId 없음)
--- (6) 에러 집계 ---
  ✓ (6a) pageerror (신규) 0건
  ✓ (6b) console.error (신규) 0건

8/8 passed · 0 failed
```

M2-1105-C 와 동일 · 회귀 없음.

## 4. Kyu 실기

- 변동 없음. dep/plist 정리이므로 UX/권한 다이얼로그는 M2-1105-C 와 동일.
- 다음 EAS dev build 로그에서 `bluetoothPeripheralPermission deprecated` 경고 소멸.

## 5. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/28
- 브랜치: `chore/m2-1105-d-ble-cleanup` · base `master (0a81c0d)`
- 커밋: `01e2de6`
- 선행 R0: R0-1105-F ⓒ (M2-1105-C 머지 뒤 cleanup 안건)
