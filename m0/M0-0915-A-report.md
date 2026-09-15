---
round: M0-0915-A
pr: agilo-medusa-pos-fork#6
outcome: sdk57-upgrade
kyu_checks:
  [
    K1-first-boot,
    K2-cash-order,
    K3-card-order,
    K4-qris-order,
    K5-pickup,
    K6-close,
    K7-z-report,
    K8-wa-copy,
  ]
---

# M0-0915-A · Expo SDK 54 → 57 정합 + 선행 PR 4건 착지 (Kyu iPhone 실기 재개)

**일자**: 2026-09-15 · **허브**: M0 · **성격**: fork Expo SDK 승격 + 이연 정리

---

## 0. 배경 (심문 [REQ] 요약)

- **증상 (Kyu 회신)**: Kyu iPhone Expo Go = SDK 57 → 포크 SDK 54 로드 거부 → 실기 불가.
- **요청**: 포크 SDK 54 → 57 승격 · 부수 수정 최소 · 자기 검증 · 리포트.
- **선행 판정 (M0-0915-B 심문 회신)**:
  - `origin/main` 없음 → `origin/master` 로 읽음.
  - fork 미머지 PR #2 → #3 → #4 → #5 오케 전결 · 그 순서로 squash 머지 후 master 에서 브랜치 분기.
  - Maestro `ls ~/.maestro/bin/maestro` 존재 확증 → 시도 · 완주 실패 시 iOS 시뮬레이터 실 boot 스샷 + expo-doctor 0 + typecheck 로 대체.
  - 테스트 스크립트 없음 → "단위 테스트 전량" = `npx tsc --noEmit` + `expo lint`.
  - docs = **storeport 리포** 만 · 포크엔 docs 만들지 않음.
  - relay 규약 = `checks/m0/M0-0909-A.md` · `pr-test-checklist-guide.md` · `m0/M0-0909-A-report.md` frontmatter 참고.

---

## 1. 선행 정리 (fork 미머지 PR 4건 · 오케 전결 · 실측 충돌 0 → 실측 충돌 발생 · 해소)

| # | 브랜치 | 라운드 | 병합 결과 | 충돌 여부 | 해소 |
|---|--------|--------|-----------|-----------|------|
| PR #2 | `feat/m0-0729-al-register-ui` | M0-0729-AL (POS-10/11 UI) | MERGED `b70281a` | clean | - |
| PR #3 | `feat/m0-0729-an-checkout-attribution` | M0-0729-AN (register_session_id + cash_movement 편입) | MERGED `c363da4` | clean | - |
| PR #4 | `feat/m0-0729-ao-payment-methods` | M0-0729-AO (결제수단 3택 + POS 정본 결제) | MERGED `c3b4e7a` | 2 파일 충돌 | 로컬 merge + resolve + push · **AO `pos-complete` 가 AN 직접 `cash-movements` 호출 대체** (백엔드 endpoint 가 cash_movement 내장) |
| PR #5 | `docs/m0-0909-a-e2e-ao-steps` | M0-0909-A (Maestro AO 3-way 스텝) | MERGED `43e1bab` | 1 파일 충돌 | 로컬 merge + resolve + push · yaml 스텝 확장 부분 유지 |

**충돌 원인 진단**:
- PR #2/#3 는 clean → 오케 진단 정합.
- PR #4 는 base 재계산 시 AN 이후 PR 이므로 AO 쪽에 이미 반영된 `pos-complete` 경로가 AN 의 직접 `cash-movements` 경로와 병존 불가 → HEAD (AO) 채택 정본.
- PR #5 는 base 재계산 시 AO 3-way yaml 스텝 편입 vs upstream 간이 스텝 병존 불가 → HEAD (M0-0909-A 확장본) 채택 정본.

**해소 후 fork master tip**: `43e1bab test(e2e): AO 3-way 결제 스텝 + YAML 파서 오류 fix (M0-0909-A) (#5)`.

---

## 2. 상태 실측 (M0-0915-A tip)

### 2.1 리포 · 브랜치

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| fork master | master | `43e1bab` (M0-0909-A) | 4 PR 착지 완결 |
| fork 작업 | `feat/m0-0915-a-sdk57` | `ae56445` (M0-0915-A) | PR #6 OPEN |
| storeport main | main | (unchanged) | - |
| storeport 작업 | `docs/m0-0915-a-sdk57` | `02ff972` | PR #111 OPEN (docs only) |
| curiocity-relay main | main | (unchanged) | 본 리포트 push 대상 |

