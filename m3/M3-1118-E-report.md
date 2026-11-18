PR #376 · SecureStore O · 재시작 후 자동 연결 e2e X(수동 확인 필요) · 재빌드 필요 O

## M3-1118-E — cd pairing persist

- PR: https://github.com/CuriocityDevAi/storeport/pull/376
- 브랜치: fix/M3-1118-E-cd-pairing-persist

### 구현 내용
- pairing.ts: Platform.OS 분기 — native=expo-secure-store, web=localStorage
  - saveDeviceTokenAsync / getDeviceTokenAsync / clearDeviceTokenAsync
  - migrateTokenIfNeeded: localStorage → SecureStore 1회 마이그레이션
  - bootCheck: GET /customer-display/me 토큰 검증 (200→ok, 401→invalid, 오프라인→ok)
- _layout.tsx: getDeviceToken(sync) → bootCheck(async) 교체
- pair.tsx: saveDeviceToken → saveDeviceTokenAsync
- MainScreen.tsx: Re-pair 버튼 + Alert 확인 대화상자
- app.config.ts: expo-secure-store 플러그인 추가
- package.json: expo-secure-store ~14.0.1 추가

### 테스트
- unit: 166 tests passed (11 신규 pairing-persist 테스트)
- typecheck: 0 errors
- e2e: 미실행 (EAS 재빌드 후 수동 확인 필요)

### EAS 재빌드 필요
expo-secure-store 네이티브 모듈 추가로 dev-client 재빌드 필요:
  eas build --profile development --platform ios
