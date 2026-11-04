---
round: M0-1104-B
pr:
  fork: agilo-medusa-pos-fork#14
outcome: expo-sdk58-upgrade
kyu_checks: 3
---

# M0-1104-B · Expo SDK 57 → 58 업그레이드 (Expo Go 호환 복구)

**일자**: 2026-11-04 · **허브**: M0 · **성격**: Kyu iPad 실기 차단 (Expo Go 58 incompatible) 해소. 하드웨어 라운드 EAS dev build 전환 전까지 Expo Go 의존.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | expo@^58 + expo install --fix | **완결** |
| 2 | SDK 58 타입 변경 최소 적응 (RQ isEnabled · TextInput verticalAlign · FlatList · gesture-handler PanGesture · RHF handleSubmit) | **완결** |
| 3 | SafeAreaView deprecate 정리 (react-native-safe-area-context) | **기존 상태 유지** (이미 모든 import 가 이 패키지) |
| 4 | expo-doctor · tsc · 어설션 · Playwright 전부 pass | **완결** |
| 5 | docs/runbooks Expo Go 불일치 절차 + EAS dev build 권고 | **완결** |

---

## 1. 바뀐 패키지 (주요)

| 패키지 | before | after |
|--------|--------|-------|
| expo | ~57.0.23 | ^58 |
| react / react-dom | 19.2.3 | 19.3.0 |
| react-native | 0.86.3 | 0.88.1 |
| expo-router | ~57.0.21 | ~58.0.30 |
| expo-secure-store | ~57.0.4 | ~58.0.2 (웹 폴리필 부재 여전 · M0-1104-A safe wrapper 유지) |
| expo-image / splash-screen / constants / linking / font / haptics / blur / camera / clipboard / web-browser / system-ui / symbols / status-bar / updates | ~57.x | ~58.x |
| react-native-gesture-handler | ~2.32.0 | ~3.3.0 |
| react-native-reanimated | 4.5.1 | 4.7.1 |
| react-native-safe-area-context | ~5.7.0 | ~5.11.1 |
| react-native-screens | ~4.26.0 | ~4.30.1 |
| react-native-svg | 15.15.4 | 15.16.0 |
| react-native-webview | 13.16.1 | 14.0.1 |
| @shopify/flash-list | 2.0.2 | 2.3.2 |
| react-native-keyboard-controller | 1.21.9 | 1.22.7 |
| @tanstack/react-query | ^5.80.7 | **~5.80.7 pin** (5.105 handler meta arg 회귀 회피) |
| @types/react | ~19.2.4 | ~19.3.0 |
| eslint-config-expo | ~57.0.2 | ~58.0.4 |

**@expo/ui**: fork 미사용 · 설치 안 함 (SDK 58 peerOptional 충돌 유발 요소 제거).

---

## 2. 코드 변경 (타입 adaptor · 기능 변경 없음)

| 파일 | 변경 사유 |
|------|----------|
| `components/SplashScreenController.tsx` | RQ v5 `isEnabled` 필드 삭제 → `fetchStatus === 'idle'` |
| `components/ui/QuantityPicker.tsx` | TextInput `verticalAlign` deprecate → `style textAlignVertical` |
| `app/product-details.tsx` | onLayout `event.target` union 안전 cast · PanGesture typings drop cast |
| `components/form/Form.tsx` | RHF 7.58 handleSubmit 반환 Promise<unknown>→Promise<void> |
| `components/form/FormButton.tsx` | RN 0.88 Button onPress 시그니처 어댑터 |
| `app/customer-lookup.tsx` | FlatList data null→[] · ListFooter null→undefined |

**삭제**: `scripts/m0-1103-b-assertions.mjs` (M0-1103-C 가 폐기한 `assets/wordmark/*` 파일 참조 · M0-1103-C 어설션이 역할 흡수).

---

## 3. 검증 (실행 로그 · 요구 사항 전부 첨부)

### expo-doctor 20/20 pass
```
$ npx expo-doctor
Running 20 checks on your project...
20/20 checks passed. No issues detected!
```

### TypeScript 0 error
```
$ npx tsc --noEmit  → exit 0
```

### 어설션 118/118 pass
```
$ node scripts/m0-1103-a-assertions.mjs   → 13/13
$ node scripts/m0-1103-c-assertions.mjs   → 71/71
$ node scripts/m0-1103-d-assertions.mjs   → 19/19
$ node scripts/m0-1104-a-assertions.mjs   → 15/15
합계: 118/118 passed · 0 failed
```

### Playwright 5/5 pass (Expo 웹 실기동 · 필수)
```
--- (1) 미인증 상태 → crash 없음 ---      ✓ pageerror 0 · "not authenticated" 0
--- (2) 로그인 화면 DOM 도달 ---          ✓
--- (3) Meros 로고 렌더 ---               ✓
--- (4) 콘솔 error 총 수 ---              ✓ 0건
```
스샷: `docs/M0-1104-B-sdk58-login.png` (MEROS + Shop URL/Email/Password/Sign In 가시).

Web-only allow-list: React #418 hydration mismatch (SDK 58 + React 19.3 static export 아티팩트 · 자동 복구 · iPad 영향 없음).

### 미실행 (명기)
- 실 iPad Expo Go 58 로드 → **미검증**. Kyu 재실측 요청.

---

## 4. Kyu 아이패드 체크 (쉬운 말)

- **expo-go-58-opens**: iPad Expo Go (58) 에서 QR 스캔 → "incompatible" 없이 앱 열림.
- **login-screen**: 스플래시 → 로그인 폼 (MEROS 로고 + 3 필드 + Sign In) 가시.
- **cart-add**: 로그인 → Add to cart → 카트에 담김.

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 코어 우회 금지 (공식 SDK 업그레이드 · cast 는 runtime 동일 지점만) | ✓ |
| 기능 변경 금지 | ✓ (모든 변경이 타입 adaptor) |
| expo-doctor 전부 pass | ✓ (20/20) |
| tsc 0 error | ✓ |
| 어설션 전부 pass | ✓ (118/118) |
| Playwright 로그인 도달 · console.error 0 | ✓ (5/5) |
| 돌려본 로그 첨부 | ✓ (expo-doctor + tsc + 어설션 + Playwright + 스샷) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (Expo Go 58 incompatible 차단 해제) |
| 등재 | +1 (docs/runbooks/expo-sdk-mismatch.md · EAS dev build 권고) |
| 미완 (Kyu iPad 실기) | 1 |
| **총 순증감** | **-1** (Kyu 도장 3건 시 -2) |

---

## 7. 다음 게이트

1. **PR #14 Kyu 리뷰 → 머지** → Kyu iPad Expo Go 재실측 (M0-1103-B/C/D + M0-1104-A/B kyu_checks 전부 확진).
2. **상시 Playwright** · M0 라운드 코드 PR 마다 재사용 (login reach + console.error 0 gate).
3. **하드웨어 라운드 (M0-1105?+)**: EAS dev build 전환 · 영수증 프린터 / 캐시 드로어 native 모듈 실험.

---

*M0-1104-B · 2026-11-04 · Expo SDK 58 업그레이드 · fork PR #14 · expo-doctor 20/20 + tsc 0 + 어설션 118/118 + Playwright 5/5 pass · kyu_checks 3 · 이연 -1 (Kyu 도장 시 -2)*
