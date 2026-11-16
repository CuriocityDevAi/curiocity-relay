PR #153 · 권장안 B(TestFlight+OTA, 개발 중 A) · Kyu 질문 3개

## 수행 내용

`docs/plans/customer-display-native-app-plan.md` 신규 작성.

### 대사표 주요 발견

| 항목 | customer-display 현재 | 네이티브 전환 필요 작업 |
|------|----------------------|----------------------|
| `bundleIdentifier` | ✅ 이미 있음 (`id.storeport.customerdisplay`) | 없음 |
| `orientation: "landscape"` | ✅ 이미 있음 | 없음 |
| `localStorage` 의존성 | ✅ 없음 (순수 UI) | 없음 |
| `expo-updates` | ❌ 없음 | 추가 필요 |
| `expo-keep-awake` | ❌ 없음 | 추가 후 `activateKeepAwake()` |
| `eas.json` | ❌ 없음 | 신규 작성 |
| `experiments.baseUrl` | `/customer-display-web` (웹 전용) | 네이티브 빌드 시 비활성화 분기 |
| `dev-refresh.sh` | ❌ 없음 | POS 복사본 작성 |

dev-refresh.sh: `git pull` + `npm install`(변경분) + `expo start --dev-client` 순서로 Metro 시작.

### 선택지 요약

- **A) dev client**: MacBook Metro 상시 연결 필요 → 개발 단계 전용
- **B) TestFlight + OTA** ★ 권장: `eas update`로 JS 변경 OTA, 매장 독립 운영 가능
- **C) 웹+홈 화면**: keep-awake 불가, 가이드 액세스 불안정

### 라운드 분할

- R0: `eas.json` + `expo-updates/dev-client/keep-awake` 패키지 + `app.config.ts` baseUrl 분기 (`apps/customer-display/`)
- R1: `activateKeepAwake()` layout 적용 (`apps/customer-display/src/`)
- R2: `dev-refresh.sh` 복제 (`apps/customer-display/scripts/`)

### Kyu 질문

1. TestFlight(B안) + 개발 중 dev client(A안) 2단계 방식으로 진행할까요?
2. `expo.dev`의 `curiocity` 계정으로 EAS 로그인이 돼 있나요? (`eas login` 필요 여부)
3. customer-display iPad가 몇 대인가요? (UDID 등록 수량 파악)

PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/153
