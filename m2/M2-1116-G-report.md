PR #295 · 페어링 ✅ · Live 폴링 ✅ · link-phone ✅ · 설정 반영 ✅ · 로컬 검증 ✅

## 구현 요약

### REQ1 — 페어링 화면
- `app/pair.tsx`: 6자리 코드 입력 (큰 숫자 패드) → `POST /customer-display/pair` → `localStorage.setItem("cd_device_token", ...)` → hard-reload
- `src/lib/pairing.ts`: `getDeviceToken / saveDeviceToken / clearDeviceToken / pairDevice`
- 401·토큰 만료: `PairingRequiredError` → `invalidatePairing()` → `/pair` 리다이렉트 (자동)
- 숨은 연결 해제: MainScreen 오른쪽 위 구석 60×60 투명 영역, 5초 `onPressIn` 타이머 (디자인 무변경)

### REQ2 — LiveSnapshotSource
- `src/mocks/snapshot-source.ts`: `LiveSnapshotSource.getSnapshot()` 구현 (`GET /customer-display/snapshots/active`, `X-Device-Token`)
- 204 → `null` (주문 없음), 401 → `PairingRequiredError`, 기타 오류 → `Error` (POLL_ERROR 카운터 증가)
- `?mock=1` 없는 접속 = live 모드, `?state=` mock 모드는 `?mock=1` 일 때만 (e2e 모두 반영)

### REQ3 — link-phone
- `app/index.tsx` `handleKeypadOk`: `POST /customer-display/snapshots/:id/link-phone` 호출
  - 200 → `phone_masked` 반환값을 `linkedPhone` state에 저장
  - 409 already_linked → `snapshot.loyalty.phone_masked` (또는 `customer_phone`) 폴백
  - 401 → `invalidatePairing()`
- ConsentScreen에 `maskedPhone` 전달 — 첫 방문 동의 흐름 기존 그대로

### REQ4 — 설정 실시간 반영
- `src/hooks/useLiveDisplayConfig.ts` (PR #290), `src/lib/display-config-source.ts` (PR #290) 사용
- `LiveDisplayConfigSource` bootstrap 연결: `GET /customer-display/display-config` + `X-Device-Token`
- `config_version` 변화 감지 → 재로드, `inPayment=true`(main 외 화면)이면 결제 완료 후 적용
- 적용 범위: `theme_key` → `setThemeKey`, `active_event_key` → `setEventKey`, `timers` → `DisplayConfig`

### REQ5 — 테스트 / 빌드
- `src/lib/__tests__/live-connect.test.ts`: LiveSnapshotSource 200/204/401/503, link-phone 200/409, 상태 전환 3케이스
- 전체 vitest: **123개 통과** (push-hook CI 검증)
- `pnpm build:web`: `/pair` 포함 11개 정적 라우트, base path `/customer-display-web` 유지
- `tsc --noEmit`: 오류 없음

### REQ6 — 코드 발급 경로
현재 POS Admin UI에 코드 발급 화면 미구현. 아이패드 실기 절차:
1. `POST /admin/pos/customer-display/pair-code` (관리자 JWT 인증) → 6자리 코드 반환
2. 아이패드에서 `/customer-display-web/` 접속 → 코드 입력 → 연결

## 브랜치 / PR

- 브랜치: `m2/M2-1116-G-live-connect` (base: `m0/M0-1116-C-settings-draft-apply` #290)
- PR: https://github.com/CuriocityDevAi/storeport/pull/295
