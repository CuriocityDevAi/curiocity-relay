fork #217 Classic SPP O · 라이브러리 react-native-bluetooth-classic@1.73.0-rc.17 · BLE 회귀 X · tests 44/44 · APK https://expo.dev/accounts/curiocity/projects/meros-pos/builds/e5af2c3d-3281-4548-bddb-c0e9dc565618

## 수행 요약
- fork `CuriocityDevAi/agilo-medusa-pos-fork` 브랜치 `feat/M0-1120-C-classic-spp` → PR #217 (base master).
- 라이브러리: `react-native-bluetooth-classic@1.73.0-rc.17` (RN >=0.73.1, 프로젝트 RN 0.88.1 호환 · autolink). Expo config plugin 미제공이지만 기존 `android.permissions` (BLUETOOTH · _ADMIN · _CONNECT) 로 충분하여 app.json/plugin 수정 없음.
- 전송 추상화: `lib/printer/transport.ts` 신규 (TransportKind 저장 · 미지정 시 'ble' 호환) + `lib/printer/classic.ts` 신규 (Android 전용 · getBondedDevices · writeToDevice base64 · 8s/5s 타임아웃 재사용) + `lib/printer/index.ts` `dispatchPrintBytes` 분기.
- UI: `app/settings/printer.tsx` 에 Android 전용 "Classic (paired)" 섹션 · 설정 페어링 안내 (PIN 0000/1234) + "Open Android Bluetooth settings" 링크 · BLE 스캔은 기존대로.
- iOS 무변경 (classicAvailability 가 reason='ios' 로 즉시 차단).
- 결제 성공 자동 인쇄 (`app/checkout/success/[orderId].tsx` 의 `printReceipt`) 도 dispatch 경유 → Classic 투명 통과.

## 범위 밖
- `components/cd-preview/**`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx` 미수정 (M3 #215 범위 보호).
- `app/(tabs)/settings.tsx` 미수정 (PrinterRow 컴포넌트만 손봄 · tab 레이아웃은 그대로).
- `app.json` `android.permissions` 변경 없음.

## 테스트
- `vitest run tests/flows/m3-1118-j-printer.test.ts tests/flows/m0-1120-c-classic.test.ts` → **44 pass / 0 fail** (기존 20 + 신규 24).
- 전체 vitest run: 신규 regression 0. `__tests__/m1-1117-e-slip-flow.test.ts` 2 fail 은 pre-existing (master 에서도 재현 · 본 PR 범위 밖).
- typecheck 신규 error 0 (master baseline 27 → 27 동일).

## Kyu 실기 (OPPO · PR 본문에도 체크리스트)
- ① Android 설정 → 블루투스에서 BT-58D 페어링 (PIN 0000/1234)
- ② 앱 Settings → Printer 에서 "Classic (paired in Android Settings)" 섹션에 BT-58D 표시 (Classic 뱃지)
- ③ BT-58D 선택 → Paired printer 라벨 `… · CLASSIC` → Test print
- ④ 결제 성공 (cash/qris) 자동 인쇄 1 매

**기계 판정 가능**: 소스 계약 24 어설션 (dispatch 분기, Android 전용 가드, API 호출 식별자, 저장 키 분리, UI 섹션 존재, PIN 안내 문구).
**실기 필요 (미검증)**: 실 Android 기기 + BT-58D 전원 ON + 페어링 상태에서의 인쇄. 본 PR 은 코드 경로만 완결 · 실기 검증은 Kyu APK 설치 후.

## 참고
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/217
- EAS build: https://expo.dev/accounts/curiocity/projects/meros-pos/builds/e5af2c3d-3281-4548-bddb-c0e9dc565618
- commit: 3043146

## 후속 (제안 · 범위 밖)
- app 내 Classic discovery (startDiscovery) — 필요 시 별도 라운드 (지금은 bonded 목록만으로 충분 · 설정 페어링 유도가 UX 단순).
- react-native-bluetooth-classic 전용 Expo config plugin 작성 (지금은 없이도 동작하므로 불필요).
