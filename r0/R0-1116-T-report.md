#308 C · #309 A

## #309 — M1-1116-O 개발 서버 8082 (APPROVE)

**ci-summary** markers-and-forbidden ✅ · check ✅ · customer-display ✅ · unit-commerce-core ✅ · e2e-admin-loyalty ✅ · pos-integration 🔄 (IN_PROGRESS, not blocking)

### 체크리스트
- `--port "${CD_PORT:-8082}"` 두 Metro 경로 모두 적용 (캐시 초기화 `--clear` 경로 포함) ✅
- echo 안내가 Metro 시작 **전** 출력 ✅
  - pnpm install 체크 직후, dry-run 분기 · Metro 명령 앞에 위치
  - `npx expo start`는 종료되지 않으므로 뒤에 두면 안 보이는 블로커 회피 확인
- `package.json` `${CD_PORT:-8082}` POSIX sh 기본값 치환 문법 → pnpm/npm `sh -c` 환경에서 그대로 확장됨 ✅
- 인라인 `#` 주석 없음 ✅

---

## #308 — M2-1116-P 손님 화면 앱 아이콘·스플래시 (CHANGES_REQUESTED)

**ci-summary** pos-integration ✅ · customer-display ❌ (TypeScript CI 실패)

### 체크리스트
- 아이콘 1024×1024 RGB (PR 설명 기준) ✅
- 웹 favicon/baseUrl 영향 0 — `web.favicon` 미변경, baseUrl 로직 미변경 ✅
- `name: "Display"` 영향
  - HTML `<title>`: 영향 없음 (Expo Router 페이지 메타데이터 제어)
  - PWA manifest `name`: "Customer Display" → "Display" 변경 (홈 화면 추가 시 표시명) — Kyu 결정 대기 중으로 PR에 이미 명시

### 🔴 BLOCKER — TypeScript CI 실패

```
app.config.ts(24,3): error TS2353: Object literal may only specify known properties,
and 'splash' does not exist in type 'ExpoConfig'.
```

- **원인**: Expo SDK ~58 `expo/config`의 `ExpoConfig` 타입에 top-level `splash` 프로퍼티 없음
- **SDK 58 방식**: `expo-splash-screen` 플러그인만 사용 (이미 PR에 추가됨)
- **수정**: `app.config.ts`에서 top-level `splash: { ... }` 블록 제거 → 플러그인 설정만으로 동일 동작 유지
