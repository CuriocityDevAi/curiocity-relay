✅ PR #264 — customer-display-server-contract.md §6 손님 iPad 인증 + §5 S1c 라운드 추가
https://github.com/CuriocityDevAi/storeport/pull/264

## 작업 내용

### §5 라운드 표 — S1c 추가
- S1a 의존 표기에 `✅ #262 머지됨` 명시
- S1c 행 신설: 손님 iPad 페어링·기기 토큰 (45분 · 의존: S1a #262)
  - 건드릴 파일: `sessions/[code]/pair/route.ts` 수정 · `register_session` 모델(device_token_hash) · `middlewares.ts` · Admin 연결 상태 UI
  - S1b 건드릴 파일과 겹침 없음 확인

### §6 손님 iPad 인증 (신설)
- §6-1: 기술 결정 — Admin JWT 미사용, 6자리 코드(10분) → 기기 토큰(32bytes hex · DB 해시만 · 1:1 폐기)
- §6-2: 기기 토큰 권한 표 — 허용(귀속 계산대 스냅샷 폴링·PATCH·link-phone) / 거부(타 계산대·Admin API)
- §6-3: 경로 설계 — `/customer-display/*` 접두사 분리 · `X-Device-Token` 헤더 · 401/403 오류 코드 표 · rate limit(5회 실패 → 코드 폐기)
- §6-4: Admin/MEROS UI — 연결 뱃지(polled_at 30초 기준) + "연결 끊기" 버튼
