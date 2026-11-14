# M1-1105-BX 완료 리포트

docs/runbooks/sentry-app.md 미완 단계 완성 — EAS Secret 주입 2가지 방법·production DSN 검증 절차·소스맵 현황·역할 구분표 추가. PR #137 (draft).

## Kyu 손작업 필요 단계

1. Sentry `pos-app` 프로젝트 생성 (owner/admin 권한 · MCP 403)
2. Sentry 대시보드 → `pos-app` Settings → Client Keys (DSN) 에서 DSN 복사
3. `eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value 'https://<DSN>'`
4. `eas secret:list` 로 등록 확인
5. `EXPO_PUBLIC_SENTRY_DSN='...' EXPO_PUBLIC_SENTRY_TEST=1 npx expo start --web` 로 테스트 에러 발생
6. Sentry Issues 에서 `M2-1104-A · sentry-app smoke test` 이슈 수신 확인

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/137