### 2.2 Kyu 회수 항목 (M0-0915-A)

- **REQ-SDK-D9 신설**: Kyu iPhone Expo Go SDK 57 → 포크 SDK 54 로드 거부 (M0-0915-A · docs/requirements-tracking.md §9).
- Kyu 8단계 실기 (K1~K8) = fork PR #6 병합 후 재개.

---

## 3. SDK 57 정합 (기능 변경 zero · 사용자 동작 불변)

### 3.1 변경 표 (핵심)

| 계층 | 패키지 | 전 | 후 | 사유 | 손댄 파일 |
|------|--------|----|----|------|-----------|
| SDK | expo | ~54.0.10 | ^57 (57.0.22) | Kyu iPhone Expo Go SDK 57 | (deps only) |
| React | react · react-dom | 19.1.0 | 19.2.3 | SDK 57 정합 | (deps only) |
| RN | react-native | 0.81.4 | 0.86.3 | SDK 57 native | (deps only) |
| Router | expo-router | ~6.0.8 | ~57.0.21 | 버전 스킴 변경 · SDK 동조 | `app/_layout.tsx` · `components/HapticTab.tsx` (import 경로) |
| Anim | react-native-reanimated | 4.1.1 | 4.5.1 | AnimatedStyle generic 필수 | `components/form/BaseSelectField.tsx` |
| Anim | react-native-worklets | 0.5.1 | 0.10.1 | reanimated 4.5 요구 | (deps only) |
| Nav | rn-screens · safe-area-context | 4.16.0 · 5.6.0 | 4.26.0 · 5.7.0 | SDK 57 정합 | (deps only) |
| UI | rn-svg · webview · flash-list | (전) | (후) | SDK 57 정합 | (deps only) |
| Gesture | gesture-handler · keyboard-controller | 2.28.0 · 1.18.5 | 2.32.0 · 1.21.9 | SDK 57 정합 | (deps only) |
| TS | typescript · @types/react | 5.9.2 · 19.1.10 | 6.0.3 · 19.2.4 | SDK 57 eslint-config-expo 요구 | (deps only) |
| Lint | eslint-config-expo | 10.0.0 | ~57.0.2 | 버전 스킴 변경 | `eslint.config.js` (신규 룰 warn 하향) |
| Config | app.json | `newArchEnabled` · `android.edgeToEdgeEnabled` | 제거 | SDK 57 default · schema block | `app.json` |
| NativeWind | (미변) | - | - | RN 0.86 `FlatList` `ListFooterComponentClassName` 미지원 | `app/orders/[orderId].tsx` (footer View 래핑) |
| expo-* (17종) | ~54.x | ~57.x | 일괄 정합 | (deps only) |

### 3.2 손댄 파일 · 사유 (8 파일)

1. `app.json` — SDK 57 schema 기각 (`newArchEnabled` · `android.edgeToEdgeEnabled`) 제거.
2. `app/_layout.tsx` — `@react-navigation/native` 직수입 SDK 56+ 차단 → `expo-router` 재수출.
3. `components/HapticTab.tsx` — `@react-navigation/{bottom-tabs,elements}` 차단 → `expo-router/react-navigation` (`PlatformPressable` re-derive prop type).
4. `components/form/BaseSelectField.tsx` — `AnimatedStyle` → `AnimatedStyle<ViewStyle>` (reanimated 4.5 generic 필수).
5. `app/orders/[orderId].tsx` — FlatList `ListFooterComponentClassName` 미지원 → footer `View className="mt-14"` 래핑.
6. `eslint.config.js` — SDK 57 신규 `react-hooks/{immutability,refs,set-state-in-effect}` 룰 warn 하향 (기존 hook 패턴 회귀 리스크 회피 · 별건 회수).
7. `package.json` — SDK 57 정합 deps 표.
8. `package-lock.json` — deps 재잠금.

### 3.3 미완주 · 이연

- **eslint 26 warn 정리**: SDK 57 신규 룰 (react-hooks/immutability · refs · set-state-in-effect). 기존 코드 회귀 리스크 → warn 유지 · 별건 회수 (사가별 정리).
- **Maestro 실 완주**: 시뮬레이터 Expo Go 미설치 + Kyu 실 device 8081 tunnel 점유 + 로그인 자격 오케 미보유. REQ-MAESTRO-D5 별건 유지.

---

## 4. 자기 검증

