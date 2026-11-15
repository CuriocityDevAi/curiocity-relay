PR #142 · base sha cfe0baf · 변경 파일 수 2 · vitest 3/3 pass (use-network-status.test.ts)

## grep 결과
```
hooks/use-network-status.ts:6: const _NetInfo: any = NativeModules.RNCNetInfo ? require('@react-native-community/netinfo').default : null;
__tests__/use-network-status.test.ts:7: vi.mock('@react-native-community/netinfo', () => ({ (테스트 목 — 소스 1곳만)
```

## PR 머지 상태
```json
{"mergeStateStatus":"UNSTABLE","mergeable":"MERGEABLE"}
```
(MERGEABLE: dirty 없음 · UNSTABLE: CI 진행 중)

## 수정 내용
- `hooks/use-network-status.ts`: static `import NetInfo` 제거 → `NativeModules.RNCNetInfo` 가드 후 lazy `require()` · 없으면 always-online + warn 1회 · throw 없음
- `__tests__/use-network-status.test.ts`: RNCNetInfo undefined에서 모듈 임포트 안전 · `useNetworkStatus()` always-online 반환 · `onlineManager.setEventListener` 미호출 검증 (3건 pass)

## #141 처리
`gh pr close 141 -c "M3-1105-CO 로 대체(오래된 브랜치)"` → 완료

## 확인(실기)
기존 dev client 아이패드: `NativeModules.RNCNetInfo == null` 환경에서 앱 열림, 빨간 에러 없음 (always-online 모드 동작), warn 1회만 출력.
