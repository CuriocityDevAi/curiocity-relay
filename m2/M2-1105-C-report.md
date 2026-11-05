---
round: M2-1105-C
pr:
  fork: agilo-medusa-pos-fork#26 (stacked on #25 via local rebase onto master)
commit: b8c351304881c6633e3e76f32e4a6ba98a92ad3d
outcome: 프린터 iPad 실기 준비 3건 · Settings Printer 행 · ble-plx 자체 플러그인 · secure-storage 래퍼 등재 · 머지 가능
kyu_checks: 4 (BT-58D 전원 → Settings → Printer → Connect → Test print → 주문 후 자동 영수증)
---

# M2-1105-C · Printer settings · deprecated BLE plugin 교체 · secure-storage 등재

**일자**: 2026-11-05 · **허브**: M2 · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `fix/m1-1105-b-web-secure-store` (#25) + 로컬 rebase onto `master`

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | `lib/printer/ble.ts` expo-secure-store → `@/lib/secure-storage` | ✓ import 1 줄 치환 · 네이티브 동작 동일 · 웹 localStorage 폴백 |
| 2 | deprecated `@config-plugins/react-native-ble-plx` → 현행 권장 | ✓ `react-native-ble-plx` 자체 app.plugin.js (3.5.1+) 로 교체 · `bluetoothPeripheralPermission` 옵션 제거 (iOS 13+ 공식 deprecated) |
| 3 | Settings "Printer" 행 추가 | ✓ `components/printer/PrinterRow.tsx` 신규 + settings.tsx 1 줄 삽입 |
| 4 | 색 토큰만 | ✓ M3-1105-A 시맨틱 토큰 (surface/ink/ink-subtle/line/accent) · raw palette 0 |
| 5 | 영어 문구 | ✓ "Printer" · "Paired · X" · "Not paired" · "Test print" · "Connect a BT-58D..." |
| 6 | 상시 ⓐ 하네스 · Settings 도달 + Printer 행 렌더 | ✓ 8/8 PASS (아래) |

## 2. 변경 파일

| 파일 | 변경 | 라인 |
|------|------|------|
| `app.json` | plugins 배열 1 항목 교체 | 3 |
| `lib/printer/ble.ts` | import 1 줄 (주석 2) | 4 |
| `components/printer/PrinterRow.tsx` | 신규 | 102 |
| `app/(tabs)/settings.tsx` | PrinterRow 1 줄 삽입 + import | 2 |
| `scripts/m2-1105-c-settings-playwright.mjs` | 신규 하네스 | 195 |

**M1/M3 영역 미수정** — `app/(tabs)/settings.tsx` 는 M1/M3 어느 쪽에도 owner 아님 (설정 탭은 공용). PrinterRow 는 self-contained — 기존 sections 로직 미변경.

## 3. 네이티브 빌드 영향 (deprecated plugin 교체)

- **동일**: Android 는 `BLUETOOTH` · `BLUETOOTH_ADMIN` · `BLUETOOTH_CONNECT` 권한 자동 주입. iOS 는 `NSBluetoothAlwaysUsageDescription` 자동 주입.
- **차이**: `bluetoothPeripheralPermission` 옵션 제거 — iOS 13+ 에서 이미 사용되지 않음 · 이전 plugin 이 이 옵션을 받으면 빌드 경고 출력. 결과물 generated prebuild 는 범위상 동일.
- **dead dep**: `@config-plugins/react-native-ble-plx` 는 package.json 에 남음 (owner 밖) · 사용처 0 · cleanup 라운드로 분리.

## 4. 자동 검증

### 4-A. Playwright 8/8 PASS

```
--- (ⓐ) Expo web 부팅 + 로그인 플로 ---
  ✓ (1) 로그인 후 /login 이탈

--- (2) /settings 탭 이동 → Printer 행 렌더 ---
  pre-nav url : /products
  post-nav url: /settings
  body: ... | Printer | Not paired | Test print | Bluetooth unavailable on this build. Pair on the iPad dev build. | ...
  ✓ (2) settingsPrinterRow 렌더

--- (3) 섹션 헤더 "Printer" 노출 ---
  ✓ (3) "Printer" 섹션 헤더 노출

--- (4) "Not paired" 상태 (초기 · SecureStore localStorage 폴백) ---
  ✓ (4) "Not paired" 레이블 노출

--- (5) "Test print" 버튼 disabled ---
  ✓ (5a) Test print 버튼 존재
  ✓ (5b) Test print 버튼 disabled (printerId 없음)

--- (6) 에러 집계 ---
  ✓ (6a) pageerror (신규) 0건
  ✓ (6b) console.error (신규) 0건

8/8 passed · 0 failed
```

M1-1105-B 의 full auth-mock 하네스 패턴 재사용 + /settings 탭 이동 + Printer row 어설션 추가. 웹에서 BLE 모듈 부재이므로 PrinterRow 는 "Bluetooth unavailable on this build" 하단 안내로 fail-open.

### 4-B. clean-clone `npm ci --legacy-peer-deps` · exit 0

### 4-C. tsc · expo lint (M2 owner files) · error 0

## 5. 스택 관계

- **base**: `fix/m1-1105-b-web-secure-store` (PR #25 OPEN)
- 로컬에서 `git rebase origin/master` 로 **M3-1105-A (#22) 색 토큰 합류**.
- PR GitHub 상 base = `master` 로 설정 (GitHub 가 cherry-pick-matching 으로 #25 변경을 중복 커밋 없이 수용).
- 머지 순서 제안: #24 (M2-1105-B) → #25 (M1-1105-B) → **이 PR**. 각 PR 독립적 · GitHub base 자동 재조정.

## 6. Kyu 실기 체크 4 건 (PR body 에 전체 절차)

- [ ] **페어링**: BT-58D 전원 ON → Meros POS → Settings → Printer → Scan → 터치 → "Paired"
- [ ] **Test print**: Test print 버튼 → 영수증 1 매 (MEROS · Test Print · TEST OK · 컷)
- [ ] **주문 완료 자동 영수증**: Cash 결제 → 다이얼로그 + 영수증 1 매 (end-to-end · M2-1104-D)
- [ ] **프린터 OFF 시 fail-open**: 결제 흐름 안 깨짐 · 다이얼로그 정상

세부: PR #26 본문 "Kyu 실기 절차 (처음 하는 사람 기준)" 섹션 (14 단계 · 트러블슈팅 포함).

## 7. 후속 라운드 후보

- `@config-plugins/react-native-ble-plx` 미사용 dep 제거 (package.json 1 줄 · cleanup)
- Printer 한글 코드페이지 (ESC t)
- QR / 바코드 ESC/POS
- Sentry breadcrumb · BLE 실패 context 수집
- 복수 프린터 지원

## 8. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/26
- 브랜치: `feat/m2-1105-c-printer-settings` · 커밋 `b8c3513`
