원인 expo-secure-store ~14.0.1 + app.config 플러그인 (cf3a2dd4 11-18) · 빌드 f2b5c6b8-9fce-4b5d-adf1-48eb94e8210d · IN_PROGRESS · 새 아이콘 O · native-diff PR #398

---

## [REQ-1] 원인 확정 — OTA로 안 되는 이유

### 11-17 빌드(1e1bd3ec) 이후 추가된 네이티브 의존

| 커밋 | 날짜 | 변경 | 종류 |
|------|------|------|------|
| cf3a2dd4 | 11-18 10:41 | `expo-secure-store ~14.0.1` (package.json) | **네이티브 — 재빌드** |
| cf3a2dd4 | 11-18 10:41 | `"expo-secure-store"` Expo Plugin (app.config.ts) | **네이티브 — 재빌드** |
| 7db62960 | 11-18 16:23 | `qrcode 1.5.4` (package.json) | 순수 JS — OTA 가능 |

### app.config.ts 네이티브 설정 변경

- `plugins` 배열에 `"expo-secure-store"` 추가 (cf3a2dd4)
- `android.adaptiveIcon` 추가 (Android 전용, iOS 무관)
- 아이콘: `icon.png` → 367d02ac (11-17 15:51) M2-1117-AA에서 "아이콘 B(갈색 바탕 M + CUSTOMER 텍스트)"로 교체 → **새 아이콘 O**

### OTA 안 되는 이유 (3줄)

1. `expo-secure-store ~14.0.1`은 iOS Keychain/SecureEnclave를 사용하는 **Swift 네이티브 모듈**로, 앱 바이너리(.ipa)에 `.framework`로 링크돼야 하며 JS 번들에 포함되지 않는다.
2. OTA(expo-updates)는 **JS 번들만 교체** — 앱 바이너리의 네이티브 `.framework`, Podfile, Info.plist 엔타이틀먼트는 건드리지 않는다.
3. `app.config.ts`의 `"expo-secure-store"` 플러그인은 EAS **prebuild** 단계에서 `ios/` 디렉토리를 수정하므로, 새 `.ipa` 생성(EAS 클라우드 빌드) 없이는 적용 불가 → `requireNativeModule('ExpoSecureStore')` = undefined.

---

## [REQ-2] native-diff.sh — PR #398

PR: https://github.com/CuriocityDevAi/storeport/pull/398

스크립트 위치: `apps/customer-display/scripts/native-diff.sh`

```bash
# 사용법
./scripts/native-diff.sh 1e1bd3ec
# 📦 네이티브 패키지 변경 (빌드 커밋 → HEAD):
#   [-] "expo-secure-store":"~14.0.1"  ← 추가됨
# 🔌 app.config.ts 플러그인 변경:
#   [+] expo-secure-store
# ⚠️  네이티브 변경 있음 → 재빌드 필요
```

- Exit 0 = OTA 가능 / Exit 1 = 재빌드 필요

---

## [REQ-3] EAS 빌드

- **빌드 ID**: `f2b5c6b8-9fce-4b5d-adf1-48eb94e8210d`
- **상태**: IN_PROGRESS (빌드 제출 완료 · EAS 클라우드 처리 중)
- **EAS 로그**: https://expo.dev/accounts/curiocity/projects/customer-display/builds/f2b5c6b8-9fce-4b5d-adf1-48eb94e8210d
- **프로필**: development (developmentClient=true · internal distribution)
- **등록 기기**: iPad UDID 00008132-000859511178801C (기존 Ad Hoc 프로비저닝 프로파일에 포함 확인)
- **설치 URL**: 빌드 완료 후 위 EAS 로그 URL을 iPad Safari에서 열면 "Install" 버튼 표시

### 새 아이콘 확인

`app.config.ts` → `icon: "./assets/icon.png"` · `ios.icon: "./assets/icon.png"`  
`icon.png`는 M2-1117-AA (11-17 15:51, 367d02ac)에서 갈색 바탕(#3B2A1F) + 각진 M + "CUSTOMER" 텍스트 아이콘 B로 교체됨 → **이번 빌드에 새 아이콘 포함 O**

---

## [REQ-4] Kyu 안내 재료

### 옛 앱 삭제 필요 여부
**삭제 불필요** — 같은 Bundle Identifier(`id.storeport.customerdisplay`) · Ad Hoc 내부 배포이므로 기존 앱 위에 덮어쓰기 설치 가능. 단, 설치 오류 시 한 번 삭제 후 재설치.

### 설치 후 "개발자 모드/신뢰" 단계
iOS 16+ iPad:
1. Settings → General → VPN & Device Management
2. "YOUNGKYU LEE (Individual)" 탭 → **Trust** 탭
3. 확인 후 앱 실행

(iOS 개발자 모드 활성화는 이미 돼 있으면 생략 가능)

### 첫 실행에 Metro(8083) 선택
앱 실행 → "Enter URL Manually" 선택 → `http://<Mac-IP>:8083` 입력  
또는 앱이 이미 열려 있을 경우: 3손가락 꾹 → 개발자 메뉴 → "Change Bundle Location" → `http://<Mac-IP>:8083`

> `CD_PORT=8083 pnpm start` (apps/customer-display에서) 로 Metro 실행 필요