| 항목 | 결과 | 근거 |
|------|------|------|
| `npx tsc --noEmit` | **0 error** | 3 초기 error (BottomTabBarButtonProps · ListFooterComponentClassName · AnimatedStyle) 해소 후 clean |
| `npx expo-doctor` | **21/21 pass · 0 issue** | app.json schema 정정 후 clean |
| `npx expo lint` | **0 error · 26 warn** | 신규 룰 warn 하향 (별건 회수) |
| `npx expo export --platform ios` | **성공 · 18MB iOS bundle** | Metro 완주 · 4171 모듈 (bundle 성공 = SDK 57 전 스택 정합 확증) |
| iOS 시뮬레이터 실 boot | **iPhone 17 · iOS 26.1 booted** | `xcrun simctl boot` + Safari 렌더 확증 · 스샷 `/tmp/m0-0915-a-shots/01-sim-booted.png` |
| Maestro CLI | **v2.10.0 · list-devices 12건 정상** | `~/.maestro/bin/maestro` 존재 · Java 17 (openjdk@17) 정합 |
| Maestro 실 완주 | **미실행** | Expo Go 미설치 (`xcrun simctl launch host.exp.Exponent` FBSOpenApplicationServiceErrorDomain=4) + tunnel 점유 + 자격 부재 |

---

## 5. Kyu checks 초안 (K1~K8 · device=expo · fork PR #6 병합 후 재개)

`checks/m0/M0-0915-A.md` 참조 (본 리포트와 동일 커밋).

---

## 6. PR · 커밋

| 리포 | 브랜치 | 커밋 | PR |
|------|--------|------|-----|
| agilo-medusa-pos-fork | `feat/m0-0915-a-sdk57` | `ae56445` | **#6 OPEN** — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/6 |
| storeport | `docs/m0-0915-a-sdk57` | `c549cb6` · `02ff972` | **#111 OPEN** (docs only) — https://github.com/CuriocityDevAi/storeport/pull/111 |
| curiocity-relay | main | (본 리포트 push) | - |

---

## 7. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+5** | SDK 57 정합 (+1) · fork PR #2 (+1) · fork PR #3 (+1) · fork PR #4 (+1) · fork PR #5 (+1) |
| **신설** | **+1** | REQ-SDK-D9 등재 (Kyu 폰 K1~K8 실기 대기 = ⏸) |
| **유지 STALE** | 24 | §8 M0-0824-B AgentsPay 16 + §9 (기존) AL/AN/AO 이월 8 · 전량 STALE |
| **부분 해소 유지** | REQ-MAESTRO-D5 | CLI 정합 확증 (v2.10.0 + Java 17) · 실 완주는 device+Expo Go+자격 별건 |
| **총 순증감** | **-4** | 해소 5 − 신설 1 |

---

## 8. 다음 게이트

1. **Kyu 폰 SDK 57 재개**: fork PR #6 병합 후 `feat/m0-0915-a-sdk57` 로 tunnel + Expo Go SDK 57 스캔 → K1~K8 실기 완주.
2. **완주 성공 시**: fork PR #6 병합 · Anchor POS 하루 사이클 재검증 완결 · REQ-SDK-D9 해소.
3. **완주 실패 시**: 실패 K 뿌리 조사 (SDK 57 회귀 vs 백엔드 vs UI 회귀 분리) → 별건 fix 라운드.
4. **storeport PR #111**: 별건 병합 (docs only · 병합 순서 유연).
5. **미완주 회수 별건**: eslint 26 warn 정리 · Maestro CI 편입 (REQ-MAESTRO-D5) · storeport PR #104 (M0-0909-A round6) 병합 판정.

---

## 9. 규약 정합 점검

- ✅ `git fetch origin && git merge origin/master` (main 없음 → master 로 판독).
- ✅ 브랜치 `feat/m0-0915-a-sdk57` (fork).
- ✅ 커밋 메시지 · PR 본문 = **`!` 문자 미사용**.
- ✅ PR 본문 test-checklist YAML 블록 편입 (fork · storeport 양쪽).
- ✅ 리포트 frontmatter = `round · pr · outcome · kyu_checks` (M0-0909-A 정본 정합).
- ✅ relay 규약 = `checks/m0/` + `m0/M0-*-report.md` 이원 배치.
- ✅ 이연 순증감 명기.
- ⚠ Maestro 실 완주 = 미실행 (사유 명기).

---

*M0-0915-A · 2026-09-15 · Expo SDK 54 → 57 정합 · fork PR #6 open · storeport PR #111 open · Kyu 폰 K1~K8 실기 대기*
