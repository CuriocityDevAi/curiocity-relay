# M2-1105-Y 완료 리포트

**날짜**: 2026-11-10  
**브랜치**: `chore/m2-1105-y-eas-dev-build`  
**PR**: [#71](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/71)

---

## 선택지 · 채택 · 이유

| 항목 | 선택지 | 채택 | 이유 |
|------|-------|------|------|
| expo-dev-client 버전 | `^58.0.18` (SDK 58 latest) vs 미설치 | 설치 (`^58.0.18`) | SDK 58 호환 · BLE 실기 테스트에 dev-client 필수 · Expo Go 영향 없음 (BLE dynamic require로 graceful fail) |
| eas.json 수정 여부 | 신규 작성 vs 기존 유지 | 기존 유지 | M2-1104-C 에서 이미 development/preview/production 3개 프로필 완성됨 (`developmentClient: true` · `internal` · `m-medium`) |
| runbook 접근 | 기존 파일 수정 vs 신규 | 기존 `docs/runbooks/eas-dev-build.md` 전면 개정 | 처음 하는 사람 기준 ①~⑥ 단계 + 예상 화면 추가 · M2-1104-C 버전은 단계 세분화 미흡 |

---

## Kyu 확인 1줄 (bundle id)

> `ios.bundleIdentifier` = **`id.meros.pos`** (기존 M2-1104-C 설정값 그대로). 변경 필요 시 머지 전 알려주세요.

---

## 작업 내용 요약

### REQ 1 — eas.json / app.json 확인
- `eas.json`: development(`developmentClient: true` · `distribution: internal` · `ios.simulator: false` · `resourceClass: m-medium` · `channel: development`) / preview / production 모두 완성 상태 확인 ✅
- `app.json`: `ios.bundleIdentifier: id.meros.pos` · name: Meros POS · icon: `./assets/images/icon.png` 확인 ✅

### REQ 2 — expo-dev-client 판단 · BLE 분기 확인
- **expo-dev-client `^58.0.18` 추가**: SDK 58 호환 · Expo Go 는 계속 사용 가능 (`expo-dev-client` 는 dev-client 앱에서만 활성화)
- **BLE 프린터 분기**: `lib/printer/ble.ts` — `loadBleModule()` 에서 dynamic `require('react-native-ble-plx')` + try/catch 로 Expo Go / web 에서 graceful fail (`reason: 'module-missing'`) → 명시적 분기 없이도 dev-client 에서만 실기 BLE 가능

### REQ 3 — 사전 검증
- `npx expo-doctor`: 19/20 PASS (기존 `@sentry/react-native` minor mismatch 1건 · 본 PR 범위 외 · 빌드 차단 아님)
- `npx expo prebuild --no-install --platform ios`: PASS · 산출물 미커밋 (.gitignore `ios/` 적용 확인 ✅)

### REQ 4 — docs/runbooks/eas-dev-build.md
- 처음 하는 사람 기준 6단계 완성:
  ① EAS CLI 로그인 · 예상 터미널 화면
  ② `eas device:create` → iPad Safari URL → 프로필 설치 → UDID 확인
  ③ `eas build --profile development --platform ios` · 출력 흐름
  ④ iPad 설치 URL → Trust 절차
  ⑤ 매일 사용 — `npx expo start --dev-client` · QR 불필요 · Wi-Fi 자동 연결
  ⑥ 막힐 때 체크 3가지 (No Apple Team / UDID not provisioned / Metro 연결 실패)

### REQ 5 — run-all / bundle-guard
- `node scripts/run-all.mjs assertions` → **21/21 PASS** ✅
- `m2-1105-q-bundle-guard.mjs` → **PASS** ✅

---

## PR 번호

**#71** — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/71
