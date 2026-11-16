PR #309 · 포트 8082

## 변경 내용
- `apps/customer-display/scripts/dev-refresh.sh` — `npx expo start --dev-client` 양 경로에 `--port "${CD_PORT:-8082}"` 추가
- 스크립트 끝에 `echo "아이패드 손님 화면 앱에서 :${CD_PORT:-8082} 서버를 고르세요"` 추가
- `apps/customer-display/package.json` start 스크립트 → `expo start --port ${CD_PORT:-8082}`

## 검증 로그
```
=== bash -n 결과 ===
OK: 문법 이상 없음

=== --dry-run 출력 시뮬레이션 ===
--- 패키지 변경 없음, pnpm install 건너뜀 ---
아이패드 손님 화면 앱에서 :8082 서버를 고르세요
--- dry-run: Metro 시작 건너뜀 ---

=== CD_PORT=9000 오버라이드 테스트 ===
아이패드 손님 화면 앱에서 :9000 서버를 고르세요
Metro 명령: npx expo start --dev-client --port 9000
```
